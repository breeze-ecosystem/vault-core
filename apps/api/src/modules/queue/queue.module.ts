import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { QueueService } from "./queue.service";

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        connection: {
          host: cfg.get("REDIS_HOST", "localhost"),
          port: cfg.get("REDIS_PORT", 6379),
          password: cfg.get("REDIS_PASSWORD") || undefined,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: "frame-processing" },
      { name: "notification" },
      { name: "access-events" },
      { name: "door-alerts" },
      { name: "video-correlation" },
      { name: "audit-write" },
      { name: "incident-alerts" },
      { name: "anpr-processing" },
      { name: "ai-summaries" },
      { name: "equipment-health" },
      { name: "retention-pruning" },
      { name: "risk-scoring" },
    ),
  ],
  providers: [QueueService],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
