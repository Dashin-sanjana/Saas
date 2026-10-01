export type DayOfWeek = "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
export type EventCategory = "LECTURE" | "WORK" | "BUSINESS" | "GYM" | "TRAVEL" | "REST" | "PERSONAL" | "MEETING" | "OTHER";
export type GoalType = "STUDY" | "RESEARCH" | "BUSINESS" | "WORK" | "FITNESS" | "PERSONAL" | "OTHER";
export type GoalFrequency = "DAILY" | "WEEKDAYS" | "WEEKENDS" | "WEEKLY";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ScheduleSourceType = "EVENT" | "GOAL" | "SUBJECT" | "SYSTEM" | "MANUAL";

export type User = {
  id: string;
  name: string;
  email: string;
  timezone: string;
  onboardingCompleted: boolean;
  plan: "FREE" | "PRO";
  createdAt: string;
  updatedAt: string;
};

export type Preference = {
  id: string;
  wakeTime: string;
  sleepTime: string;
  weekdayCutoffTime: string;
  defaultTravelMinutes: number;
  defaultRestMinutes: number;
  timezone: string;
  weekStartsOn: DayOfWeek;
  maxScheduledMinutesPerDay: number;
  minimumBreakMinutes: number;
  breakAfterContinuousMinutes: number;
};

export type EventException = {
  id: string;
  date: string;
  type: "CANCELLED" | "OVERRIDDEN";
  replacementStartTime?: string | null;
  replacementEndTime?: string | null;
  replacementTitle?: string | null;
};

export type EventItem = {
  id: string;
  title: string;
  description?: string;
  category: EventCategory;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  location?: string;
  recurring: boolean;
  isLocked: boolean;
  subjectId?: string | null;
  eventDate?: string | null;
  exceptions?: EventException[];
};

export type EventOccurrence = Pick<EventItem, "title" | "category" | "dayOfWeek" | "startTime" | "endTime" | "subjectId"> & {
  id: string;
  eventId: string;
  date: string;
  overridden: boolean;
};

export type Subject = {
  id: string;
  name: string;
  code?: string;
  revisionMinutes: number;
  colorKey?: string;
  active: boolean;
};

export type Goal = {
  id: string;
  title: string;
  description?: string;
  type: GoalType;
  frequency: GoalFrequency;
  durationMinutes: number;
  weekdayDurationMinutes?: number;
  weekendDurationMinutes?: number;
  priority: Priority;
  active: boolean;
  preferredDays?: DayOfWeek[];
  allowedDays?: DayOfWeek[];
  preferredStartTime?: string | null;
  preferredEndTime?: string | null;
  earliestStartTime?: string | null;
  latestEndTime?: string | null;
  allowSplit?: boolean;
  minimumBlockMinutes?: number;
  maximumBlockMinutes?: number | null;
};

export type ScheduleBlock = {
  id: string;
  title: string;
  category: EventCategory;
  date: string;
  startTime: string;
  endTime: string;
  sourceType: ScheduleSourceType;
  sourceId?: string | null;
  generated: boolean;
  locked: boolean;
  completed: boolean;
};

export type ProposedBlock = Omit<ScheduleBlock, "id" | "completed" | "sourceType"> & {
  proposalId: string;
  sourceType: "GOAL" | "SUBJECT" | "SYSTEM";
};

export type SchedulePreview = {
  proposedBlocks: ProposedBlock[];
  warnings: Array<{ type: "TASK_MOVED" | "UNSCHEDULED_MINUTES" | "DAILY_LIMIT"; taskId: string; message: string; unscheduledMinutes?: number }>;
  conflicts: Array<{ type: "FIXED_EVENT_OVERLAP"; day: DayOfWeek; eventIds: string[]; message: string }>;
  summary: {
    requiredMinutes: number;
    scheduledMinutes: number;
    unscheduledMinutes: number;
    allocations: Array<{ taskId: string; title: string; sourceType: "GOAL" | "SUBJECT"; requiredMinutes: number; scheduledMinutes: number; unscheduledMinutes: number }>;
  };
};

export type BlockedPeriod = { id: string; title: string; date: string; fullDay: boolean; startTime?: string | null; endTime?: string | null };
export type ScheduleVersion = { id: string; weekStart: string; label?: string | null; source: "GENERATED" | "RESTORED" | "BASELINE"; active: boolean; createdAt: string; _count?: { blocks: number }; blocks?: ScheduleBlock[]; comparison?: { activeVersionId: string | null; added: ScheduleBlock[]; removed: ScheduleBlock[]; changed: Array<{ before: ScheduleBlock; after: ScheduleBlock }> } };
export type ScheduleCommitResult = { blocks: ScheduleBlock[]; version: ScheduleVersion; previousVersionId: string | null };
export type AvailabilityWeek = { weekStart: string; totalFreeMinutes: number; days: Array<{ day: DayOfWeek; date: string; totalFreeMinutes: number; largestFreeBlockMinutes: number; intervals: Array<{ startTime: string; endTime: string; minutes: number }> }> };

export type Dashboard = {
  today: DayOfWeek;
  todaysEvents: EventOccurrence[];
  upcomingEvents: EventOccurrence[];
  activeGoals: Goal[];
  subjects: Subject[];
  scheduleBlocks: ScheduleBlock[];
  todaysBlocks: ScheduleBlock[];
  metrics: {
    scheduledMinutesToday: number;
    freeMinutesToday: number;
    weeklyScheduledMinutes: number;
    nextScheduledItem: { id: string; title: string; startTime: string; endTime: string } | null;
    freeIntervalsToday: Array<{ startTime: string; endTime: string; minutes: number }>;
    completedMinutes: number;
    scheduledProductiveMinutes: number;
    completionPercentage: number;
    nextEvent: EventOccurrence | null;
    nextGeneratedTask: ScheduleBlock | null;
  };
  unfinishedBlocks: ScheduleBlock[];
  goalProgress: Array<{ goalId: string; title: string; scheduledMinutes: number; completedMinutes: number; percentage: number }>;
  overloadedDays: Array<{ day: DayOfWeek; date: string; minutes: number; limit: number }>;
};
