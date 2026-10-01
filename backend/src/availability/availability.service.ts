import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { expandEventOccurrences } from "../events/event-expansion";
import { DAYS } from "../schedule/scheduler.types";
import { addDays, minutesToTime, subtractIntervals, timeToMinutes } from "../schedule/scheduler.utils";

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async week(userId: string, weekStart: string) {
    const start = new Date(`${weekStart}T00:00:00.000Z`);
    if (Number.isNaN(start.getTime()) || start.getUTCDay() !== 1) throw new BadRequestException("weekStart must be a valid Monday ISO date");
    const end = new Date(`${addDays(weekStart, 7)}T00:00:00.000Z`);
    const [preferences, definitions, blocks, periods] = await Promise.all([
      this.prisma.schedulePreference.findUnique({ where: { userId } }),
      this.prisma.event.findMany({ where: { userId }, include: { exceptions: true } }),
      this.prisma.scheduleBlock.findMany({ where: { userId, date: { gte: start, lt: end } } }),
      this.prisma.blockedPeriod.findMany({ where: { userId, date: { gte: start, lt: end } } })
    ]);
    if (!preferences) throw new BadRequestException("Schedule preferences are required");
    const occurrences = expandEventOccurrences(definitions, weekStart);
    const days = DAYS.map((day, index) => {
      const date = addDays(weekStart, index);
      const sleep = preferences.sleepTime === "00:00" ? 1440 : timeToMinutes(preferences.sleepTime);
      const cutoff = index >= 5 || preferences.weekdayCutoffTime === "00:00" ? sleep : Math.min(sleep, timeToMinutes(preferences.weekdayCutoffTime));
      const occupied = [
        ...occurrences.filter((item) => item.date === date).map((item) => ({ start: timeToMinutes(item.startTime), end: item.endTime === "00:00" ? 1440 : timeToMinutes(item.endTime) })),
        ...blocks.filter((item) => item.date.toISOString().slice(0, 10) === date).map((item) => ({ start: timeToMinutes(item.startTime), end: item.endTime === "00:00" ? 1440 : timeToMinutes(item.endTime) })),
        ...periods.filter((item) => item.date.toISOString().slice(0, 10) === date).map((item) => item.fullDay ? { start: 0, end: 1440 } : ({ start: timeToMinutes(item.startTime!), end: item.endTime === "00:00" ? 1440 : timeToMinutes(item.endTime!) }))
      ];
      const free = subtractIntervals({ start: timeToMinutes(preferences.wakeTime), end: cutoff }, occupied);
      const intervals = free.map((slot) => ({ startTime: minutesToTime(slot.start), endTime: minutesToTime(slot.end), minutes: slot.end - slot.start }));
      const totalFreeMinutes = intervals.reduce((total, slot) => total + slot.minutes, 0);
      return { day, date, totalFreeMinutes, largestFreeBlockMinutes: Math.max(0, ...intervals.map((slot) => slot.minutes)), intervals };
    });
    return { weekStart, totalFreeMinutes: days.reduce((total, day) => total + day.totalFreeMinutes, 0), days };
  }
}
