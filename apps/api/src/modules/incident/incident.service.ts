import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class IncidentService {
  private readonly logger = new Logger(IncidentService.name);

  constructor(private prisma: PrismaService) {}
}
