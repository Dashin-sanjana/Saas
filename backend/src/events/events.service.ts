import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateEventDto, CreateEventExceptionDto, UpdateEventDto } from "./dto";
import { expandEventOccurrences } from "./event-expansion";

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.event.findMany({
      where: { userId },
      include: { exceptions: { orderBy: { date: "asc" } } },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }]
    });
  }

  create(userId: string, dto: CreateEventDto) {
    return this.validateAndCreate(userId, dto);
  }

  async get(userId: string, id: string) {
    const event = await this.prisma.event.findFirst({ where: { id, userId }, include: { exceptions: { orderBy: { date: "asc" } } } });
    if (!event) {
      throw new NotFoundException("Event not found");
    }
    return event;
  }

  async update(userId: string, id: string, dto: UpdateEventDto) {
    const current = await this.get(userId, id);
    await this.validate(userId, { ...current, ...dto });
    const { eventDate, ...data } = dto;
    return this.prisma.event.update({ where: { id }, data: { ...data, eventDate: eventDate === undefined ? undefined : eventDate ? this.toDate(eventDate) : null } });
  }

  async delete(userId: string, id: string) {
    await this.get(userId, id);
    await this.prisma.event.delete({ where: { id } });
    return { success: true };
  }

  private async validateAndCreate(userId: string, dto: CreateEventDto) {
    await this.validate(userId, dto);
    const { eventDate, ...data } = dto;
    return this.prisma.event.create({ data: { ...data, eventDate: eventDate ? this.toDate(eventDate) : null, userId } });
  }

  async occurrences(userId: string, weekStart: string) {
    const events = await this.prisma.event.findMany({ where: { userId }, include: { exceptions: true } });
    return expandEventOccurrences(events, weekStart);
  }

  async listExceptions(userId: string, eventId: string) {
    await this.get(userId, eventId);
    return this.prisma.eventException.findMany({ where: { eventId }, orderBy: { date: "asc" } });
  }

  async createException(userId: string, eventId: string, dto: CreateEventExceptionDto) {
    const event = await this.get(userId, eventId);
    if (!event.recurring) throw new BadRequestException("Exceptions can only be added to recurring events");
    const dayNames = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    if (dayNames[this.toDate(dto.date).getUTCDay()] !== event.dayOfWeek) throw new BadRequestException(`Exception date must fall on ${event.dayOfWeek.toLowerCase()}`);
    if (dto.type === "OVERRIDDEN" && dto.replacementStartTime! >= dto.replacementEndTime!) throw new BadRequestException("Replacement end time must be after its start time");
    return this.prisma.eventException.upsert({
      where: { eventId_date: { eventId, date: this.toDate(dto.date) } },
      update: { ...dto, date: undefined },
      create: { ...dto, eventId, date: this.toDate(dto.date) }
    });
  }

  async deleteException(userId: string, eventId: string, exceptionId: string) {
    await this.get(userId, eventId);
    const exception = await this.prisma.eventException.findFirst({ where: { id: exceptionId, eventId } });
    if (!exception) throw new NotFoundException("Event exception not found");
    await this.prisma.eventException.delete({ where: { id: exceptionId } });
    return { success: true };
  }

  private async validate(userId: string, dto: { startTime: string; endTime: string; subjectId?: string | null; recurring?: boolean; eventDate?: string | Date | null }) {
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException("Event end time must be after its start time");
    }
    if (dto.subjectId) {
      const subject = await this.prisma.subject.findFirst({ where: { id: dto.subjectId, userId } });
      if (!subject) {
        throw new BadRequestException("Subject does not belong to this user");
      }
    }
    if (dto.recurring === false && !dto.eventDate) throw new BadRequestException("A date is required for one-time events");
  }

  private toDate(value: string) {
    return new Date(`${value}T00:00:00.000Z`);
  }
}
