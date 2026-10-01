CREATE TYPE "EventExceptionType" AS ENUM ('CANCELLED', 'OVERRIDDEN');
CREATE TYPE "ScheduleVersionSource" AS ENUM ('GENERATED', 'RESTORED', 'BASELINE');

ALTER TABLE "SchedulePreference"
ADD COLUMN "maxScheduledMinutesPerDay" INTEGER NOT NULL DEFAULT 480,
ADD COLUMN "minimumBreakMinutes" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN "breakAfterContinuousMinutes" INTEGER NOT NULL DEFAULT 120;

ALTER TABLE "Event" ADD COLUMN "eventDate" TIMESTAMP(3);

ALTER TABLE "Goal"
ADD COLUMN "preferredDays" "DayOfWeek"[] NOT NULL DEFAULT ARRAY[]::"DayOfWeek"[],
ADD COLUMN "allowedDays" "DayOfWeek"[] NOT NULL DEFAULT ARRAY[]::"DayOfWeek"[],
ADD COLUMN "preferredStartTime" TEXT,
ADD COLUMN "preferredEndTime" TEXT,
ADD COLUMN "earliestStartTime" TEXT,
ADD COLUMN "latestEndTime" TEXT,
ADD COLUMN "allowSplit" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "minimumBlockMinutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN "maximumBlockMinutes" INTEGER;

CREATE TABLE "EventException" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "type" "EventExceptionType" NOT NULL,
  "replacementStartTime" TEXT,
  "replacementEndTime" TEXT,
  "replacementTitle" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EventException_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BlockedPeriod" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "fullDay" BOOLEAN NOT NULL DEFAULT true,
  "startTime" TEXT,
  "endTime" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BlockedPeriod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScheduleVersion" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "weekStart" TIMESTAMP(3) NOT NULL,
  "label" TEXT,
  "source" "ScheduleVersionSource" NOT NULL DEFAULT 'GENERATED',
  "active" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ScheduleVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScheduleVersionBlock" (
  "id" TEXT NOT NULL,
  "scheduleVersionId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" "EventCategory" NOT NULL DEFAULT 'OTHER',
  "date" TIMESTAMP(3) NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "sourceType" "ScheduleSourceType" NOT NULL,
  "sourceId" TEXT,
  "generated" BOOLEAN NOT NULL,
  "locked" BOOLEAN NOT NULL,
  "completed" BOOLEAN NOT NULL,
  CONSTRAINT "ScheduleVersionBlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventException_eventId_date_key" ON "EventException"("eventId", "date");
CREATE INDEX "EventException_eventId_date_idx" ON "EventException"("eventId", "date");
CREATE INDEX "Event_userId_eventDate_idx" ON "Event"("userId", "eventDate");
CREATE INDEX "BlockedPeriod_userId_date_idx" ON "BlockedPeriod"("userId", "date");
CREATE INDEX "ScheduleVersion_userId_weekStart_createdAt_idx" ON "ScheduleVersion"("userId", "weekStart", "createdAt");
CREATE INDEX "ScheduleVersion_userId_weekStart_active_idx" ON "ScheduleVersion"("userId", "weekStart", "active");
CREATE INDEX "ScheduleVersionBlock_scheduleVersionId_date_idx" ON "ScheduleVersionBlock"("scheduleVersionId", "date");

ALTER TABLE "EventException" ADD CONSTRAINT "EventException_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BlockedPeriod" ADD CONSTRAINT "BlockedPeriod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduleVersion" ADD CONSTRAINT "ScheduleVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduleVersionBlock" ADD CONSTRAINT "ScheduleVersionBlock_scheduleVersionId_fkey" FOREIGN KEY ("scheduleVersionId") REFERENCES "ScheduleVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
