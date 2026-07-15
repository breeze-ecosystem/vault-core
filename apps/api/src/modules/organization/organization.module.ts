import { Module } from "@nestjs/common";
import { OrganizationController } from "./organization.controller";
import { OrganizationService } from "./organization.service";
import { InviteModule } from "./invite/invite.module";

@Module({
  imports: [InviteModule],
  controllers: [OrganizationController],
  providers: [OrganizationService],
  exports: [OrganizationService, InviteModule],
})
export class OrganizationModule {}
