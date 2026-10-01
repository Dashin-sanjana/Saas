import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { expandEventOccurrences } from "../events/event-expansion";
import { DAYS } from "../schedule/scheduler.types";
import { addDays, mergeIntervals, minutesToTime, subtractIntervals, timeToMinutes } from "../schedule/scheduler.utils";

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    const now = new Date();
    const preferences = await this.prisma.schedulePreference.findUnique({ where: { userId } });
    const timezone = preferences?.timezone ?? "UTC";
    const dateParts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const part = (type: Intl.DateTimeFormatPartTypes) => dateParts.find((item) => item.type === type)?.value ?? "";
    const todayDate = `${part("year")}-${part("month")}-${part("day")}`;
    const todayValue = new Date(`${todayDate}T00:00:00.000Z`);
    const mondayOffset = todayValue.getUTCDay() === 0 ? -6 : 1 - todayValue.getUTCDay();
    const weekStartText = addDays(todayDate, mondayOffset);
    const weekStart = new Date(`${weekStartText}T00:00:00.000Z`);
    const weekEnd = new Date(`${addDays(weekStartText, 7)}T00:00:00.000Z`);
    const [definitions, subjects, goals, scheduleBlocks, periods] = await Promise.all([
      this.prisma.event.findMany({ where: { userId }, include: { exceptions: true } }),
      this.prisma.subject.findMany({ where: { userId, active: true }, orderBy: { name: "asc" } }),
      this.prisma.goal.findMany({ where: { userId, active: true }, orderBy: { createdAt: "desc" } }),
      this.prisma.scheduleBlock.findMany({ where: { userId, date: { gte: weekStart, lt: weekEnd } }, orderBy: [{ date: "asc" }, { startTime: "asc" }] }),
      this.prisma.blockedPeriod.findMany({ where: { userId, date: { gte: weekStart, lt: weekEnd } } })
    ]);
    const events = expandEventOccurrences(definitions, weekStartText);
    const today = DAYS[todayValue.getUTCDay() === 0 ? 6 : todayValue.getUTCDay() - 1];
    const todaysEvents = events.filter((event) => event.date === todayDate);
    const todaysBlocks = scheduleBlocks.filter((block) => block.date.toISOString().slice(0, 10) === todayDate);
    const currentTime = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(now);
    const duration = (start: string, end: string) => (end === "00:00" ? 1440 : timeToMinutes(end)) - timeToMinutes(start);
    const todayOccupied = mergeIntervals([
      ...todaysEvents.map((item) => ({ start: timeToMinutes(item.startTime), end: item.endTime === "00:00" ? 1440 : timeToMinutes(item.endTime) })),
      ...todaysBlocks.map((item) => ({ start: timeToMinutes(item.startTime), end: item.endTime === "00:00" ? 1440 : timeToMinutes(item.endTime) })),
      ...periods.filter((item) => item.date.toISOString().slice(0, 10) === todayDate).map((item) => item.fullDay ? { start: 0, end: 1440 } : ({ start: timeToMinutes(item.startTime!), end: item.endTime === "00:00" ? 1440 : timeToMinutes(item.endTime!) }))
    ]);
    const scheduledMinutesToday = todayOccupied.reduce((total, interval) => total + interval.end - interval.start, 0);
    const sleep = preferences ? (preferences.sleepTime === "00:00" ? 1440 : timeToMinutes(preferences.sleepTime)) : 0;
    const cutoff = preferences && !["SATURDAY", "SUNDAY"].includes(today) && preferences.weekdayCutoffTime !== "00:00" ? Math.min(sleep, timeToMinutes(preferences.weekdayCutoffTime)) : sleep;
    const freeIntervals = preferences ? subtractIntervals({ start: timeToMinutes(preferences.wakeTime), end: cutoff }, todayOccupied) : [];
    const weeklyScheduledMinutes = events.reduce((total, item) => total + duration(item.startTime, item.endTime), 0) + scheduleBlocks.reduce((total, item) => total + duration(item.startTime, item.endTime), 0);
    const productive = scheduleBlocks.filter((block) => block.sourceType === "GOAL" || block.sourceType === "SUBJECT");
    const completedMinutes = productive.filter((block) => block.completed).reduce((total, item) => total + duration(item.startTime, item.endTime), 0);
    const scheduledProductiveMinutes = productive.reduce((total, item) => total + duration(item.startTime, item.endTime), 0);
    const overloadedDays = DAYS.flatMap((day, index) => {
      const date = addDays(weekStartText, index);
      const minutes = productive.filter((block) => block.date.toISOString().slice(0, 10) === date).reduce((total, item) => total + duration(item.startTime, item.endTime), 0);
      return preferences && minutes > preferences.maxScheduledMinutesPerDay ? [{ day, date, minutes, limit: preferences.maxScheduledMinutesPerDay }] : [];
    });
    const futureEvents = events.filter((event) => event.date > todayDate || (event.date === todayDate && event.startTime >= currentTime));
    const futureTasks = productive.filter((block) => block.date.toISOString().slice(0, 10) > todayDate || (block.date.toISOString().slice(0, 10) === todayDate && block.startTime >= currentTime));

    return {
      today,
      todaysEvents,
      todaysBlocks,
      upcomingEvents: futureEvents.slice(0, 6),
      activeGoals: goals,
      subjects,
      scheduleBlocks,
      unfinishedBlocks: productive.filter((block) => !block.completed && block.date.toISOString().slice(0, 10) <= todayDate),
      goalProgress: goals.map((goal) => {
        const blocks = productive.filter((block) => block.sourceType === "GOAL" && block.sourceId === goal.id);
        const scheduledMinutes = blocks.reduce((total, item) => total + duration(item.startTime, item.endTime), 0);
        const completed = blocks.filter((block) => block.completed).reduce((total, item) => total + duration(item.startTime, item.endTime), 0);
        return { goalId: goal.id, title: goal.title, scheduledMinutes, completedMinutes: completed, percentage: scheduledMinutes ? Math.round(completed / scheduledMinutes * 100) : 0 };
      }),
      overloadedDays,
      metrics: {
        scheduledMinutesToday,
        freeMinutesToday: freeIntervals.reduce((total, item) => total + item.end - item.start, 0),
        freeIntervalsToday: freeIntervals.map((item) => ({ startTime: minutesToTime(item.start), endTime: minutesToTime(item.end), minutes: item.end - item.start })),
        weeklyScheduledMinutes,
        completedMinutes,
        scheduledProductiveMinutes,
        completionPercentage: scheduledProductiveMinutes ? Math.round(completedMinutes / scheduledProductiveMinutes * 100) : 0,
        nextEvent: futureEvents[0] ?? null,
        nextGeneratedTask: futureTasks[0] ?? null,
        nextScheduledItem: [...todaysEvents, ...todaysBlocks].filter((item) => item.startTime >= currentTime).sort((a, b) => a.startTime.localeCompare(b.startTime))[0] ?? null
      }
    };
  }
}
