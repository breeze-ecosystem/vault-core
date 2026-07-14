import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { IncidentController } from "./incident.controller";
import { IncidentService } from "./incident.service";
import { IncidentGateway } from "./incident.gateway";
import { IncidentProcessor } from "./incident.processor";

@Module({
  imports: [
    BullModule.registerQueue({ name: "incident-alerts" }),
  ],
  controllers: [IncidentController],
  providers: [
    IncidentService,
    IncidentGateway,
    IncidentProcessor,
  ],
  exports: [IncidentService],
})
export class IncidentModule {}
