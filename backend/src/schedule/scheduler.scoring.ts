import { MinuteInterval, SchedulableTask, SchedulerDay } from "./scheduler.types";
import { timeToMinutes } from "./scheduler.utils";

export type ScoredSlot = { day: SchedulerDay; interval: MinuteInterval; score: number };

export function scoreSlot(task: SchedulableTask, day: SchedulerDay, interval: MinuteInterval, remaining: number, dailyMinutes: number): number {
  const preferredDay = task.preferredDays.includes(day) || task.preferredDay === day;
  const preferredStart = task.preferredStartTime ? timeToMinutes(task.preferredStartTime) : null;
  const preferredEnd = task.preferredEndTime ? timeToMinutes(task.preferredEndTime) : null;
  const preferredWindow = preferredStart !== null && preferredEnd !== null && interval.start >= preferredStart && interval.start < preferredEnd;
  const capacity = interval.end - interval.start;
  const contiguous = capacity >= remaining;
  return (preferredDay ? 1_000_000 : 0) + (preferredWindow ? 100_000 : 0) + (contiguous ? 20_000 : 0) + Math.min(capacity, remaining) * 10 - dailyMinutes - interval.start / 1440;
}
