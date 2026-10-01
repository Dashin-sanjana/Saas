import { DAYS, SchedulableTask, SchedulerCategory, SchedulerDay, SchedulerGoal, SchedulerInput, SchedulerPriority } from "./scheduler.types";

const priorityScore: Record<SchedulerPriority, number> = { CRITICAL: 400, HIGH: 300, MEDIUM: 200, LOW: 100 };

export function expandRequirements(input: SchedulerInput): SchedulableTask[] {
  const tasks: SchedulableTask[] = [];
  for (const goal of input.goals.filter((item) => item.active)) {
    const frequencyDays: Array<SchedulerDay | null> = goal.frequency === "DAILY" ? [...DAYS] : goal.frequency === "WEEKDAYS" ? DAYS.slice(0, 5) : goal.frequency === "WEEKENDS" ? DAYS.slice(5) : [null];
    const allowed = goal.allowedDays?.length ? goal.allowedDays : [...DAYS];
    for (const day of frequencyDays) {
      if (day && !allowed.includes(day)) continue;
      const isWeekend = day === "SATURDAY" || day === "SUNDAY";
      const minutes = day ? (isWeekend ? goal.weekendDurationMinutes : goal.weekdayDurationMinutes) ?? goal.durationMinutes : goal.durationMinutes;
      const candidateDays = day ? [day] : allowed;
      tasks.push(toGoalTask(goal, day, minutes, candidateDays));
    }
  }

  const subjects = new Map(input.subjects.filter((subject) => subject.active).map((subject) => [subject.id, subject]));
  for (const event of input.events.filter((item) => item.category === "LECTURE" && item.subjectId)) {
    const subject = event.subjectId ? subjects.get(event.subjectId) : undefined;
    if (!subject) continue;
    const overflow = ["SATURDAY", "SUNDAY", ...DAYS.filter((day) => day !== event.dayOfWeek && day !== "SATURDAY" && day !== "SUNDAY")] as SchedulerDay[];
    tasks.push({
      id: `revision:${event.id}`,
      sourceId: subject.id,
      sourceType: "SUBJECT",
      title: `${subject.name} revision`,
      category: "LECTURE",
      minutes: subject.revisionMinutes,
      priority: 250,
      candidateDays: [event.dayOfWeek, ...overflow.filter((day) => day !== event.dayOfWeek)],
      preferredDays: [event.dayOfWeek],
      preferredDay: event.dayOfWeek,
      allowSplit: false,
      minimumBlockMinutes: subject.revisionMinutes,
      maximumBlockMinutes: subject.revisionMinutes
    });
  }
  return tasks.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id));
}

function toGoalTask(goal: SchedulerGoal, day: SchedulerDay | null, minutes: number, candidateDays: SchedulerDay[]): SchedulableTask {
  return {
    id: `goal:${goal.id}:${day ?? "WEEK"}`,
    sourceId: goal.id,
    sourceType: "GOAL",
    title: goal.title,
    category: goalCategory(goal.type),
    minutes,
    priority: priorityScore[goal.priority],
    candidateDays,
    preferredDays: goal.preferredDays ?? [],
    preferredStartTime: goal.preferredStartTime,
    preferredEndTime: goal.preferredEndTime,
    earliestStartTime: goal.earliestStartTime,
    latestEndTime: goal.latestEndTime,
    allowSplit: goal.allowSplit ?? true,
    minimumBlockMinutes: goal.minimumBlockMinutes ?? 30,
    maximumBlockMinutes: goal.maximumBlockMinutes
  };
}

function goalCategory(type: string): SchedulerCategory {
  if (type === "BUSINESS") return "BUSINESS";
  if (type === "WORK") return "WORK";
  if (type === "FITNESS") return "GYM";
  if (type === "PERSONAL") return "PERSONAL";
  return "OTHER";
}
