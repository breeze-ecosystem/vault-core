import { Module } from "@nestjs/common";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";
import { InviteModule } from "../organization/invite/invite.module";
import { ModemModule } from "../modem/modem.module";

@Module({
  imports: [InviteModule, ModemModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
