import { Module } from "@nestjs/common";
import { KioskController } from "./kiosk.controller";
import { KioskService } from "./kiosk.service";
import { PrismaModule } from "../prisma/prisma.module";
import { VisitorModule } from "../visitor/visitor.module";

@Module({
  imports: [PrismaModule, VisitorModule],
  controllers: [KioskController],
  providers: [KioskService],
  exports: [KioskService],
})
export class KioskModule {}
