import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import Redis from "ioredis";
import { DoorController } from "./door.controller";
import { DoorService } from "./door.service";
import { DoorGateway } from "./door.gateway";
import { DoorProcessor } from "./door.processor";
import { AlertModule } from "../alert/alert.module";
import { LicenseModule } from "../license/license.module";

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
    BullModule.registerQueue({ name: "door-alerts" }),
    AlertModule,
    LicenseModule,
  ],
  controllers: [DoorController],
  providers: [
    DoorService,
    DoorGateway,
    DoorProcessor,
    RedisProvider,
  ],
  exports: [DoorService],
})
export class DoorModule {}
