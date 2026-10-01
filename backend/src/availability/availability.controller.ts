import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../common/types/authenticated-user";
import { WeekDto } from "../schedule/dto/schedule.dto";
import { AvailabilityService } from "./availability.service";

@UseGuards(JwtAuthGuard)
@Controller("availability")
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get("week")
  week(@CurrentUser() user: AuthenticatedUser, @Query() query: WeekDto) { return this.availability.week(user.id, query.weekStart); }
}
