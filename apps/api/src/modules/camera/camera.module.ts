import { Module } from "@nestjs/common";
import { CameraController } from "./camera.controller";
import { CameraService } from "./camera.service";
import { LicenseModule } from "../license/license.module";

@Module({
  imports: [LicenseModule],
  controllers: [CameraController],
  providers: [CameraService],
  exports: [CameraService],
})
export class CameraModule {}
