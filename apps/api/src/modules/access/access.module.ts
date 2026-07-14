import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { AccessController } from "./access.controller";
import { AccessService } from "./access.service";

@Module({
  imports: [
    BullModule.registerQueue({ name: "access-events" }),
  ],
  controllers: [AccessController],
  providers: [AccessService],
  exports: [AccessService],
})
export class AccessModule {}
