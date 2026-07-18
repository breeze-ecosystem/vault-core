import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import Redis from "ioredis";
import { BastionController } from "./bastion.controller";
import { BastionService } from "./bastion.service";
import { FaceController } from "./face/face.controller";
import { FaceService } from "./face/face.service";
import { FaceProcessor } from "./face/face.processor";

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
    BullModule.registerQueue({ name: "bastion-events" }),
  ],
  controllers: [BastionController, FaceController],
  providers: [
    BastionService,
    FaceService,
    FaceProcessor,
    RedisProvider,
  ],
  exports: [BastionService, FaceService],
})
export class BastionModule {}
