import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DayOfWeek, EventCategory, EventExceptionType } from "@prisma/client";
import { expandEventOccurrences, EventDefinition } from "./event-expansion";

function event(overrides: Partial<EventDefinition> = {}): EventDefinition {
  return { id: "event-1", title: "Lecture", category: EventCategory.LECTURE, dayOfWeek: DayOfWeek.WEDNESDAY, eventDate: null, startTime: "08:30", endTime: "10:30", subjectId: null, recurring: true, exceptions: [], ...overrides };
}

describe("event occurrence expansion", () => {
  it("cancels a recurring occurrence without duplicating the series", () => {
    const items = expandEventOccurrences([event({ exceptions: [{ id: "x", date: new Date("2026-09-30T00:00:00Z"), type: EventExceptionType.CANCELLED, replacementStartTime: null, replacementEndTime: null, replacementTitle: null }] })], "2026-09-28");
    assert.equal(items.length, 0);
  });

  it("overrides one recurring occurrence", () => {
    const items = expandEventOccurrences([event({ exceptions: [{ id: "x", date: new Date("2026-09-30T00:00:00Z"), type: EventExceptionType.OVERRIDDEN, replacementStartTime: "09:30", replacementEndTime: "11:30", replacementTitle: "Late lecture" }] })], "2026-09-28");
    assert.equal(items[0].title, "Late lecture");
    assert.equal(items[0].startTime, "09:30");
  });

  it("includes a one-time event only in its target week", () => {
    const definition = event({ recurring: false, eventDate: new Date("2026-10-18T00:00:00Z"), dayOfWeek: DayOfWeek.SUNDAY });
    assert.equal(expandEventOccurrences([definition], "2026-10-12").length, 1);
    assert.equal(expandEventOccurrences([definition], "2026-10-19").length, 0);
  });
});
