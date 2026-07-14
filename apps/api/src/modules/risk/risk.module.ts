import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import Redis from "ioredis";
import { RiskController } from "./risk.controller";
import { RiskService } from "./risk.service";
import { RiskGateway } from "./risk.gateway";

const RedisProvider = {
  provide: "REDIS_RISK",
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
    BullModule.registerQueue({ name: "risk-scoring" }),
  ],
  controllers: [RiskController],
  providers: [RiskService, RiskGateway, RedisProvider],
  exports: [RiskService],
})
export class RiskModule {}
