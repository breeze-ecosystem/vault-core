import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma, AlertSeverity } from "@prisma/client";
import { LicenseService } from "../license/license.service";

@Injectable()
export class CameraService {
  constructor(
    private prisma: PrismaService,
    private licenseService: LicenseService,
  ) {}

  async findAll(filters?: { status?: string; organizationId?: string; page?: number; limit?: number }) {
    const where: Prisma.CameraWhereInput = {};
    if (filters?.status) where.status = filters.status as Prisma.EnumCameraStatusFilter;
    if (filters?.organizationId) where.organizationId = filters.organizationId;

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.camera.findMany({
        where,
        skip,
        take: limit,
        include: {
          organization: { select: { id: true, name: true } },
          prompts: { where: { isActive: true }, orderBy: { createdAt: "desc" } },
          _count: { select: { alerts: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.camera.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    const camera = await this.prisma.camera.findUnique({
      where: { id },
      include: {
        organization: { select: { id: true, name: true } },
        prompts: { orderBy: { createdAt: "desc" } },
        alerts: { take: 10, orderBy: { createdAt: "desc" } },
      },
    });
    if (!camera) throw new NotFoundException("Camera not found");
    return camera;
  }

  async create(data: Prisma.CameraUncheckedCreateInput) {
    // Check license limits before creating (D-14, D-15 double barrier)
    const orgId = data.organizationId;
    const licenseStatus = await this.licenseService.getLicenseStatus(orgId);

    // Expired or no license blocks creation
    if (licenseStatus.licenseState === "expired" || licenseStatus.licenseState === "no_license") {
      throw new BadRequestException(
        "Licence expirée — Impossible de créer des caméras. Contactez votre administrateur.",
      );
    }

    // Trial is unlimited per D-17
    if (licenseStatus.licenseState === "trial") {
      return this.prisma.camera.create({
        data,
        include: { organization: { select: { id: true, name: true } } },
      });
    }

    // Active or grace: check against maxCameras limit
    if (licenseStatus.maxCameras !== undefined && licenseStatus.maxCameras !== null) {
      const cameraCount = await this.prisma.camera.count({
        where: { organizationId: orgId },
      });

      if (cameraCount >= licenseStatus.maxCameras) {
        throw new BadRequestException(
          `Limite de caméras atteinte (${licenseStatus.maxCameras}). Contactez votre administrateur pour augmenter votre limite.`,
        );
      }
    }

    return this.prisma.camera.create({
      data,
      include: { organization: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, data: Prisma.CameraUpdateInput) {
    await this.findById(id);
    return this.prisma.camera.update({
      where: { id },
      data,
      include: { organization: { select: { id: true, name: true } } },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.camera.delete({ where: { id } });
  }

  // ── Prompt management ──

  async getPrompts(cameraId: string) {
    const camera = await this.prisma.camera.findUnique({ where: { id: cameraId } });
    if (!camera) throw new NotFoundException("Camera not found");
    return this.prisma.cameraPrompt.findMany({
      where: { cameraId },
      orderBy: { createdAt: "desc" },
    });
  }

  async addPrompt(cameraId: string, data: { text: string; severity?: AlertSeverity }) {
    const camera = await this.prisma.camera.findUnique({ where: { id: cameraId } });
    if (!camera) throw new NotFoundException("Camera not found");
    return this.prisma.cameraPrompt.create({
      data: {
        cameraId,
        text: data.text,
        severity: data.severity || "MEDIUM",
        organizationId: camera.organizationId,
      },
    });
  }

  async updatePrompt(
    promptId: string,
    data: { text?: string; severity?: AlertSeverity; isActive?: boolean },
  ) {
    const prompt = await this.prisma.cameraPrompt.findUnique({ where: { id: promptId } });
    if (!prompt) throw new NotFoundException("Prompt not found");
    const updateData: Prisma.CameraPromptUpdateInput = {};
    if (data.text !== undefined) updateData.text = data.text;
    if (data.severity !== undefined) updateData.severity = data.severity;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    return this.prisma.cameraPrompt.update({
      where: { id: promptId },
      data: updateData,
    });
  }

  async deletePrompt(promptId: string) {
    const prompt = await this.prisma.cameraPrompt.findUnique({ where: { id: promptId } });
    if (!prompt) throw new NotFoundException("Prompt not found");
    return this.prisma.cameraPrompt.delete({ where: { id: promptId } });
  }
}
