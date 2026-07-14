import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AccessService {
  private readonly logger = new Logger(AccessService.name);

  constructor(private prisma: PrismaService) {}
}
