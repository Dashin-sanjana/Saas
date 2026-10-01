import { DayOfWeek, EventCategory, EventExceptionType } from "@prisma/client";
import { IsBoolean, IsEnum, IsOptional, IsString, Matches, MinLength, ValidateIf } from "class-validator";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export class CreateEventDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(EventCategory)
  category!: EventCategory;

  @IsEnum(DayOfWeek)
  dayOfWeek!: DayOfWeek;

  @Matches(timePattern)
  startTime!: string;

  @Matches(timePattern)
  endTime!: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsBoolean()
  recurring?: boolean;

  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @IsOptional()
  @IsString()
  subjectId?: string | null;

  @IsOptional()
  @Matches(datePattern)
  eventDate?: string | null;
}

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(EventCategory)
  category?: EventCategory;

  @IsOptional()
  @IsEnum(DayOfWeek)
  dayOfWeek?: DayOfWeek;

  @IsOptional()
  @Matches(timePattern)
  startTime?: string;

  @IsOptional()
  @Matches(timePattern)
  endTime?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsBoolean()
  recurring?: boolean;

  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @IsOptional()
  @IsString()
  subjectId?: string | null;

  @IsOptional()
  @Matches(datePattern)
  eventDate?: string | null;
}

export class CreateEventExceptionDto {
  @Matches(datePattern)
  date!: string;

  @IsEnum(EventExceptionType)
  type!: EventExceptionType;

  @ValidateIf((value: CreateEventExceptionDto) => value.type === EventExceptionType.OVERRIDDEN)
  @Matches(timePattern)
  replacementStartTime?: string;

  @ValidateIf((value: CreateEventExceptionDto) => value.type === EventExceptionType.OVERRIDDEN)
  @Matches(timePattern)
  replacementEndTime?: string;

  @IsOptional()
  @IsString()
  replacementTitle?: string;
}
