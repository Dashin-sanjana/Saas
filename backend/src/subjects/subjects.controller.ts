import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../common/types/authenticated-user";
import { CreateSubjectDto, UpdateSubjectDto } from "./dto";
import { SubjectsService } from "./subjects.service";

@UseGuards(JwtAuthGuard)
@Controller("subjects")
export class SubjectsController {
  constructor(private readonly subjects: SubjectsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.subjects.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSubjectDto) {
    return this.subjects.create(user.id, dto);
  }

  @Get(":id")
  get(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.subjects.get(user.id, id);
  }

  @Patch(":id")
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateSubjectDto) {
    return this.subjects.update(user.id, id, dto);
  }

  @Delete(":id")
  delete(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.subjects.delete(user.id, id);
  }
}
