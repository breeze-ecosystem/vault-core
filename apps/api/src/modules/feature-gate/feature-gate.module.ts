import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { FeatureGateService } from "./feature-gate.service";

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
  providers: [FeatureGateService, RedisProvider],
  exports: [FeatureGateService, RedisProvider],
})
export class FeatureGateModule {}
