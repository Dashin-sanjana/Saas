import { DayOfWeek, GoalFrequency, GoalType, Priority } from "@prisma/client";
import { ArrayUnique, IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Matches, Max, Min, MinLength } from "class-validator";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateGoalDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(GoalType)
  type!: GoalType;

  @IsEnum(GoalFrequency)
  frequency!: GoalFrequency;

  @IsInt()
  @Min(5)
  @Max(1440)
  durationMinutes!: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  weekdayDurationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  weekendDurationMinutes?: number;

  @IsEnum(Priority)
  priority!: Priority;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(DayOfWeek, { each: true })
  preferredDays?: DayOfWeek[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(DayOfWeek, { each: true })
  allowedDays?: DayOfWeek[];

  @IsOptional()
  @Matches(timePattern)
  preferredStartTime?: string;

  @IsOptional()
  @Matches(timePattern)
  preferredEndTime?: string;

  @IsOptional()
  @Matches(timePattern)
  earliestStartTime?: string;

  @IsOptional()
  @Matches(timePattern)
  latestEndTime?: string;

  @IsOptional()
  @IsBoolean()
  allowSplit?: boolean;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  minimumBlockMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  maximumBlockMinutes?: number;
}

export class UpdateGoalDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(GoalType)
  type?: GoalType;

  @IsOptional()
  @IsEnum(GoalFrequency)
  frequency?: GoalFrequency;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  durationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  weekdayDurationMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  weekendDurationMinutes?: number;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(DayOfWeek, { each: true })
  preferredDays?: DayOfWeek[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(DayOfWeek, { each: true })
  allowedDays?: DayOfWeek[];

  @IsOptional()
  @Matches(timePattern)
  preferredStartTime?: string | null;

  @IsOptional()
  @Matches(timePattern)
  preferredEndTime?: string | null;

  @IsOptional()
  @Matches(timePattern)
  earliestStartTime?: string | null;

  @IsOptional()
  @Matches(timePattern)
  latestEndTime?: string | null;

  @IsOptional()
  @IsBoolean()
  allowSplit?: boolean;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  minimumBlockMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  maximumBlockMinutes?: number | null;
}
