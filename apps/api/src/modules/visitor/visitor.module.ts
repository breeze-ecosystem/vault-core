import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { VisitorController } from "./visitor.controller";
import { VisitorService } from "./visitor.service";
import { VisitorGateway } from "./visitor.gateway";
import { AccessModule } from "../access/access.module";

const RedisProvider = {
  provide: "REDIS_VISITOR",
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
  imports: [AccessModule],
  controllers: [VisitorController],
  providers: [VisitorService, VisitorGateway, RedisProvider],
  exports: [VisitorService],
})
export class VisitorModule {}
