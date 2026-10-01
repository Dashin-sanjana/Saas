import { DAYS, MinuteInterval, SchedulerDay } from "./scheduler.types";

export function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(value: number): string {
  const normalized = Math.max(0, Math.min(1440, value));
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function dayForDate(weekStart: string, date: string): SchedulerDay | null {
  const index = DAYS.findIndex((_, dayIndex) => addDays(weekStart, dayIndex) === date.slice(0, 10));
  return index >= 0 ? DAYS[index] : null;
}

export function dateForDay(weekStart: string, day: SchedulerDay): string {
  return addDays(weekStart, DAYS.indexOf(day));
}

export function intervalsOverlap(a: MinuteInterval, b: MinuteInterval): boolean {
  return a.start < b.end && b.start < a.end;
}

export function mergeIntervals(intervals: MinuteInterval[]): MinuteInterval[] {
  const sorted = intervals.filter((interval) => interval.end > interval.start).sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: MinuteInterval[] = [];
  for (const interval of sorted) {
    const previous = merged.at(-1);
    if (previous && interval.start <= previous.end) {
      previous.end = Math.max(previous.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
}

export function subtractIntervals(base: MinuteInterval, occupied: MinuteInterval[]): MinuteInterval[] {
  let free = [{ ...base }];
  for (const block of mergeIntervals(occupied)) {
    free = free.flatMap((slot) => {
      if (!intervalsOverlap(slot, block)) return [slot];
      const pieces: MinuteInterval[] = [];
      if (block.start > slot.start) pieces.push({ start: slot.start, end: Math.min(block.start, slot.end) });
      if (block.end < slot.end) pieces.push({ start: Math.max(block.end, slot.start), end: slot.end });
      return pieces;
    });
  }
  return free.filter((slot) => slot.end > slot.start);
}
