import { IsBoolean, IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";

export class CreateSubjectDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsInt()
  @Min(5)
  @Max(480)
  revisionMinutes!: number;

  @IsOptional()
  @IsString()
  colorKey?: string;
}

export class UpdateSubjectDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(480)
  revisionMinutes?: number;

  @IsOptional()
  @IsString()
  colorKey?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
