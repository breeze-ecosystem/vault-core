import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class VisitorService {
  private readonly logger = new Logger(VisitorService.name);
}
