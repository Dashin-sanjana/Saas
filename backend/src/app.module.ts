import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import { AvailabilityModule } from "./availability/availability.module";
import { BlockedPeriodsModule } from "./blocked-periods/blocked-periods.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { EventsModule } from "./events/events.module";
import { GoalsModule } from "./goals/goals.module";
import { PreferencesModule } from "./preferences/preferences.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ScheduleModule } from "./schedule/schedule.module";
import { SubjectsModule } from "./subjects/subjects.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 80 }]),
    PrismaModule,
    AuthModule,
    AvailabilityModule,
    BlockedPeriodsModule,
    UsersModule,
    PreferencesModule,
    EventsModule,
    SubjectsModule,
    GoalsModule,
    ScheduleModule,
    DashboardModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule {}
