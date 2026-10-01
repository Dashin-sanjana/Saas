import { DayOfWeek } from "@prisma/client";
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min } from "class-validator";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export class UpsertPreferenceDto {
  @IsOptional()
  @Matches(timePattern)
  wakeTime?: string;

  @IsOptional()
  @Matches(timePattern)
  sleepTime?: string;

  @IsOptional()
  @Matches(timePattern)
  weekdayCutoffTime?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  defaultTravelMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  defaultRestMinutes?: number;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsEnum(DayOfWeek)
  weekStartsOn?: DayOfWeek;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(1440)
  maxScheduledMinutesPerDay?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(120)
  minimumBreakMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(480)
  breakAfterContinuousMinutes?: number;
}
