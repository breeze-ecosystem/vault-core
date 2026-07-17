import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { KioskService } from "./kiosk.service";
import { VisitorService } from "../visitor/visitor.service";
import { Public } from "../../common/decorators/public.decorator";
import { KioskAuthGuard } from "../../common/guards/kiosk-auth.guard";

@Controller("kiosk")
export class KioskController {
  constructor(
    private readonly kioskService: KioskService,
    private readonly visitorService: VisitorService,
  ) {}

  /**
   * Check in a visit via kiosk (API key auth, no human user).
   */
  @Post("check-in/:visitId")
  @Public()
  @UseGuards(KioskAuthGuard)
  async checkIn(@Param("visitId") visitId: string) {
    return this.visitorService.checkIn(visitId, "");
  }

  /**
   * Check out a visit via kiosk (API key auth, no human user).
   */
  @Post("check-out/:visitId")
  @Public()
  @UseGuards(KioskAuthGuard)
  async checkOut(@Param("visitId") visitId: string) {
    return this.visitorService.checkOut(visitId, "");
  }

  /**
   * Search for visits by visitor name.
   */
  @Get("search")
  @Public()
  @UseGuards(KioskAuthGuard)
  async search(@Query("name") name: string) {
    if (!name) {
      return [];
    }
    return this.kioskService.searchVisits(name);
  }

  /**
   * Get a single visit with full details.
   */
  @Get("visits/:id")
  @Public()
  @UseGuards(KioskAuthGuard)
  async getVisit(@Param("id") id: string) {
    return this.visitorService.getVisit(id);
  }

  /**
   * Print a badge for a checked-in visit.
   * Generates ZPL and sends to CUPS printer.
   */
  @Post("print/:visitId")
  @Public()
  @UseGuards(KioskAuthGuard)
  async printBadge(@Param("visitId") visitId: string) {
    await this.kioskService.printBadge(visitId);
    return { success: true, message: "Badge printed" };
  }
}
