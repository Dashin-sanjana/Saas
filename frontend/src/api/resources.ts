import { api } from "./client";
import type { AvailabilityWeek, BlockedPeriod, Dashboard, EventException, EventItem, EventOccurrence, Goal, Preference, ProposedBlock, ScheduleBlock, ScheduleCommitResult, SchedulePreview, ScheduleVersion, Subject, User } from "../types/domain";

export const authApi = {
  register: (body: { name: string; email: string; password: string; timezone: string }) =>
    api<{ accessToken: string; refreshToken: string; user: User }>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    api<{ accessToken: string; refreshToken: string; user: User }>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  logout: () => api<{ success: true }>("/auth/logout", { method: "POST" }),
  me: () => api<User>("/users/me")
};

export const userApi = {
  update: (body: Partial<Pick<User, "name" | "timezone" | "onboardingCompleted">>) =>
    api<User>("/users/me", { method: "PATCH", body: JSON.stringify(body) })
};

export const preferencesApi = {
  get: () => api<Preference>("/preferences"),
  update: (body: Partial<Preference>) => api<Preference>("/preferences", { method: "PUT", body: JSON.stringify(body) })
};

export const eventsApi = {
  list: () => api<EventItem[]>("/events"),
  create: (body: Omit<EventItem, "id">) => api<EventItem>("/events", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Partial<EventItem>) => api<EventItem>(`/events/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id: string) => api<{ success: true }>(`/events/${id}`, { method: "DELETE" }),
  occurrences: (weekStart: string) => api<EventOccurrence[]>(`/events/occurrences/week?weekStart=${encodeURIComponent(weekStart)}`),
  exceptions: (id: string) => api<EventException[]>(`/events/${id}/exceptions`),
  createException: (id: string, body: Omit<EventException, "id">) => api<EventException>(`/events/${id}/exceptions`, { method: "POST", body: JSON.stringify(body) }),
  deleteException: (id: string, exceptionId: string) => api<{ success: true }>(`/events/${id}/exceptions/${exceptionId}`, { method: "DELETE" })
};

export const subjectsApi = {
  list: () => api<Subject[]>("/subjects"),
  create: (body: Omit<Subject, "id" | "active">) => api<Subject>("/subjects", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Partial<Subject>) => api<Subject>(`/subjects/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id: string) => api<{ success: true }>(`/subjects/${id}`, { method: "DELETE" })
};

export const goalsApi = {
  list: () => api<Goal[]>("/goals"),
  create: (body: Omit<Goal, "id" | "active">) => api<Goal>("/goals", { method: "POST", body: JSON.stringify(body) }),
  update: (id: string, body: Partial<Goal>) => api<Goal>(`/goals/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (id: string) => api<{ success: true }>(`/goals/${id}`, { method: "DELETE" })
};

export const dashboardApi = {
  get: () => api<Dashboard>("/dashboard")
};

export const scheduleApi = {
  week: (weekStart: string) => api<ScheduleBlock[]>(`/schedule/week?weekStart=${encodeURIComponent(weekStart)}`),
  preview: (weekStart: string) => api<SchedulePreview>("/schedule/generate-preview", { method: "POST", body: JSON.stringify({ weekStart }) }),
  commit: (weekStart: string, proposedBlocks: ProposedBlock[]) => api<ScheduleCommitResult>("/schedule/commit", {
    method: "POST",
    body: JSON.stringify({
      weekStart,
      proposedBlocks: proposedBlocks.map((block) => ({
        title: block.title,
        category: block.category,
        date: block.date,
        startTime: block.startTime,
        endTime: block.endTime,
        sourceType: block.sourceType,
        sourceId: block.sourceId
      }))
    })
  }),
  createBlock: (body: { title: string; category: EventItem["category"]; date: string; startTime: string; endTime: string }) => api<ScheduleBlock>("/schedule/blocks", { method: "POST", body: JSON.stringify(body) }),
  updateBlock: (id: string, body: Partial<ScheduleBlock>) => api<ScheduleBlock>(`/schedule/blocks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteBlock: (id: string) => api<{ success: true }>(`/schedule/blocks/${id}`, { method: "DELETE" }),
  lockBlock: (id: string, locked: boolean) => api<ScheduleBlock>(`/schedule/blocks/${id}/lock`, { method: "PATCH", body: JSON.stringify({ locked }) }),
  completeBlock: (id: string, completed: boolean) => api<ScheduleBlock>(`/schedule/blocks/${id}/completed`, { method: "PATCH", body: JSON.stringify({ completed }) }),
  validateMove: (body: { blockId: string; newDate: string; newStartTime: string; newEndTime: string }) => api<{ valid: true }>("/schedule/validate-move", { method: "POST", body: JSON.stringify(body) }),
  versions: (weekStart: string) => api<ScheduleVersion[]>(`/schedule/versions?weekStart=${encodeURIComponent(weekStart)}`),
  version: (id: string) => api<ScheduleVersion>(`/schedule/versions/${id}`),
  restoreVersion: (id: string) => api<ScheduleCommitResult>(`/schedule/versions/${id}/restore`, { method: "POST" })
};

export const blockedPeriodsApi = {
  list: (weekStart: string) => api<BlockedPeriod[]>(`/blocked-periods?weekStart=${encodeURIComponent(weekStart)}`),
  create: (body: Omit<BlockedPeriod, "id">) => api<BlockedPeriod>("/blocked-periods", { method: "POST", body: JSON.stringify(body) }),
  delete: (id: string) => api<{ success: true }>(`/blocked-periods/${id}`, { method: "DELETE" })
};

export const availabilityApi = { week: (weekStart: string) => api<AvailabilityWeek>(`/availability/week?weekStart=${encodeURIComponent(weekStart)}`) };
