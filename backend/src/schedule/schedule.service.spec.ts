import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NotFoundException } from "@nestjs/common";
import { ScheduleService } from "./schedule.service";
import { SchedulerEngine } from "./scheduler.engine";

describe("ScheduleService ownership", () => {
  it("does not allow one user to lock another user's block", async () => {
    const prisma = { scheduleBlock: { findFirst: async () => null } };
    const service = new ScheduleService(prisma as never, new SchedulerEngine());
    await assert.rejects(() => service.lockBlock("user-a", "block-owned-by-b", true), NotFoundException);
  });
});
