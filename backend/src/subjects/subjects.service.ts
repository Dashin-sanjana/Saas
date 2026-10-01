import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSubjectDto, UpdateSubjectDto } from "./dto";

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.subject.findMany({
      where: { userId },
      orderBy: [{ active: "desc" }, { name: "asc" }]
    });
  }

  create(userId: string, dto: CreateSubjectDto) {
    return this.prisma.subject.create({ data: { ...dto, userId } });
  }

  async get(userId: string, id: string) {
    const subject = await this.prisma.subject.findFirst({ where: { id, userId } });
    if (!subject) {
      throw new NotFoundException("Subject not found");
    }
    return subject;
  }

  async update(userId: string, id: string, dto: UpdateSubjectDto) {
    await this.get(userId, id);
    return this.prisma.subject.update({ where: { id }, data: dto });
  }

  async delete(userId: string, id: string) {
    await this.get(userId, id);
    await this.prisma.subject.delete({ where: { id } });
    return { success: true };
  }
}
