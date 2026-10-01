import { Module } from "@nestjs/common";
import { BlockedPeriodsController } from "./blocked-periods.controller";
import { BlockedPeriodsService } from "./blocked-periods.service";

@Module({ controllers: [BlockedPeriodsController], providers: [BlockedPeriodsService], exports: [BlockedPeriodsService] })
export class BlockedPeriodsModule {}
