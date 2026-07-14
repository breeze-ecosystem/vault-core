import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import Redis from "ioredis";
import { AccessController } from "./access.controller";
import { AccessService } from "./access.service";
import { AccessGateway } from "./access.gateway";
import { AccessProcessor } from "./access.processor";

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
    BullModule.registerQueue({ name: "access-events" }),
  ],
  controllers: [AccessController],
  providers: [
    AccessService,
    AccessGateway,
    AccessProcessor,
    RedisProvider,
  ],
  exports: [AccessService],
})
export class AccessModule {}
