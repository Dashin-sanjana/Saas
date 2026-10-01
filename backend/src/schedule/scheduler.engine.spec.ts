import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SchedulerEngine } from "./scheduler.engine";
import { SchedulerInput } from "./scheduler.types";
import { intervalsOverlap, timeToMinutes } from "./scheduler.utils";

const engine = new SchedulerEngine();

function input(overrides: Partial<SchedulerInput> = {}): SchedulerInput {
  return {
    weekStart: "2026-09-28",
    preferences: { wakeTime: "07:00", sleepTime: "23:00", weekdayCutoffTime: "20:00", defaultTravelMinutes: 60, defaultRestMinutes: 30, maxScheduledMinutesPerDay: 480, minimumBreakMinutes: 15, breakAfterContinuousMinutes: 240 },
    events: [],
    subjects: [],
    goals: [],
    existingBlocks: [],
    ...overrides
  };
}

function goal(frequency: "DAILY" | "WEEKDAYS" | "WEEKENDS" | "WEEKLY", durationMinutes = 60) {
  return { id: `goal-${frequency}`, title: `${frequency} goal`, type: "WORK", frequency, durationMinutes, priority: "MEDIUM" as const, active: true };
}

describe("SchedulerEngine", () => {
  it("generates blocks without overlaps", () => {
    const result = engine.generate(input({
      events: [{ id: "event", title: "Work", category: "WORK", dayOfWeek: "MONDAY", startTime: "09:00", endTime: "12:00" }],
      goals: [goal("WEEKLY", 300)]
    }));
    const all = result.proposedBlocks.map((block) => ({ date: block.date, start: timeToMinutes(block.startTime), end: timeToMinutes(block.endTime) }));
    for (let index = 0; index < all.length; index += 1) {
      assert.equal(all.slice(0, index).some((other) => other.date === all[index].date && intervalsOverlap(other, all[index])), false);
    }
    assert.equal(result.summary.unscheduledMinutes, 0);
  });

  it("schedules daily goals once on every day", () => {
    const result = engine.generate(input({ goals: [goal("DAILY")] }));
    assert.equal(new Set(result.proposedBlocks.map((block) => block.date)).size, 7);
    assert.equal(result.summary.requiredMinutes, 420);
  });

  it("schedules weekday-only goals Monday through Friday", () => {
    const result = engine.generate(input({ goals: [goal("WEEKDAYS")] }));
    assert.equal(result.proposedBlocks.length, 5);
    assert.equal(result.proposedBlocks.some((block) => block.date >= "2026-10-03"), false);
  });

  it("schedules weekend goals only on Saturday and Sunday", () => {
    const result = engine.generate(input({ goals: [goal("WEEKENDS")] }));
    assert.deepEqual(result.proposedBlocks.map((block) => block.date), ["2026-10-03", "2026-10-04"]);
  });

  it("schedules a weekly goal once and splits only when needed", () => {
    const result = engine.generate(input({ goals: [goal("WEEKLY", 180)] }));
    assert.equal(result.summary.scheduledMinutes, 180);
    assert.equal(result.proposedBlocks.length, 1);
  });

  it("creates one revision requirement per subject-linked lecture", () => {
    const result = engine.generate(input({
      events: [{ id: "lecture-1", title: "Formal Methods", category: "LECTURE", dayOfWeek: "MONDAY", startTime: "10:00", endTime: "12:00", subjectId: "subject-1" }],
      subjects: [{ id: "subject-1", name: "Formal Methods", revisionMinutes: 60, active: true }]
    }));
    assert.equal(result.summary.allocations.filter((item) => item.sourceType === "SUBJECT").length, 1);
    assert.equal(result.proposedBlocks.filter((block) => block.sourceType === "SUBJECT").length, 1);
  });

  it("reserves travel and rest after the final lecture", () => {
    const result = engine.generate(input({ events: [
      { id: "lecture-1", title: "Lecture", category: "LECTURE", dayOfWeek: "MONDAY", startTime: "13:00", endTime: "15:00" },
      { id: "lecture-2", title: "Lecture 2", category: "LECTURE", dayOfWeek: "MONDAY", startTime: "15:00", endTime: "17:00" }
    ] }));
    const rest = result.proposedBlocks.find((block) => block.sourceType === "SYSTEM");
    assert.equal(rest?.startTime, "17:00");
    assert.equal(rest?.endTime, "18:30");
  });

  it("preserves locked blocks as unavailable time", () => {
    const result = engine.generate(input({
      goals: [goal("WEEKLY", 120)],
      existingBlocks: [{ id: "locked", title: "Keep", date: "2026-09-28", startTime: "07:00", endTime: "19:00", sourceType: "GOAL", locked: true }]
    }));
    assert.equal(result.proposedBlocks.some((block) => block.date === "2026-09-28" && block.startTime < "19:00"), false);
  });

  it("enforces the weekday cutoff", () => {
    const result = engine.generate(input({
      preferences: { wakeTime: "18:00", sleepTime: "23:00", weekdayCutoffTime: "20:00", defaultTravelMinutes: 0, defaultRestMinutes: 0 },
      goals: [goal("WEEKDAYS", 90)]
    }));
    assert.equal(result.proposedBlocks.every((block) => block.endTime <= "20:00"), true);
  });

  it("returns warnings for unschedulable minutes", () => {
    const result = engine.generate(input({
      preferences: { wakeTime: "19:00", sleepTime: "20:00", weekdayCutoffTime: "20:00", defaultTravelMinutes: 0, defaultRestMinutes: 0 },
      goals: [goal("WEEKLY", 600)]
    }));
    assert.ok(result.summary.unscheduledMinutes > 0);
    assert.equal(result.warnings.some((warning) => warning.type === "UNSCHEDULED_MINUTES"), true);
  });

  it("never creates fragments below the minimum block size", () => {
    const result = engine.generate(input({ goals: [goal("WEEKLY", 20)] }));
    assert.equal(result.proposedBlocks.length, 0);
    assert.equal(result.summary.unscheduledMinutes, 20);
  });

  it("returns structured conflicts for overlapping fixed events", () => {
    const result = engine.generate(input({ events: [
      { id: "a", title: "A", category: "WORK", dayOfWeek: "MONDAY", startTime: "09:00", endTime: "11:00" },
      { id: "b", title: "B", category: "MEETING", dayOfWeek: "MONDAY", startTime: "10:30", endTime: "12:00" }
    ] }));
    assert.deepEqual(result.conflicts[0], { type: "FIXED_EVENT_OVERLAP", day: "MONDAY", eventIds: ["a", "b"], message: "A overlaps B on Monday." });
    assert.equal(result.proposedBlocks.length, 0);
  });

  it("honors allowed days and preferred time windows", () => {
    const result = engine.generate(input({ goals: [{ ...goal("WEEKLY", 60), allowedDays: ["SATURDAY", "SUNDAY"], preferredDays: ["SUNDAY"], preferredStartTime: "17:00", preferredEndTime: "20:00" }] }));
    const block = result.proposedBlocks.find((item) => item.sourceType === "GOAL");
    assert.equal(block?.date, "2026-10-04");
    assert.equal(block?.startTime, "17:00");
  });

  it("never violates hard goal time constraints", () => {
    const result = engine.generate(input({ goals: [{ ...goal("WEEKLY", 90), earliestStartTime: "18:00", latestEndTime: "20:00" }] }));
    const block = result.proposedBlocks.find((item) => item.sourceType === "GOAL");
    assert.equal(block?.startTime, "18:00");
    assert.ok(block!.endTime <= "20:00");
  });

  it("does not split a goal when splitting is disabled", () => {
    const result = engine.generate(input({
      events: [{ id: "middle", title: "Middle", category: "WORK", dayOfWeek: "MONDAY", startTime: "09:00", endTime: "18:00" }],
      goals: [{ ...goal("WEEKLY", 300), allowedDays: ["MONDAY"], allowSplit: false }]
    }));
    assert.equal(result.summary.unscheduledMinutes, 300);
    assert.equal(result.proposedBlocks.filter((item) => item.sourceType === "GOAL").length, 0);
  });

  it("enforces maximum flexible workload per day", () => {
    const result = engine.generate(input({ preferences: { ...input().preferences, maxScheduledMinutesPerDay: 120 }, goals: [goal("DAILY", 180)] }));
    assert.equal(result.proposedBlocks.filter((item) => item.sourceType === "GOAL").every((item) => duration(item.startTime, item.endTime) <= 120), true);
    assert.ok(result.summary.unscheduledMinutes > 0);
  });

  it("inserts a deterministic break after continuous productive work", () => {
    const result = engine.generate(input({ preferences: { ...input().preferences, breakAfterContinuousMinutes: 120, minimumBreakMinutes: 15 }, goals: [goal("WEEKLY", 180)] }));
    assert.equal(result.proposedBlocks.some((item) => item.sourceType === "SYSTEM" && item.title === "Required break"), true);
  });

  it("respects full-day blocked periods", () => {
    const result = engine.generate(input({ goals: [{ ...goal("WEEKLY", 60), allowedDays: ["MONDAY"] }], blockedPeriods: [{ id: "holiday", title: "Holiday", date: "2026-09-28", fullDay: true }] }));
    assert.equal(result.summary.unscheduledMinutes, 60);
  });
});

function duration(start: string, end: string) { return timeToMinutes(end) - timeToMinutes(start); }
