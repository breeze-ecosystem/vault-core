import { Controller } from "@nestjs/common";
import { IncidentService } from "./incident.service";

@Controller("incidents")
export class IncidentController {
  constructor(private readonly incidentService: IncidentService) {}
}
