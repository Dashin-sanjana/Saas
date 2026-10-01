import { IsBoolean, IsOptional, IsString, Matches, MinLength, ValidateIf } from "class-validator";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreateBlockedPeriodDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @Matches(datePattern)
  date!: string;

  @IsBoolean()
  fullDay!: boolean;

  @ValidateIf((value: CreateBlockedPeriodDto) => !value.fullDay)
  @Matches(timePattern)
  startTime?: string;

  @ValidateIf((value: CreateBlockedPeriodDto) => !value.fullDay)
  @Matches(timePattern)
  endTime?: string;
}

export class UpdateBlockedPeriodDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  title?: string;

  @IsOptional()
  @Matches(datePattern)
  date?: string;

  @IsOptional()
  @IsBoolean()
  fullDay?: boolean;

  @IsOptional()
  @Matches(timePattern)
  startTime?: string | null;

  @IsOptional()
  @Matches(timePattern)
  endTime?: string | null;
}
