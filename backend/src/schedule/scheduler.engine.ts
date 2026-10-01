import { expandRequirements } from "./scheduler.expansion";
import { scoreSlot, ScoredSlot } from "./scheduler.scoring";
import {
  AllocationSummary,
  DAYS,
  MinuteInterval,
  ProposedBlock,
  ScheduleConflict,
  ScheduleWarning,
  SchedulableTask,
  SchedulerDay,
  SchedulerInput,
  SchedulerResult
} from "./scheduler.types";
import { dateForDay, dayForDate, intervalsOverlap, mergeIntervals, minutesToTime, subtractIntervals, timeToMinutes } from "./scheduler.utils";

export class SchedulerEngine {
  generate(input: SchedulerInput): SchedulerResult {
    const tasks = expandRequirements(input);
    const conflicts = this.detectEventConflicts(input.events);
    if (conflicts.length) return this.conflictedResult(tasks, conflicts);

    const occupied = new Map<SchedulerDay, MinuteInterval[]>(DAYS.map((day) => [day, []]));
    const productiveMinutes = new Map<SchedulerDay, number>(DAYS.map((day) => [day, 0]));
    const productiveIntervals = new Map<SchedulerDay, MinuteInterval[]>(DAYS.map((day) => [day, []]));
    for (const event of input.events) occupied.get(event.dayOfWeek)?.push(this.interval(event.startTime, event.endTime));
    for (const period of input.blockedPeriods ?? []) {
      const day = dayForDate(input.weekStart, period.date);
      if (!day) continue;
      occupied.get(day)?.push(period.fullDay ? { start: 0, end: 1440 } : this.interval(period.startTime ?? "00:00", period.endTime ?? "00:00"));
    }
    for (const block of input.existingBlocks.filter((item) => item.locked || item.sourceType === "MANUAL")) {
      const day = dayForDate(input.weekStart, block.date);
      if (!day) continue;
      occupied.get(day)?.push(this.interval(block.startTime, block.endTime));
      if (block.locked && ["GOAL", "SUBJECT"].includes(block.sourceType)) {
        productiveMinutes.set(day, (productiveMinutes.get(day) ?? 0) + this.duration(block.startTime, block.endTime));
        productiveIntervals.get(day)?.push(this.interval(block.startTime, block.endTime));
      }
    }

    const proposedBlocks = this.addTravelReservations(input, occupied);
    const warnings: ScheduleWarning[] = [];
    const allocations: AllocationSummary[] = [];
    for (const task of tasks) {
      const allocation = this.allocateTask(input, task, occupied, productiveMinutes, productiveIntervals);
      proposedBlocks.push(...allocation.taskBlocks, ...allocation.breakBlocks);
      const scheduledMinutes = allocation.taskBlocks.reduce((total, block) => total + this.duration(block.startTime, block.endTime), 0);
      const unscheduledMinutes = task.minutes - scheduledMinutes;
      allocations.push({ taskId: task.id, title: task.title, sourceType: task.sourceType, requiredMinutes: task.minutes, scheduledMinutes, unscheduledMinutes });
      if (task.preferredDay && allocation.taskBlocks.length && !allocation.taskBlocks.some((block) => dayForDate(input.weekStart, block.date) === task.preferredDay)) {
        const destination = dayForDate(input.weekStart, allocation.taskBlocks[0].date);
        warnings.push({ type: "TASK_MOVED", taskId: task.id, message: `${task.title} could not fit on ${this.label(task.preferredDay)} and was moved to ${this.label(destination)}.` });
      }
      if (unscheduledMinutes > 0) warnings.push({ type: "UNSCHEDULED_MINUTES", taskId: task.id, unscheduledMinutes, message: `${unscheduledMinutes} minutes of ${task.title} could not be scheduled within its constraints.` });
    }

    const limit = input.preferences.maxScheduledMinutesPerDay ?? 480;
    for (const day of DAYS.filter((item) => (productiveMinutes.get(item) ?? 0) >= limit)) {
      warnings.push({ type: "DAILY_LIMIT", taskId: `daily-limit:${day}`, message: `${this.label(day)} reached the ${limit}-minute flexible workload limit.` });
    }
    proposedBlocks.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime) || a.proposalId.localeCompare(b.proposalId));
    return { proposedBlocks, warnings, conflicts: [], summary: this.summarize(allocations) };
  }

  private allocateTask(input: SchedulerInput, task: SchedulableTask, occupied: Map<SchedulerDay, MinuteInterval[]>, productiveMinutes: Map<SchedulerDay, number>, productiveIntervals: Map<SchedulerDay, MinuteInterval[]>) {
    const taskBlocks: ProposedBlock[] = [];
    const breakBlocks: ProposedBlock[] = [];
    if (task.minutes < task.minimumBlockMinutes) return { taskBlocks, breakBlocks };
    if (!task.allowSplit && task.maximumBlockMinutes && task.maximumBlockMinutes < task.minutes) return { taskBlocks, breakBlocks };
    let remaining = task.minutes;
    while (remaining >= task.minimumBlockMinutes) {
      const candidates = this.candidateSlots(input, task, occupied, productiveMinutes, remaining);
      const candidate = candidates[0];
      if (!candidate) break;
      const capacity = candidate.interval.end - candidate.interval.start;
      const dailyRemaining = (input.preferences.maxScheduledMinutesPerDay ?? 480) - (productiveMinutes.get(candidate.day) ?? 0);
      if (!task.allowSplit && capacity < remaining) break;
      const maxBlock = Math.min(task.maximumBlockMinutes ?? remaining, input.preferences.breakAfterContinuousMinutes ?? 120);
      let minutes = task.allowSplit ? Math.min(remaining, capacity, maxBlock, dailyRemaining) : remaining;
      if (!task.allowSplit && remaining > dailyRemaining) break;
      if (remaining - minutes > 0 && remaining - minutes < task.minimumBlockMinutes) {
        const adjusted = remaining - task.minimumBlockMinutes;
        if (adjusted < task.minimumBlockMinutes || adjusted > capacity) break;
        minutes = Math.min(adjusted, maxBlock);
      }
      if (minutes < task.minimumBlockMinutes) break;
      const block = this.reserve(input, task, candidate.day, candidate.interval.start, minutes, occupied, taskBlocks.length);
      taskBlocks.push(block);
      productiveMinutes.set(candidate.day, (productiveMinutes.get(candidate.day) ?? 0) + minutes);
      productiveIntervals.get(candidate.day)?.push({ start: candidate.interval.start, end: candidate.interval.start + minutes });
      remaining -= minutes;

      const breakAfter = input.preferences.breakAfterContinuousMinutes ?? 120;
      const breakMinutes = input.preferences.minimumBreakMinutes ?? 15;
      const breakStart = candidate.interval.start + minutes;
      const continuous = mergeIntervals(productiveIntervals.get(candidate.day) ?? []).find((interval) => interval.end === breakStart);
      if (continuous && continuous.end - continuous.start >= breakAfter && breakStart + breakMinutes <= candidate.interval.end) {
        occupied.get(candidate.day)?.push({ start: breakStart, end: breakStart + breakMinutes });
        breakBlocks.push({ proposalId: `system:break:${task.id}:${taskBlocks.length}`, title: "Required break", category: "REST", date: dateForDay(input.weekStart, candidate.day), startTime: minutesToTime(breakStart), endTime: minutesToTime(breakStart + breakMinutes), sourceType: "SYSTEM", sourceId: null, generated: true, locked: false });
      }
      if (!task.allowSplit) break;
    }
    return { taskBlocks, breakBlocks };
  }

  private candidateSlots(input: SchedulerInput, task: SchedulableTask, occupied: Map<SchedulerDay, MinuteInterval[]>, productiveMinutes: Map<SchedulerDay, number>, remaining: number): ScoredSlot[] {
    const dailyLimit = input.preferences.maxScheduledMinutesPerDay ?? 480;
    return task.candidateDays.flatMap((day) => {
      const dailyRemaining = dailyLimit - (productiveMinutes.get(day) ?? 0);
      if (dailyRemaining < task.minimumBlockMinutes) return [];
      return this.freeSlots(input, task, day, occupied).filter((slot) => slot.end - slot.start >= task.minimumBlockMinutes).flatMap((slot) => {
        const capped = { start: slot.start, end: slot.end };
        const variants = [capped];
        if (task.preferredStartTime && task.preferredEndTime) {
          const preferred = { start: Math.max(capped.start, timeToMinutes(task.preferredStartTime)), end: Math.min(capped.end, this.midnightAware(task.preferredEndTime)) };
          if (preferred.end - preferred.start >= task.minimumBlockMinutes) variants.unshift(preferred);
        }
        return variants.map((interval) => ({ day, interval, score: scoreSlot(task, day, interval, remaining, productiveMinutes.get(day) ?? 0) }));
      }).filter((slot) => slot.interval.end - slot.interval.start >= task.minimumBlockMinutes);
    }).sort((a, b) => b.score - a.score || DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.interval.start - b.interval.start);
  }

  private freeSlots(input: SchedulerInput, task: SchedulableTask, day: SchedulerDay, occupied: Map<SchedulerDay, MinuteInterval[]>): MinuteInterval[] {
    const start = Math.max(timeToMinutes(input.preferences.wakeTime), task.earliestStartTime ? timeToMinutes(task.earliestStartTime) : 0);
    const end = Math.min(this.cutoff(input, day), task.latestEndTime ? this.midnightAware(task.latestEndTime) : 1440);
    return subtractIntervals({ start, end }, occupied.get(day) ?? []);
  }

  private detectEventConflicts(events: SchedulerInput["events"]): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];
    for (const day of DAYS) {
      const dayEvents = events.filter((event) => event.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime) || a.id.localeCompare(b.id));
      for (let left = 0; left < dayEvents.length; left += 1) {
        for (let right = left + 1; right < dayEvents.length; right += 1) {
          const a = dayEvents[left];
          const b = dayEvents[right];
          if (!intervalsOverlap(this.interval(a.startTime, a.endTime), this.interval(b.startTime, b.endTime))) break;
          conflicts.push({ type: "FIXED_EVENT_OVERLAP", day, eventIds: [a.eventId ?? a.id, b.eventId ?? b.id], message: `${a.title} overlaps ${b.title} on ${this.label(day)}.` });
        }
      }
    }
    return conflicts;
  }

  private addTravelReservations(input: SchedulerInput, occupied: Map<SchedulerDay, MinuteInterval[]>): ProposedBlock[] {
    const blocks: ProposedBlock[] = [];
    const bufferMinutes = input.preferences.defaultTravelMinutes + input.preferences.defaultRestMinutes;
    if (bufferMinutes <= 0) return blocks;
    for (const day of DAYS) {
      const lectures = input.events.filter((event) => event.dayOfWeek === day && event.category === "LECTURE");
      if (!lectures.length) continue;
      const start = Math.max(...lectures.map((event) => timeToMinutes(event.endTime)));
      const end = Math.min(start + bufferMinutes, this.cutoff(input, day));
      if (end <= start) continue;
      const visibleSegments = subtractIntervals({ start, end }, occupied.get(day) ?? []);
      occupied.get(day)?.push({ start, end });
      visibleSegments.forEach((segment, index) => blocks.push({ proposalId: `system:travel:${day}:${index}`, title: "Travel and rest", category: "REST", date: dateForDay(input.weekStart, day), startTime: minutesToTime(segment.start), endTime: minutesToTime(segment.end), sourceType: "SYSTEM", sourceId: null, generated: true, locked: false }));
    }
    return blocks;
  }

  private reserve(input: SchedulerInput, task: SchedulableTask, day: SchedulerDay, start: number, minutes: number, occupied: Map<SchedulerDay, MinuteInterval[]>, part: number): ProposedBlock {
    const end = start + minutes;
    occupied.get(day)?.push({ start, end });
    return { proposalId: `${task.id}:${part}`, title: task.title, category: task.category, date: dateForDay(input.weekStart, day), startTime: minutesToTime(start), endTime: minutesToTime(end), sourceType: task.sourceType, sourceId: task.sourceId, generated: true, locked: false };
  }

  private cutoff(input: SchedulerInput, day: SchedulerDay): number {
    const sleep = this.midnightAware(input.preferences.sleepTime);
    if (day === "SATURDAY" || day === "SUNDAY" || input.preferences.weekdayCutoffTime === "00:00") return sleep;
    return Math.min(sleep, timeToMinutes(input.preferences.weekdayCutoffTime));
  }

  private conflictedResult(tasks: SchedulableTask[], conflicts: ScheduleConflict[]): SchedulerResult {
    const allocations = tasks.map((task) => ({ taskId: task.id, title: task.title, sourceType: task.sourceType, requiredMinutes: task.minutes, scheduledMinutes: 0, unscheduledMinutes: task.minutes }));
    return { proposedBlocks: [], warnings: [], conflicts, summary: this.summarize(allocations) };
  }

  private summarize(allocations: AllocationSummary[]) {
    return { requiredMinutes: allocations.reduce((total, item) => total + item.requiredMinutes, 0), scheduledMinutes: allocations.reduce((total, item) => total + item.scheduledMinutes, 0), unscheduledMinutes: allocations.reduce((total, item) => total + item.unscheduledMinutes, 0), allocations };
  }

  private interval(startTime: string, endTime: string) { return { start: timeToMinutes(startTime), end: this.midnightAware(endTime) }; }
  private duration(startTime: string, endTime: string) { return this.midnightAware(endTime) - timeToMinutes(startTime); }
  private midnightAware(value: string) { return value === "00:00" ? 1440 : timeToMinutes(value); }
  private label(day: SchedulerDay | null) { return day ? day.charAt(0) + day.slice(1).toLowerCase() : "another day"; }
}
