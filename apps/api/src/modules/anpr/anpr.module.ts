import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import Redis from "ioredis";
import { AnprController } from "./anpr.controller";
import { AnprService } from "./anpr.service";
import { AnprProcessor } from "./anpr.processor";

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
    BullModule.registerQueue({ name: "anpr-processing" }),
  ],
  controllers: [AnprController],
  providers: [AnprService, AnprProcessor, RedisProvider],
  exports: [AnprService],
})
export class AnprModule {}
