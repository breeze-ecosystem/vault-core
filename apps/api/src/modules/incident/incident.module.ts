import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import Redis from "ioredis";
import { IncidentController } from "./incident.controller";
import { IncidentService } from "./incident.service";
import { IncidentGateway } from "./incident.gateway";
import { IncidentProcessor } from "./incident.processor";

const RedisProvider = {
  provide: "REDIS_INCIDENT",
  useFactory: (cfg: ConfigService) => {
    return new Redis({
      host: cfg.get("redis.host", "localhost"),
      port: cfg.get("redis.port", 6379),
      password: cfg.get("redis.password") || undefined,
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  },
  inject: [ConfigService],
};

@Module({
  imports: [
    BullModule.registerQueue({ name: "incident-alerts" }),
  ],
  controllers: [IncidentController],
  providers: [
    IncidentService,
    IncidentGateway,
    IncidentProcessor,
    RedisProvider,
  ],
  exports: [IncidentService],
})
export class IncidentModule {}
