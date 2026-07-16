import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { InviteController } from "./invite.controller";
import { InviteService } from "./invite.service";

@Module({
  imports: [JwtModule.register({})],
  controllers: [InviteController],
  providers: [InviteService],
  exports: [InviteService],
})
export class InviteModule {}
