import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../common/types/authenticated-user";
import { CommitScheduleDto, CompleteScheduleBlockDto, CreateScheduleBlockDto, LockScheduleBlockDto, UpdateScheduleBlockDto, ValidateMoveDto, WeekDto } from "./dto/schedule.dto";
import { ScheduleService } from "./schedule.service";

@UseGuards(JwtAuthGuard)
@Controller("schedule")
export class ScheduleController {
  constructor(private readonly schedule: ScheduleService) {}

  @Get("week")
  week(@CurrentUser() user: AuthenticatedUser, @Query() query: WeekDto) {
    return this.schedule.week(user.id, query.weekStart);
  }

  @Post("generate-preview")
  generatePreview(@CurrentUser() user: AuthenticatedUser, @Body() dto: WeekDto) {
    return this.schedule.generatePreview(user.id, dto.weekStart);
  }

  @Post("commit")
  commit(@CurrentUser() user: AuthenticatedUser, @Body() dto: CommitScheduleDto) {
    return this.schedule.commit(user.id, dto);
  }

  @Post("blocks")
  createBlock(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateScheduleBlockDto) {
    return this.schedule.createBlock(user.id, dto);
  }

  @Post("validate-move")
  validateMove(@CurrentUser() user: AuthenticatedUser, @Body() dto: ValidateMoveDto) {
    return this.schedule.validateMove(user.id, dto);
  }

  @Patch("blocks/:id/lock")
  lockBlock(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: LockScheduleBlockDto) {
    return this.schedule.lockBlock(user.id, id, dto.locked);
  }

  @Patch("blocks/:id/completed")
  completeBlock(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: CompleteScheduleBlockDto) {
    return this.schedule.completeBlock(user.id, id, dto.completed);
  }

  @Get("versions")
  versions(@CurrentUser() user: AuthenticatedUser, @Query() query: WeekDto) {
    return this.schedule.versions(user.id, query.weekStart);
  }

  @Get("versions/:id")
  version(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.schedule.version(user.id, id);
  }

  @Post("versions/:id/restore")
  restoreVersion(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.schedule.restoreVersion(user.id, id);
  }

  @Patch("blocks/:id")
  updateBlock(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateScheduleBlockDto) {
    return this.schedule.updateBlock(user.id, id, dto);
  }

  @Delete("blocks/:id")
  deleteBlock(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.schedule.deleteBlock(user.id, id);
  }
}
