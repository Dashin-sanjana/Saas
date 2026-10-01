import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { after, before, describe, it } from "node:test";
import type { INestApplication } from "@nestjs/common";
import type { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.TEST_DATABASE_URL;
const safeDatabase = Boolean(databaseUrl && /(^|[_/-])test([?_/.-]|$)/i.test(databaseUrl));

describe("PostgreSQL integration", { skip: !safeDatabase }, () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let baseUrl = "";
  const marker = `integration-${Date.now()}`;

  before(async () => {
    process.env.DATABASE_URL = databaseUrl!;
    process.env.JWT_ACCESS_SECRET = "test-access-secret-at-least-32-characters";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret-at-least-32-characters";
    execFileSync("npx", ["prisma", "migrate", "deploy"], { cwd: process.cwd(), env: { ...process.env, DATABASE_URL: databaseUrl! }, stdio: "pipe" });
    const [{ Test }, { AppModule }, prismaModule] = await Promise.all([import("@nestjs/testing"), import("../../src/app.module"), import("@prisma/client")]);
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.listen(0);
    baseUrl = await app.getUrl();
    prisma = new prismaModule.PrismaClient();
  });

  after(async () => {
    if (prisma) {
      await prisma.user.deleteMany({ where: { email: { startsWith: marker } } });
      await prisma.$disconnect();
    }
    if (app) await app.close();
  });

  it("runs migrations and covers auth, ownership, occurrences, preview, commit, move, version and restore", async () => {
    const first = await register(`${marker}-a@example.com`);
    const second = await register(`${marker}-b@example.com`);
    const login = await request("/auth/login", { method: "POST", body: { email: `${marker}-a@example.com`, password: "Password123!" } });
    assert.equal(login.status, 201);

    const subject = await json(await request("/subjects", { token: first.accessToken, method: "POST", body: { name: "Formal Methods", code: "CS401", revisionMinutes: 60 } }));
    const event = await json(await request("/events", { token: first.accessToken, method: "POST", body: { title: "Lecture", category: "LECTURE", dayOfWeek: "WEDNESDAY", startTime: "08:30", endTime: "10:30", recurring: true, isLocked: true, subjectId: subject.id } }));
    await request(`/events/${event.id}/exceptions`, { token: first.accessToken, method: "POST", body: { date: "2026-09-30", type: "OVERRIDDEN", replacementStartTime: "09:30", replacementEndTime: "11:30" } });
    const occurrences = await json(await request("/events/occurrences/week?weekStart=2026-09-28", { token: first.accessToken }));
    assert.equal(occurrences[0].startTime, "09:30");

    await request("/goals", { token: first.accessToken, method: "POST", body: { title: "Research", type: "RESEARCH", frequency: "WEEKLY", durationMinutes: 120, priority: "HIGH", preferredDays: ["MONDAY"], allowedDays: ["MONDAY", "TUESDAY"], allowSplit: false, minimumBlockMinutes: 60 } });
    const preview = await json(await request("/schedule/generate-preview", { token: first.accessToken, method: "POST", body: { weekStart: "2026-09-28" } }));
    assert.equal(preview.conflicts.length, 0);
    const committed = await json(await request("/schedule/commit", { token: first.accessToken, method: "POST", body: { weekStart: "2026-09-28", proposedBlocks: preview.proposedBlocks.map(({ proposalId: _id, generated: _generated, locked: _locked, ...block }: Record<string, unknown>) => block) } }));
    assert.ok(committed.version.id);

    const manual = await json(await request("/schedule/blocks", { token: first.accessToken, method: "POST", body: { title: "Manual", category: "PERSONAL", date: "2026-09-29", startTime: "15:00", endTime: "16:00" } }));
    const validation = await request("/schedule/validate-move", { token: first.accessToken, method: "POST", body: { blockId: manual.id, newDate: "2026-09-29", newStartTime: "16:00", newEndTime: "17:00" } });
    assert.equal(validation.status, 201);
    const crossUser = await request(`/schedule/blocks/${manual.id}/lock`, { token: second.accessToken, method: "PATCH", body: { locked: true } });
    assert.equal(crossUser.status, 404);

    const versions = await json(await request("/schedule/versions?weekStart=2026-09-28", { token: first.accessToken }));
    assert.ok(versions.length >= 1);
    const restore = await request(`/schedule/versions/${versions[0].id}/restore`, { token: second.accessToken, method: "POST" });
    assert.equal(restore.status, 404);
  });

  async function register(email: string) {
    return json(await request("/auth/register", { method: "POST", body: { name: "Integration User", email, password: "Password123!", timezone: "UTC" } }));
  }

  async function request(path: string, options: { token?: string; method?: string; body?: unknown } = {}) {
    return fetch(`${baseUrl}${path}`, { method: options.method ?? "GET", headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}) }, body: options.body ? JSON.stringify(options.body) : undefined });
  }

  async function json(response: Response) {
    const body = await response.json();
    assert.ok(response.ok, JSON.stringify(body));
    return body;
  }
});
