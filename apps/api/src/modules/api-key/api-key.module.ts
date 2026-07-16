import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { ApiKeyController } from "./api-key.controller";
import { V1Controller } from "./v1.controller";
import { ApiKeyService } from "./api-key.service";
import { TenantApiKeyGuard } from "./guards/tenant-api-key.guard";
import { ApiKeyRateLimitService } from "./middleware/api-key-rate-limit";

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
  controllers: [ApiKeyController, V1Controller],
  providers: [
    ApiKeyService,
    TenantApiKeyGuard,
    ApiKeyRateLimitService,
    RedisProvider,
  ],
  exports: [ApiKeyService, TenantApiKeyGuard],
})
export class ApiKeyModule {}
