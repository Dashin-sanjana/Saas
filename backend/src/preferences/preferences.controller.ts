import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../common/types/authenticated-user";
import { UpsertPreferenceDto } from "./dto";
import { PreferencesService } from "./preferences.service";

@UseGuards(JwtAuthGuard)
@Controller("preferences")
export class PreferencesController {
  constructor(private readonly preferences: PreferencesService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.preferences.get(user.id);
  }

  @Put()
  upsert(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertPreferenceDto) {
    return this.preferences.upsert(user.id, dto);
  }
}
