import { Module } from "@nestjs/common";
import { ScheduleController } from "./schedule.controller";
import { ScheduleService } from "./schedule.service";
import { SchedulerEngine } from "./scheduler.engine";

@Module({
  controllers: [ScheduleController],
  providers: [ScheduleService, SchedulerEngine]
})
export class ScheduleModule {}
