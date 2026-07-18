import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { Prisma } from "@prisma/client";

@Injectable()
export class DetectionService {
  constructor(private prisma: PrismaService) {}

  async findZonesByCamera(cameraId: string) {
    const camera = await this.prisma.camera.findUnique({ where: { id: cameraId } });
    if (!camera) throw new NotFoundException("Caméra non trouvée");

    return this.prisma.detectionZone.findMany({
      where: { cameraId },
      orderBy: { createdAt: "desc" },
    });
  }

  async createZone(cameraId: string, data: { name: string; polygon: number[][]; isActive?: boolean; sensitivity?: number }) {
    const camera = await this.prisma.camera.findUnique({ where: { id: cameraId } });
    if (!camera) throw new NotFoundException("Caméra non trouvée");

    return this.prisma.detectionZone.create({
      data: {
        cameraId,
        name: data.name,
        polygon: data.polygon as any,
        isActive: data.isActive ?? true,
        sensitivity: data.sensitivity,
      },
    });
  }

  async updateZone(zoneId: string, data: { name?: string; polygon?: number[][]; isActive?: boolean; sensitivity?: number }) {
    const zone = await this.prisma.detectionZone.findUnique({ where: { id: zoneId } });
    if (!zone) throw new NotFoundException("Zone de détection non trouvée");

    const updateData: Prisma.DetectionZoneUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.polygon !== undefined) updateData.polygon = data.polygon as any;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.sensitivity !== undefined) updateData.sensitivity = data.sensitivity;

    return this.prisma.detectionZone.update({
      where: { id: zoneId },
      data: updateData,
    });
  }

  async deleteZone(zoneId: string) {
    const zone = await this.prisma.detectionZone.findUnique({ where: { id: zoneId } });
    if (!zone) throw new NotFoundException("Zone de détection non trouvée");

    await this.prisma.detectionZone.delete({ where: { id: zoneId } });
  }

  async getDetectionConfig(cameraId: string) {
    const camera = await this.prisma.camera.findUnique({
      where: { id: cameraId },
      include: { detectionZones: true },
    });
    if (!camera) throw new NotFoundException("Caméra non trouvée");

    const faceRecognitionFlag = await this.prisma.featureFlag.findUnique({
      where: {
        organizationId_key: {
          organizationId: camera.organizationId,
          key: "vision_face_whitelist",
        },
      },
    });

    const zones = camera.detectionZones
      .filter((z) => z.isActive)
      .map((z) => ({
        id: z.id,
        name: z.name,
        polygon: z.polygon as number[][],
        sensitivity: z.sensitivity,
      }));

    return {
      confidence: camera.detectionConfidence ?? 0.5,
      zones,
      faceRecognitionEnabled: faceRecognitionFlag?.enabled ?? false,
    };
  }
}
