import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { ShareService } from "./share.service";
import { ShareController } from "./share.controller";

@Module({
  imports: [JwtModule.register({})],
  controllers: [ShareController],
  providers: [ShareService],
  exports: [ShareService],
})
export class ShareModule {}
