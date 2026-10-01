import { EventCategory, ScheduleSourceType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, Matches, MinLength, ValidateNested } from "class-validator";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export class WeekDto {
  @Matches(datePattern)
  weekStart!: string;
}

export class ProposedBlockDto {
  @IsString()
  @MinLength(2)
  title!: string;
  @IsEnum(EventCategory)
  category!: EventCategory;
  @Matches(datePattern)
  date!: string;
  @Matches(timePattern)
  startTime!: string;
  @Matches(timePattern)
  endTime!: string;
  @IsEnum(ScheduleSourceType)
  sourceType!: ScheduleSourceType;
  @IsOptional()
  @IsString()
  sourceId?: string | null;
}

export class CommitScheduleDto extends WeekDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProposedBlockDto)
  proposedBlocks!: ProposedBlockDto[];
}

export class CreateScheduleBlockDto {
  @IsString()
  @MinLength(2)
  title!: string;
  @IsEnum(EventCategory)
  category!: EventCategory;
  @Matches(datePattern)
  date!: string;
  @Matches(timePattern)
  startTime!: string;
  @Matches(timePattern)
  endTime!: string;
}

export class UpdateScheduleBlockDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;
  @IsOptional()
  @IsEnum(EventCategory)
  category?: EventCategory;
  @IsOptional()
  @Matches(datePattern)
  date?: string;
  @IsOptional()
  @Matches(timePattern)
  startTime?: string;
  @IsOptional()
  @Matches(timePattern)
  endTime?: string;
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}

export class LockScheduleBlockDto {
  @IsBoolean()
  locked!: boolean;
}

export class CompleteScheduleBlockDto {
  @IsBoolean()
  completed!: boolean;
}

export class ValidateMoveDto {
  @IsString()
  blockId!: string;
  @Matches(datePattern)
  newDate!: string;
  @Matches(timePattern)
  newStartTime!: string;
  @Matches(timePattern)
  newEndTime!: string;
}
