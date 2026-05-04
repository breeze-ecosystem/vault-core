import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CameraService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: { status?: string; siteId?: string }) {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.siteId) where.siteId = filters.siteId;

    const [data, total] = await Promise.all([
      this.prisma.camera.findMany({
        where,
        include: {
          site: { select: { id: true, name: true } },
          prompts: { where: { isActive: true }, orderBy: { createdAt: "desc" } },
          _count: { select: { alerts: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.camera.count({ where }),
    ]);

    return { data, total };
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

  async create(data: any) {
    return this.prisma.camera.create({
      data,
      include: { site: { select: { id: true, name: true } } },
    });
  }

  async update(id: string, data: any) {
    await this.findById(id);
    return this.prisma.camera.update({
      where: { id },
      data,
      include: { site: { select: { id: true, name: true } } },
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

  async addPrompt(cameraId: string, data: { text: string; severity?: string }) {
    const camera = await this.prisma.camera.findUnique({ where: { id: cameraId } });
    if (!camera) throw new NotFoundException("Camera not found");
    return this.prisma.cameraPrompt.create({
      data: {
        cameraId,
        text: data.text,
        severity: (data.severity as any) || "MEDIUM",
      },
    });
  }

  async updatePrompt(promptId: string, data: { text?: string; severity?: string; isActive?: boolean }) {
    const prompt = await this.prisma.cameraPrompt.findUnique({ where: { id: promptId } });
    if (!prompt) throw new NotFoundException("Prompt not found");
    const updateData: any = {};
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
