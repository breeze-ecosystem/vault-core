import { Controller } from "@nestjs/common";
import { AccessService } from "./access.service";

@Controller("access")
export class AccessController {
  constructor(private accessService: AccessService) {}
}
