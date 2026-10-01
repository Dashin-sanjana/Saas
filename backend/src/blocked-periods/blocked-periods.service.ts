import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateBlockedPeriodDto, UpdateBlockedPeriodDto } from "./dto";

@Injectable()
export class BlockedPeriodsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string, weekStart?: string) {
    const date = weekStart ? { gte: this.toDate(weekStart), lt: this.toDate(this.addDays(weekStart, 7)) } : undefined;
    return this.prisma.blockedPeriod.findMany({ where: { userId, date }, orderBy: [{ date: "asc" }, { startTime: "asc" }] });
  }

  async create(userId: string, dto: CreateBlockedPeriodDto) {
    this.validate(dto);
    return this.prisma.blockedPeriod.create({ data: { ...dto, date: this.toDate(dto.date), startTime: dto.fullDay ? null : dto.startTime, endTime: dto.fullDay ? null : dto.endTime, userId } });
  }

  async update(userId: string, id: string, dto: UpdateBlockedPeriodDto) {
    const current = await this.get(userId, id);
    const merged = { ...current, ...dto };
    this.validate(merged);
    return this.prisma.blockedPeriod.update({ where: { id }, data: { ...dto, date: dto.date ? this.toDate(dto.date) : undefined, startTime: merged.fullDay ? null : merged.startTime, endTime: merged.fullDay ? null : merged.endTime } });
  }

  async delete(userId: string, id: string) {
    await this.get(userId, id);
    await this.prisma.blockedPeriod.delete({ where: { id } });
    return { success: true };
  }

  private async get(userId: string, id: string) {
    const period = await this.prisma.blockedPeriod.findFirst({ where: { id, userId } });
    if (!period) throw new NotFoundException("Blocked period not found");
    return period;
  }

  private validate(value: { fullDay: boolean; startTime?: string | null; endTime?: string | null }) {
    if (!value.fullDay && (!value.startTime || !value.endTime || value.startTime >= value.endTime)) throw new BadRequestException("Partial blocked periods require a valid start and end time");
  }

  private toDate(value: string) { return new Date(`${value}T00:00:00.000Z`); }
  private addDays(value: string, days: number) { const date = this.toDate(value); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); }
}
