import { Module } from "@nestjs/common";
import { ControllerController } from "./controller.controller";
import { ControllerService } from "./controller.service";

@Module({
  controllers: [ControllerController],
  providers: [ControllerService],
  exports: [ControllerService],
})
export class ControllerModule {}
