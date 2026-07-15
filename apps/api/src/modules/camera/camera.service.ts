import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma, AlertSeverity } from "@prisma/client";

@Injectable()
export class CameraService {
  constructor(private prisma: PrismaService) {}

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
          site: { select: { id: true, name: true } },
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
        site: { select: { id: true, name: true } },
        prompts: { orderBy: { createdAt: "desc" } },
        alerts: { take: 10, orderBy: { createdAt: "desc" } },
      },
    });
    if (!camera) throw new NotFoundException("Camera not found");
    return camera;
  }

  async create(data: Prisma.CameraCreateInput) {
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
