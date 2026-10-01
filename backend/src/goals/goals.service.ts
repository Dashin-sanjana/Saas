import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateGoalDto, UpdateGoalDto } from "./dto";

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.goal.findMany({
      where: { userId },
      orderBy: [{ active: "desc" }, { priority: "desc" }, { createdAt: "desc" }]
    });
  }

  create(userId: string, dto: CreateGoalDto) {
    this.validate(dto);
    return this.prisma.goal.create({ data: { ...dto, userId } });
  }

  async get(userId: string, id: string) {
    const goal = await this.prisma.goal.findFirst({ where: { id, userId } });
    if (!goal) {
      throw new NotFoundException("Goal not found");
    }
    return goal;
  }

  async update(userId: string, id: string, dto: UpdateGoalDto) {
    const current = await this.get(userId, id);
    this.validate({ ...current, ...dto });
    return this.prisma.goal.update({ where: { id }, data: dto });
  }

  async delete(userId: string, id: string) {
    await this.get(userId, id);
    await this.prisma.goal.delete({ where: { id } });
    return { success: true };
  }

  private validate(dto: { preferredStartTime?: string | null; preferredEndTime?: string | null; earliestStartTime?: string | null; latestEndTime?: string | null; minimumBlockMinutes?: number; maximumBlockMinutes?: number | null }) {
    if (dto.preferredStartTime && dto.preferredEndTime && dto.preferredStartTime >= dto.preferredEndTime) throw new BadRequestException("Preferred end time must be after preferred start time");
    if (dto.earliestStartTime && dto.latestEndTime && dto.earliestStartTime >= dto.latestEndTime) throw new BadRequestException("Latest end time must be after earliest start time");
    if (dto.maximumBlockMinutes && dto.minimumBlockMinutes && dto.maximumBlockMinutes < dto.minimumBlockMinutes) throw new BadRequestException("Maximum block minutes cannot be below the minimum");
  }
}
