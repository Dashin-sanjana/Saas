CREATE TYPE "Plan" AS ENUM ('FREE', 'PRO');
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');
CREATE TYPE "EventCategory" AS ENUM ('LECTURE', 'WORK', 'BUSINESS', 'GYM', 'TRAVEL', 'REST', 'PERSONAL', 'MEETING', 'OTHER');
CREATE TYPE "GoalType" AS ENUM ('STUDY', 'RESEARCH', 'BUSINESS', 'WORK', 'FITNESS', 'PERSONAL', 'OTHER');
CREATE TYPE "GoalFrequency" AS ENUM ('DAILY', 'WEEKDAYS', 'WEEKENDS', 'WEEKLY');
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "ScheduleSourceType" AS ENUM ('EVENT', 'GOAL', 'SUBJECT', 'SYSTEM', 'MANUAL');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
  "plan" "Plan" NOT NULL DEFAULT 'FREE',
  "refreshTokenHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchedulePreference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "wakeTime" TEXT NOT NULL DEFAULT '07:00',
  "sleepTime" TEXT NOT NULL DEFAULT '23:00',
  "weekdayCutoffTime" TEXT NOT NULL DEFAULT '18:00',
  "defaultTravelMinutes" INTEGER NOT NULL DEFAULT 15,
  "defaultRestMinutes" INTEGER NOT NULL DEFAULT 10,
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "weekStartsOn" "DayOfWeek" NOT NULL DEFAULT 'MONDAY',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulePreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Event" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" "EventCategory" NOT NULL DEFAULT 'OTHER',
  "dayOfWeek" "DayOfWeek" NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "location" TEXT,
  "recurring" BOOLEAN NOT NULL DEFAULT true,
  "isLocked" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subject" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "revisionMinutes" INTEGER NOT NULL DEFAULT 60,
  "colorKey" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Goal" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" "GoalType" NOT NULL DEFAULT 'OTHER',
  "frequency" "GoalFrequency" NOT NULL DEFAULT 'WEEKLY',
  "durationMinutes" INTEGER NOT NULL,
  "weekdayDurationMinutes" INTEGER,
  "weekendDurationMinutes" INTEGER,
  "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScheduleBlock" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" "EventCategory" NOT NULL DEFAULT 'OTHER',
  "date" TIMESTAMP(3) NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "sourceType" "ScheduleSourceType" NOT NULL DEFAULT 'MANUAL',
  "sourceId" TEXT,
  "generated" BOOLEAN NOT NULL DEFAULT false,
  "locked" BOOLEAN NOT NULL DEFAULT false,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ScheduleBlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE UNIQUE INDEX "SchedulePreference_userId_key" ON "SchedulePreference"("userId");
CREATE INDEX "Event_userId_dayOfWeek_idx" ON "Event"("userId", "dayOfWeek");
CREATE INDEX "Subject_userId_active_idx" ON "Subject"("userId", "active");
CREATE INDEX "Goal_userId_active_idx" ON "Goal"("userId", "active");
CREATE INDEX "ScheduleBlock_userId_date_idx" ON "ScheduleBlock"("userId", "date");

ALTER TABLE "SchedulePreference" ADD CONSTRAINT "SchedulePreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Event" ADD CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduleBlock" ADD CONSTRAINT "ScheduleBlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
