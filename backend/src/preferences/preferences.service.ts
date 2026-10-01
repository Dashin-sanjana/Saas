import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpsertPreferenceDto } from "./dto";

@Injectable()
export class PreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  get(userId: string) {
    return this.prisma.schedulePreference.upsert({
      where: { userId },
      update: {},
      create: { userId }
    });
  }

  upsert(userId: string, dto: UpsertPreferenceDto) {
    return this.prisma.schedulePreference.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto }
    });
  }
}
