export const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;

export type SchedulerDay = (typeof DAYS)[number];
export type SchedulerPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type SchedulerFrequency = "DAILY" | "WEEKDAYS" | "WEEKENDS" | "WEEKLY";
export type SchedulerSourceType = "GOAL" | "SUBJECT" | "SYSTEM";
export type SchedulerCategory = "LECTURE" | "WORK" | "BUSINESS" | "GYM" | "TRAVEL" | "REST" | "PERSONAL" | "MEETING" | "OTHER";

export type SchedulerPreferences = {
  wakeTime: string;
  sleepTime: string;
  weekdayCutoffTime: string;
  defaultTravelMinutes: number;
  defaultRestMinutes: number;
  maxScheduledMinutesPerDay?: number;
  minimumBreakMinutes?: number;
  breakAfterContinuousMinutes?: number;
};

export type SchedulerEvent = {
  id: string;
  eventId?: string;
  title: string;
  category: SchedulerCategory;
  dayOfWeek: SchedulerDay;
  startTime: string;
  endTime: string;
  subjectId?: string | null;
  date?: string;
};

export type SchedulerSubject = {
  id: string;
  name: string;
  revisionMinutes: number;
  active: boolean;
};

export type SchedulerBlockedPeriod = {
  id: string;
  title: string;
  date: string;
  fullDay: boolean;
  startTime?: string | null;
  endTime?: string | null;
};

export type SchedulableTask = {
  id: string;
  sourceId: string;
  sourceType: "GOAL" | "SUBJECT";
  title: string;
  category: SchedulerCategory;
  minutes: number;
  priority: number;
  candidateDays: SchedulerDay[];
  preferredDays: SchedulerDay[];
  preferredDay?: SchedulerDay;
  preferredStartTime?: string | null;
  preferredEndTime?: string | null;
  earliestStartTime?: string | null;
  latestEndTime?: string | null;
  allowSplit: boolean;
  minimumBlockMinutes: number;
  maximumBlockMinutes?: number | null;
};

export type SchedulerGoal = {
  id: string;
  title: string;
  type: string;
  frequency: SchedulerFrequency;
  durationMinutes: number;
  weekdayDurationMinutes?: number | null;
  weekendDurationMinutes?: number | null;
  priority: SchedulerPriority;
  active: boolean;
  preferredDays?: SchedulerDay[];
  allowedDays?: SchedulerDay[];
  preferredStartTime?: string | null;
  preferredEndTime?: string | null;
  earliestStartTime?: string | null;
  latestEndTime?: string | null;
  allowSplit?: boolean;
  minimumBlockMinutes?: number;
  maximumBlockMinutes?: number | null;
};

export type SchedulerExistingBlock = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  sourceType: string;
  locked: boolean;
};

export type ProposedBlock = {
  proposalId: string;
  title: string;
  category: SchedulerCategory;
  date: string;
  startTime: string;
  endTime: string;
  sourceType: SchedulerSourceType;
  sourceId: string | null;
  generated: true;
  locked: false;
};

export type ScheduleWarning = {
  type: "TASK_MOVED" | "UNSCHEDULED_MINUTES" | "DAILY_LIMIT";
  taskId: string;
  message: string;
  unscheduledMinutes?: number;
};

export type ScheduleConflict = {
  type: "FIXED_EVENT_OVERLAP";
  day: SchedulerDay;
  eventIds: string[];
  message: string;
};

export type AllocationSummary = {
  taskId: string;
  title: string;
  sourceType: "GOAL" | "SUBJECT";
  requiredMinutes: number;
  scheduledMinutes: number;
  unscheduledMinutes: number;
};

export type SchedulerResult = {
  proposedBlocks: ProposedBlock[];
  warnings: ScheduleWarning[];
  conflicts: ScheduleConflict[];
  summary: {
    requiredMinutes: number;
    scheduledMinutes: number;
    unscheduledMinutes: number;
    allocations: AllocationSummary[];
  };
};

export type SchedulerInput = {
  weekStart: string;
  preferences: SchedulerPreferences;
  events: SchedulerEvent[];
  subjects: SchedulerSubject[];
  goals: SchedulerGoal[];
  existingBlocks: SchedulerExistingBlock[];
  blockedPeriods?: SchedulerBlockedPeriod[];
  minimumBlockMinutes?: number;
};

export type MinuteInterval = { start: number; end: number };
