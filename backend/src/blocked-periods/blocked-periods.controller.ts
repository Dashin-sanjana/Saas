import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../common/types/authenticated-user";
import { BlockedPeriodsService } from "./blocked-periods.service";
import { CreateBlockedPeriodDto, UpdateBlockedPeriodDto } from "./dto";

@UseGuards(JwtAuthGuard)
@Controller("blocked-periods")
export class BlockedPeriodsController {
  constructor(private readonly periods: BlockedPeriodsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query("weekStart") weekStart?: string) { return this.periods.list(user.id, weekStart); }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBlockedPeriodDto) { return this.periods.create(user.id, dto); }

  @Patch(":id")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateBlockedPeriodDto) { return this.periods.update(user.id, id, dto); }

  @Delete(":id")
  delete(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) { return this.periods.delete(user.id, id); }
}
