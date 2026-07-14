import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import Redis from "ioredis";
import { EquipmentController } from "./equipment.controller";
import { EquipmentService } from "./equipment.service";
import { EquipmentPredictor } from "./equipment.predictor";

const RedisProvider = {
  provide: "REDIS_EQUIPMENT",
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
    BullModule.registerQueue(
      { name: "equipment-health" },
      { name: "predictive-health" },
    ),
  ],
  controllers: [EquipmentController],
  providers: [EquipmentService, EquipmentPredictor, RedisProvider],
  exports: [EquipmentService, EquipmentPredictor],
})
export class EquipmentModule {}
