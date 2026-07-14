import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { MaintenanceController } from "./maintenance.controller";
import { MaintenanceService } from "./maintenance.service";
import { IncidentStateMachine } from "../incident/incident-state-machine";

@Module({
  imports: [
    BullModule.registerQueue({ name: "incident-alerts" }),
  ],
  controllers: [MaintenanceController],
  providers: [MaintenanceService, IncidentStateMachine],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
