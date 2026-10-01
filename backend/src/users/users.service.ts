import { Injectable, NotFoundException } from "@nestjs/common";
import { User } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateUserDto } from "./dto";

type PublicUser = Omit<User, "passwordHash" | "refreshTokenHash">;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    return this.toPublicUser(user);
  }

  async updateMe(userId: string, dto: UpdateUserDto): Promise<PublicUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: dto
    });
    return this.toPublicUser(user);
  }

  private toPublicUser(user: User): PublicUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      timezone: user.timezone,
      onboardingCompleted: user.onboardingCompleted,
      plan: user.plan,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}
