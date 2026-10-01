import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";

describe("authentication", () => {
  it("rejects invalid login credentials", async () => {
    const prisma = { user: { findUnique: async () => null } };
    const service = new AuthService(prisma as never, {} as never, {} as never);
    await assert.rejects(() => service.login({ email: "missing@example.com", password: "bad" }), UnauthorizedException);
  });

  it("rotates a valid refresh token", async () => {
    const refreshToken = "valid-refresh-token";
    const user = {
      id: "user-1", name: "Test", email: "test@example.com", passwordHash: "hash", refreshTokenHash: await bcrypt.hash(refreshToken, 4),
      timezone: "UTC", onboardingCompleted: true, plan: "FREE", createdAt: new Date(), updatedAt: new Date()
    };
    const prisma = { user: { findUnique: async () => user, update: async () => user } };
    const jwt = { verifyAsync: async () => ({ sub: user.id, email: user.email }), signAsync: async (_payload: unknown, options: { secret: string }) => options.secret };
    const config = { getOrThrow: (key: string) => key, get: () => undefined };
    const service = new AuthService(prisma as never, jwt as never, config as never);
    const response = await service.refresh(refreshToken);
    assert.equal(response.user.id, user.id);
    assert.equal(response.accessToken, "JWT_ACCESS_SECRET");
  });

  it("marks logout as a protected route", () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, AuthController.prototype.logout) as Array<new () => unknown>;
    assert.equal(guards.includes(JwtAuthGuard), true);
  });
});
