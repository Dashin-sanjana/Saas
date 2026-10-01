import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../common/types/authenticated-user";
import { CreateEventDto, CreateEventExceptionDto, UpdateEventDto } from "./dto";
import { WeekDto } from "../schedule/dto/schedule.dto";
import { Query } from "@nestjs/common";
import { EventsService } from "./events.service";

@UseGuards(JwtAuthGuard)
@Controller("events")
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.events.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateEventDto) {
    return this.events.create(user.id, dto);
  }

  @Get("occurrences/week")
  occurrences(@CurrentUser() user: AuthenticatedUser, @Query() query: WeekDto) {
    return this.events.occurrences(user.id, query.weekStart);
  }

  @Get(":id/exceptions")
  listExceptions(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.events.listExceptions(user.id, id);
  }

  @Post(":id/exceptions")
  createException(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: CreateEventExceptionDto) {
    return this.events.createException(user.id, id, dto);
  }

  @Delete(":id/exceptions/:exceptionId")
  deleteException(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Param("exceptionId") exceptionId: string) {
    return this.events.deleteException(user.id, id, exceptionId);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.events.get(user.id, id);
  }

  @Patch(":id")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateEventDto) {
    return this.events.update(user.id, id, dto);
  }

  @Delete(":id")
  delete(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.events.delete(user.id, id);
  }
}
