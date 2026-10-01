import { DayOfWeek, EventCategory, EventExceptionType } from "@prisma/client";
import { DAYS } from "../schedule/scheduler.types";
import { addDays } from "../schedule/scheduler.utils";

export type EventDefinition = {
  id: string;
  title: string;
  category: EventCategory;
  dayOfWeek: DayOfWeek;
  eventDate: Date | null;
  startTime: string;
  endTime: string;
  subjectId: string | null;
  recurring: boolean;
  exceptions: Array<{
    id: string;
    date: Date;
    type: EventExceptionType;
    replacementStartTime: string | null;
    replacementEndTime: string | null;
    replacementTitle: string | null;
  }>;
};

export type EventOccurrence = {
  id: string;
  eventId: string;
  title: string;
  category: EventCategory;
  dayOfWeek: DayOfWeek;
  date: string;
  startTime: string;
  endTime: string;
  subjectId: string | null;
  overridden: boolean;
};

export function expandEventOccurrences(events: EventDefinition[], weekStart: string): EventOccurrence[] {
  const weekEnd = addDays(weekStart, 7);
  const occurrences: EventOccurrence[] = [];
  for (const event of events) {
    const date = event.recurring ? addDays(weekStart, DAYS.indexOf(event.dayOfWeek)) : event.eventDate?.toISOString().slice(0, 10);
    if (!date || date < weekStart || date >= weekEnd) continue;
    const exception = event.exceptions.find((item) => item.date.toISOString().slice(0, 10) === date);
    if (exception?.type === EventExceptionType.CANCELLED) continue;
    occurrences.push({
      id: `${event.id}:${date}`,
      eventId: event.id,
      title: exception?.replacementTitle ?? event.title,
      category: event.category,
      dayOfWeek: DAYS[new Date(`${date}T00:00:00.000Z`).getUTCDay() === 0 ? 6 : new Date(`${date}T00:00:00.000Z`).getUTCDay() - 1] as DayOfWeek,
      date,
      startTime: exception?.replacementStartTime ?? event.startTime,
      endTime: exception?.replacementEndTime ?? event.endTime,
      subjectId: event.subjectId,
      overridden: exception?.type === EventExceptionType.OVERRIDDEN
    });
  }
  return occurrences.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
}
