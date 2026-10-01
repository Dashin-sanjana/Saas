import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DayOfWeek, Prisma, ScheduleSourceType, ScheduleVersionSource } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CommitScheduleDto, CreateScheduleBlockDto, UpdateScheduleBlockDto, ValidateMoveDto } from "./dto/schedule.dto";
import { SchedulerEngine } from "./scheduler.engine";
import { DAYS } from "./scheduler.types";
import { addDays, intervalsOverlap, timeToMinutes } from "./scheduler.utils";
import { expandEventOccurrences } from "../events/event-expansion";

@Injectable()
export class ScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: SchedulerEngine
  ) {}

  week(userId: string, weekStart: string) {
    const { start, end } = this.weekRange(weekStart);
    return this.prisma.scheduleBlock.findMany({
      where: { userId, date: { gte: start, lt: end } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }]
    });
  }

  async generatePreview(userId: string, weekStart: string) {
    const { start, end } = this.weekRange(weekStart);
    const [preferences, eventDefinitions, subjects, goals, existingBlocks, blockedPeriods] = await Promise.all([
      this.prisma.schedulePreference.findUnique({ where: { userId } }),
      this.prisma.event.findMany({ where: { userId }, include: { exceptions: true }, orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] }),
      this.prisma.subject.findMany({ where: { userId, active: true } }),
      this.prisma.goal.findMany({ where: { userId, active: true } }),
      this.prisma.scheduleBlock.findMany({ where: { userId, date: { gte: start, lt: end } } }),
      this.prisma.blockedPeriod.findMany({ where: { userId, date: { gte: start, lt: end } } })
    ]);
    if (!preferences) throw new BadRequestException("Schedule preferences are required before generation");

    return this.engine.generate({
      weekStart,
      preferences,
      events: expandEventOccurrences(eventDefinitions, weekStart),
      subjects,
      goals,
      existingBlocks: existingBlocks.map((block) => ({ ...block, date: block.date.toISOString().slice(0, 10) })),
      blockedPeriods: blockedPeriods.map((period) => ({ ...period, date: period.date.toISOString().slice(0, 10) }))
    });
  }

  async commit(userId: string, dto: CommitScheduleDto) {
    const { start, end } = this.weekRange(dto.weekStart);
    for (const block of dto.proposedBlocks) {
      if (block.date < dto.weekStart || block.date >= addDays(dto.weekStart, 7)) throw new BadRequestException("Every proposed block must be inside the target week");
      if (block.startTime >= block.endTime) throw new BadRequestException(`Invalid time range for ${block.title}`);
      if (block.sourceType !== ScheduleSourceType.GOAL && block.sourceType !== ScheduleSourceType.SUBJECT && block.sourceType !== ScheduleSourceType.SYSTEM) throw new BadRequestException("Only generated goal, subject, and system blocks can be committed");
    }
    await this.verifySources(userId, dto.proposedBlocks);
    const freshPreview = await this.generatePreview(userId, dto.weekStart);
    if (freshPreview.conflicts.length) throw new BadRequestException("Fixed-event conflicts must be resolved before committing a schedule");
    if (this.proposalFingerprint(dto.proposedBlocks) !== this.proposalFingerprint(freshPreview.proposedBlocks)) {
      throw new BadRequestException("Schedule inputs changed. Generate a fresh preview before accepting.");
    }

    return this.prisma.$transaction(async (tx) => {
      const [eventDefinitions, preserved, currentBlocks, versionCount] = await Promise.all([
        tx.event.findMany({ where: { userId }, include: { exceptions: true } }),
        tx.scheduleBlock.findMany({ where: { userId, date: { gte: start, lt: end }, OR: [{ locked: true }, { sourceType: ScheduleSourceType.MANUAL }] } })
        ,tx.scheduleBlock.findMany({ where: { userId, date: { gte: start, lt: end } } })
        ,tx.scheduleVersion.count({ where: { userId, weekStart: start } })
      ]);
      this.validateSubmittedBlocks(dto.proposedBlocks, expandEventOccurrences(eventDefinitions, dto.weekStart), preserved);
      if (versionCount === 0 && currentBlocks.length) await this.createVersion(tx, userId, start, currentBlocks, ScheduleVersionSource.BASELINE, "Before smart scheduling", true);
      const previous = await tx.scheduleVersion.findFirst({ where: { userId, weekStart: start, active: true }, orderBy: { createdAt: "desc" } });
      await tx.scheduleVersion.updateMany({ where: { userId, weekStart: start, active: true }, data: { active: false } });
      await tx.scheduleBlock.deleteMany({ where: { userId, date: { gte: start, lt: end }, generated: true, locked: false, sourceType: { not: ScheduleSourceType.MANUAL } } });
      if (dto.proposedBlocks.length) {
        await tx.scheduleBlock.createMany({
          data: dto.proposedBlocks.map((block) => ({
            userId,
            title: block.title,
            category: block.category,
            date: this.toDate(block.date),
            startTime: block.startTime,
            endTime: block.endTime,
            sourceType: block.sourceType,
            sourceId: block.sourceId,
            generated: true,
            locked: false
          }))
        });
      }
      const blocks = await tx.scheduleBlock.findMany({ where: { userId, date: { gte: start, lt: end } }, orderBy: [{ date: "asc" }, { startTime: "asc" }] });
      const version = await this.createVersion(tx, userId, start, blocks, ScheduleVersionSource.GENERATED, "Generated schedule", true);
      return { blocks, version, previousVersionId: previous?.id ?? null };
    });
  }

  async createBlock(userId: string, dto: CreateScheduleBlockDto) {
    await this.assertAvailable(userId, dto.date, dto.startTime, dto.endTime);
    return this.prisma.scheduleBlock.create({ data: { ...dto, date: this.toDate(dto.date), userId, sourceType: ScheduleSourceType.MANUAL, generated: false } });
  }

  async updateBlock(userId: string, id: string, dto: UpdateScheduleBlockDto) {
    const current = await this.getOwnedBlock(userId, id);
    const date = dto.date ?? current.date.toISOString().slice(0, 10);
    const startTime = dto.startTime ?? current.startTime;
    const endTime = dto.endTime ?? current.endTime;
    const moving = date !== current.date.toISOString().slice(0, 10) || startTime !== current.startTime || endTime !== current.endTime;
    if (moving) await this.validateMove(userId, { blockId: id, newDate: date, newStartTime: startTime, newEndTime: endTime });
    return this.prisma.scheduleBlock.update({ where: { id }, data: { ...dto, date: dto.date ? this.toDate(dto.date) : undefined } });
  }

  async deleteBlock(userId: string, id: string) {
    await this.getOwnedBlock(userId, id);
    await this.prisma.scheduleBlock.delete({ where: { id } });
    return { success: true };
  }

  async lockBlock(userId: string, id: string, locked: boolean) {
    await this.getOwnedBlock(userId, id);
    return this.prisma.scheduleBlock.update({ where: { id }, data: { locked } });
  }

  async completeBlock(userId: string, id: string, completed: boolean) {
    await this.getOwnedBlock(userId, id);
    return this.prisma.scheduleBlock.update({ where: { id }, data: { completed } });
  }

  async validateMove(userId: string, dto: ValidateMoveDto) {
    const block = await this.getOwnedBlock(userId, dto.blockId);
    if (block.locked) throw new BadRequestException("Locked blocks cannot be moved");
    if (dto.newStartTime >= dto.newEndTime) throw new BadRequestException("Block end time must be after its start time");
    const weekStart = this.mondayFor(dto.newDate);
    const { start, end } = this.weekRange(weekStart);
    const [preferences, definitions, periods, blocks, goal] = await Promise.all([
      this.prisma.schedulePreference.findUnique({ where: { userId } }),
      this.prisma.event.findMany({ where: { userId }, include: { exceptions: true } }),
      this.prisma.blockedPeriod.findMany({ where: { userId, date: this.toDate(dto.newDate) } }),
      this.prisma.scheduleBlock.findMany({ where: { userId, date: { gte: start, lt: end }, id: { not: dto.blockId } } }),
      block.sourceType === ScheduleSourceType.GOAL && block.sourceId ? this.prisma.goal.findFirst({ where: { id: block.sourceId, userId } }) : null
    ]);
    if (!preferences) throw new BadRequestException("Schedule preferences are required");
    const day = this.dayOfWeek(dto.newDate);
    const wake = timeToMinutes(preferences.wakeTime);
    const sleep = preferences.sleepTime === "00:00" ? 1440 : timeToMinutes(preferences.sleepTime);
    const cutoff = day === DayOfWeek.SATURDAY || day === DayOfWeek.SUNDAY || preferences.weekdayCutoffTime === "00:00" ? sleep : Math.min(sleep, timeToMinutes(preferences.weekdayCutoffTime));
    if (timeToMinutes(dto.newStartTime) < wake || timeToMinutes(dto.newEndTime) > cutoff) throw new BadRequestException("Move is outside waking hours or the daily cutoff");
    if (periods.some((period) => period.fullDay || intervalsOverlap(this.interval(dto.newStartTime, dto.newEndTime), this.interval(period.startTime!, period.endTime!)))) throw new BadRequestException("Move overlaps a blocked period");
    const occurrences = expandEventOccurrences(definitions, weekStart).filter((event) => event.date === dto.newDate);
    const collision = [...occurrences, ...blocks.filter((item) => item.date.toISOString().slice(0, 10) === dto.newDate)].find((item) => intervalsOverlap(this.interval(dto.newStartTime, dto.newEndTime), this.interval(item.startTime, item.endTime)));
    if (collision) throw new BadRequestException(`Move overlaps ${collision.title}`);
    if (goal) {
      if (goal.allowedDays.length && !goal.allowedDays.includes(day)) throw new BadRequestException("This day is outside the goal's allowed days");
      if (goal.earliestStartTime && dto.newStartTime < goal.earliestStartTime) throw new BadRequestException("Move starts before the goal's earliest allowed time");
      if (goal.latestEndTime && dto.newEndTime > goal.latestEndTime) throw new BadRequestException("Move ends after the goal's latest allowed time");
    }
    return { valid: true as const };
  }

  async versions(userId: string, weekStart: string) {
    const { start } = this.weekRange(weekStart);
    return this.prisma.scheduleVersion.findMany({ where: { userId, weekStart: start }, select: { id: true, weekStart: true, label: true, source: true, active: true, createdAt: true, _count: { select: { blocks: true } } }, orderBy: { createdAt: "desc" } });
  }

  async version(userId: string, id: string) {
    const version = await this.prisma.scheduleVersion.findFirst({ where: { id, userId }, include: { blocks: { orderBy: [{ date: "asc" }, { startTime: "asc" }] } } });
    if (!version) throw new NotFoundException("Schedule version not found");
    const active = await this.prisma.scheduleVersion.findFirst({ where: { userId, weekStart: version.weekStart, active: true }, include: { blocks: true } });
    const identity = (block: { title: string; sourceType: ScheduleSourceType; sourceId: string | null }) => `${block.sourceType}:${block.sourceId ?? block.title}`;
    const exact = (block: { title: string; sourceType: ScheduleSourceType; sourceId: string | null; date: Date; startTime: string; endTime: string }) => `${identity(block)}:${block.date.toISOString().slice(0, 10)}:${block.startTime}:${block.endTime}`;
    const unmatchedTarget = [...version.blocks];
    const added = (active?.blocks ?? []).filter((block) => {
      const index = unmatchedTarget.findIndex((candidate) => exact(candidate) === exact(block));
      if (index < 0) return true;
      unmatchedTarget.splice(index, 1);
      return false;
    });
    const changed: Array<{ before: (typeof version.blocks)[number]; after: (typeof added)[number] }> = [];
    for (let index = unmatchedTarget.length - 1; index >= 0; index -= 1) {
      const addedIndex = added.findIndex((block) => identity(block) === identity(unmatchedTarget[index]));
      if (addedIndex >= 0) changed.push({ before: unmatchedTarget.splice(index, 1)[0], after: added.splice(addedIndex, 1)[0] });
    }
    return {
      ...version,
      comparison: {
        activeVersionId: active?.id ?? null,
        added,
        removed: unmatchedTarget,
        changed
      }
    };
  }

  async restoreVersion(userId: string, id: string) {
    const target = await this.version(userId, id);
    const weekStart = target.weekStart.toISOString().slice(0, 10);
    const { start, end } = this.weekRange(weekStart);
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.scheduleVersion.findFirst({ where: { userId, weekStart: start, active: true } });
      if (previous?.id === target.id) throw new BadRequestException("This schedule version is already active");
      await tx.scheduleVersion.updateMany({ where: { userId, weekStart: start, active: true }, data: { active: false } });
      await tx.scheduleBlock.deleteMany({ where: { userId, date: { gte: start, lt: end } } });
      if (target.blocks.length) await tx.scheduleBlock.createMany({ data: target.blocks.map((block) => ({ userId, title: block.title, category: block.category, date: block.date, startTime: block.startTime, endTime: block.endTime, sourceType: block.sourceType, sourceId: block.sourceId, generated: block.generated, locked: block.locked, completed: block.completed })) });
      const blocks = await tx.scheduleBlock.findMany({ where: { userId, date: { gte: start, lt: end } }, orderBy: [{ date: "asc" }, { startTime: "asc" }] });
      const version = await this.createVersion(tx, userId, start, blocks, ScheduleVersionSource.RESTORED, `Restored ${target.label ?? "schedule"}`, true);
      return { blocks, version, previousVersionId: previous?.id ?? null };
    });
  }

  private async getOwnedBlock(userId: string, id: string) {
    const block = await this.prisma.scheduleBlock.findFirst({ where: { id, userId } });
    if (!block) throw new NotFoundException("Schedule block not found");
    return block;
  }

  private async assertAvailable(userId: string, date: string, startTime: string, endTime: string, excludeId?: string) {
    if (startTime >= endTime) throw new BadRequestException("Block end time must be after its start time");
    const [definitions, blocks, periods] = await Promise.all([
      this.prisma.event.findMany({ where: { userId }, include: { exceptions: true } }),
      this.prisma.scheduleBlock.findMany({ where: { userId, date: this.toDate(date), id: excludeId ? { not: excludeId } : undefined } }),
      this.prisma.blockedPeriod.findMany({ where: { userId, date: this.toDate(date) } })
    ]);
    const events = expandEventOccurrences(definitions, this.mondayFor(date)).filter((event) => event.date === date);
    const candidate = this.interval(startTime, endTime);
    if (periods.some((period) => period.fullDay || intervalsOverlap(candidate, this.interval(period.startTime!, period.endTime!)))) throw new BadRequestException("Schedule block overlaps a blocked period");
    const collision = [...events, ...blocks].find((item) => intervalsOverlap(candidate, this.interval(item.startTime, item.endTime)));
    if (collision) throw new BadRequestException(`Schedule block overlaps ${collision.title}`);
  }

  private async createVersion(tx: Prisma.TransactionClient, userId: string, weekStart: Date, blocks: Array<{ title: string; category: Prisma.ScheduleBlockCreateManyInput["category"]; date: Date; startTime: string; endTime: string; sourceType: ScheduleSourceType; sourceId: string | null; generated: boolean; locked: boolean; completed: boolean }>, source: ScheduleVersionSource, label: string, active: boolean) {
    return tx.scheduleVersion.create({ data: { userId, weekStart, source, label, active, blocks: { create: blocks.map((block) => ({ title: block.title, category: block.category, date: block.date, startTime: block.startTime, endTime: block.endTime, sourceType: block.sourceType, sourceId: block.sourceId, generated: block.generated, locked: block.locked, completed: block.completed })) } } });
  }

  private validateSubmittedBlocks(blocks: CommitScheduleDto["proposedBlocks"], events: Array<{ title: string; dayOfWeek: DayOfWeek; startTime: string; endTime: string }>, preserved: Array<{ title: string; date: Date; startTime: string; endTime: string }>) {
    for (let index = 0; index < blocks.length; index += 1) {
      const block = blocks[index];
      const interval = { start: timeToMinutes(block.startTime), end: timeToMinutes(block.endTime) };
      const day = this.dayOfWeek(block.date);
      const event = events.find((item) => item.dayOfWeek === day && intervalsOverlap(interval, { start: timeToMinutes(item.startTime), end: timeToMinutes(item.endTime) }));
      const saved = preserved.find((item) => item.date.toISOString().slice(0, 10) === block.date && intervalsOverlap(interval, { start: timeToMinutes(item.startTime), end: timeToMinutes(item.endTime) }));
      const submitted = blocks.slice(0, index).find((item) => item.date === block.date && intervalsOverlap(interval, { start: timeToMinutes(item.startTime), end: timeToMinutes(item.endTime) }));
      const collision = event ?? saved ?? submitted;
      if (collision) throw new BadRequestException(`${block.title} overlaps ${collision.title}`);
    }
  }

  private async verifySources(userId: string, blocks: CommitScheduleDto["proposedBlocks"]) {
    const goalIds = [...new Set(blocks.filter((block) => block.sourceType === ScheduleSourceType.GOAL).map((block) => block.sourceId).filter((id): id is string => Boolean(id)))];
    const subjectIds = [...new Set(blocks.filter((block) => block.sourceType === ScheduleSourceType.SUBJECT).map((block) => block.sourceId).filter((id): id is string => Boolean(id)))];
    if (blocks.some((block) => block.sourceType !== ScheduleSourceType.SYSTEM && !block.sourceId)) throw new BadRequestException("Generated task blocks require a source id");
    const [goalCount, subjectCount] = await Promise.all([
      this.prisma.goal.count({ where: { userId, id: { in: goalIds } } }),
      this.prisma.subject.count({ where: { userId, id: { in: subjectIds } } })
    ]);
    if (goalCount !== goalIds.length || subjectCount !== subjectIds.length) throw new BadRequestException("One or more proposed blocks do not belong to this user");
  }

  private weekRange(weekStart: string) {
    const start = this.toDate(weekStart);
    if (Number.isNaN(start.getTime()) || start.getUTCDay() !== 1) throw new BadRequestException("weekStart must be a valid Monday ISO date");
    return { start, end: this.toDate(addDays(weekStart, 7)) };
  }

  private proposalFingerprint(blocks: Array<{ title: string; category: string; date: string; startTime: string; endTime: string; sourceType: string; sourceId?: string | null }>) {
    return JSON.stringify(blocks.map((block) => ({
      title: block.title,
      category: block.category,
      date: block.date.slice(0, 10),
      startTime: block.startTime,
      endTime: block.endTime,
      sourceType: block.sourceType,
      sourceId: block.sourceId ?? null
    })).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime) || a.title.localeCompare(b.title) || a.sourceType.localeCompare(b.sourceType)));
  }

  private dayOfWeek(date: string): DayOfWeek {
    const value = this.toDate(date);
    const index = value.getUTCDay() === 0 ? 6 : value.getUTCDay() - 1;
    return DAYS[index] as DayOfWeek;
  }

  private mondayFor(date: string) {
    const value = this.toDate(date);
    const offset = value.getUTCDay() === 0 ? -6 : 1 - value.getUTCDay();
    return addDays(date, offset);
  }

  private interval(startTime: string, endTime: string) {
    return { start: timeToMinutes(startTime), end: endTime === "00:00" ? 1440 : timeToMinutes(endTime) };
  }

  private toDate(value: string): Date {
    return new Date(`${value}T00:00:00.000Z`);
  }
}
