import { Module, forwardRef } from "@nestjs/common";
import { AuthModule } from "../../auth/auth.module";
import { InviteController } from "./invite.controller";
import { InviteService } from "./invite.service";

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [InviteController],
  providers: [InviteService],
  exports: [InviteService],
})
export class InviteModule {}
