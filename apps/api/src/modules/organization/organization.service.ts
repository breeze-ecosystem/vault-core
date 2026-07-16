import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

@Injectable()
export class OrganizationService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters?: { isActive?: boolean; city?: string; page?: number; limit?: number }) {
    const where: Prisma.OrganizationWhereInput = {};
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;
    if (filters?.city) where.city = { contains: filters.city, mode: "insensitive" };

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.organization.findMany({
        where,
        skip,
        take: limit,
        include: { _count: { select: { members: true } } },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.organization.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findById(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    });
    if (!organization) throw new NotFoundException("Organization not found");
    return organization;
  }

  async create(data: Prisma.OrganizationCreateInput) {
    return this.prisma.organization.create({ data });
  }

  async update(id: string, data: Prisma.OrganizationUpdateInput) {
    await this.findById(id);
    return this.prisma.organization.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.organization.update({ where: { id }, data: { isActive: false } });
  }

  // ─── White-label Branding ─────────────────────────────────────────────────────

  /**
   * Update white-label branding settings for an organization (D-22).
   * Validates primaryColor as hex color (#RRGGBB).
   * Validates logoUrl as valid URL if provided.
   * Gated behind custom_branding feature flag (decorator on controller).
   */
  async updateBranding(
    orgId: string,
    data: { logoUrl?: string; primaryColor?: string; displayName?: string },
  ) {
    await this.findById(orgId);

    // Validate primaryColor as hex color if provided
    if (data.primaryColor) {
      this.validateHexColor(data.primaryColor);
    }

    // Validate logoUrl if provided
    if (data.logoUrl) {
      this.validateUrl(data.logoUrl);
    }

    return this.prisma.organization.update({
      where: { id: orgId },
      data: {
        ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl } : {}),
        ...(data.primaryColor !== undefined ? { primaryColor: data.primaryColor } : {}),
        ...(data.displayName !== undefined ? { displayName: data.displayName } : {}),
      },
    });
  }

  /**
   * Get current branding settings for an organization.
   * Returns the fields needed by the dashboard to apply white-label styling.
   */
  async getBranding(orgId: string) {
    const org = await this.findById(orgId);
    return {
      logoUrl: org.logoUrl || null,
      primaryColor: org.primaryColor || null,
      displayName: org.displayName || null,
      name: org.name,
    };
  }

  /**
   * Validate hex color string (#RRGGBB format).
   */
  private validateHexColor(color: string): void {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!hexRegex.test(color)) {
      throw new BadRequestException(
        "Couleur primaire invalide. Utilisez le format hexadécimal (#RRGGBB).",
      );
    }
  }

  /**
   * Validate URL (must be HTTP or HTTPS).
   */
  private validateUrl(url: string): void {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("Invalid protocol");
      }
    } catch {
      throw new BadRequestException(
        "URL du logo invalide. L'URL doit commencer par http:// ou https://.",
      );
    }
  }
}
