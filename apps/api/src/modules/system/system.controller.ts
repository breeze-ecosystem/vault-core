import { Controller, Get } from "@nestjs/common";
import { Public } from "../../common/decorators/public.decorator";
import { SystemService } from "./system.service";

@Controller("system")
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Public()
  @Get("check-update")
  async checkUpdate() {
    return this.systemService.getLatestUpdate();
  }
}
