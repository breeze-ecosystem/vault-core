import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import Redis from "ioredis";
import { PatternsController } from "./patterns.controller";
import { PatternsService } from "./patterns.service";
import { PatternsProcessor } from "./patterns.processor";

const RedisProvider = {
  provide: "REDIS_PATTERNS",
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
    BullModule.registerQueue({ name: "recurring-patterns" }),
  ],
  controllers: [PatternsController],
  providers: [PatternsService, PatternsProcessor, RedisProvider],
  exports: [PatternsService],
})
export class PatternsModule {}
