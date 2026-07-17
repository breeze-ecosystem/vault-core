import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { EventEmitter2, OnEvent } from "@nestjs/event-emitter";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ControllerService {
  private readonly logger = new Logger(ControllerService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async findAll(orgId: string) {
    return this.prisma.controller.findMany({
      where: { organizationId: orgId },
      include: { doors: { select: { id: true, name: true } } },
      orderBy: { lastSeen: "desc" },
    });
  }

  async enroll(id: string, data: { name: string; siteId: string; zoneId?: string }) {
    const ctrl = await this.prisma.controller.findUnique({ where: { id } });
    if (!ctrl) throw new NotFoundException("Controller not found");
    return this.prisma.controller.update({
      where: { id },
      data: { name: data.name, siteId: data.siteId, status: "ONLINE" },
    });
  }

  // Handle mqtt.controller.discovery events — upsert discovered controller
  @OnEvent("mqtt.controller.discovery", { async: true })
  async handleControllerDiscovery(payload: { topic: string; message: any }) {
    const { topic, message } = payload;
    const topicParts = topic.split("/");
    if (topicParts.length < 5) return;
    const orgId = topicParts[1];
    const controllerId = topicParts[3];

    try {
      // Upsert: create PENDING if new, update info if existing
      await this.prisma.controller.upsert({
        where: { id: controllerId },
        create: {
          id: controllerId,
          serialNumber: message.serial_number,
          manufacturer: message.manufacturer,
          model: message.model,
          organizationId: orgId,
          status: "PENDING",
        },
        update: {
          serialNumber: message.serial_number,
          manufacturer: message.manufacturer,
          model: message.model,
          lastSeen: new Date(),
        },
      });

      // Emit Socket.IO event for live Dashboard update
      this.eventEmitter.emit("controller.discovery", {
        controllerId,
        serialNumber: message.serial_number,
        manufacturer: message.manufacturer,
        model: message.model,
      });
    } catch (err: any) {
      this.logger.error(`Failed to handle controller discovery for ${controllerId}: ${err.message}`);
    }
  }
}
