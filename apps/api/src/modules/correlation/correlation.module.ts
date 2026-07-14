import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import Redis from "ioredis";
import { CorrelationController } from "./correlation.controller";
import { CorrelationService } from "./correlation.service";
import { CorrelationProcessor } from "./correlation.processor";
import { TailgatingProcessor } from "./tailgating.processor";
import { IngestionModule } from "../ingestion/ingestion.module";
import { AlertModule } from "../alert/alert.module";

const RedisProvider = {
  provide: "REDIS",
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
    BullModule.registerQueue({ name: "video-correlation" }),
    BullModule.registerQueue({ name: "tailgating-detection" }),
    IngestionModule,
    AlertModule,
  ],
  controllers: [CorrelationController],
  providers: [
    CorrelationService,
    CorrelationProcessor,
    TailgatingProcessor,
    RedisProvider,
  ],
  exports: [CorrelationService],
})
export class CorrelationModule {}
