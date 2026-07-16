import {
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { ROLE_HIERARCHY } from "@repo/shared";

export interface FindOrCreateSsoUserParams {
  orgId: string;
  externalId: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export interface SsoUserResult {
  id: string;
  email: string;
  orgId: string;
  role: string;
}

@Injectable()
export class SsoService {
  private readonly logger = new Logger(SsoService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  /**
   * Fetch IdP config for an organization.
   * Returns null if not configured.
   */
  async getConfig(orgId: string) {
    return this.prisma.idpConfig.findUnique({
      where: { organizationId: orgId },
    });
  }

  /**
   * Create or update IdP configuration for an organization.
   * If clientSecret is provided, encrypts it via pgp_sym_encrypt.
   */
  async createOrUpdateConfig(
    orgId: string,
    dto: {
      protocol: string;
      metadataUrl?: string;
      entityId?: string;
      certificate?: string;
      attributeMappings?: Record<string, string>;
      isActive?: boolean;
      ssoEnforced?: boolean;
      clientId?: string;
      clientSecret?: string;
      issuerUrl?: string;
      entryPoint?: string;
    },
  ) {
    const existing = await this.prisma.idpConfig.findUnique({
      where: { organizationId: orgId },
    });

    const data: any = {
      protocol: dto.protocol,
      metadataUrl: dto.metadataUrl ?? existing?.metadataUrl,
      entityId: dto.entityId ?? existing?.entityId,
      certificate: dto.certificate ?? existing?.certificate,
      attributeMappings: dto.attributeMappings
        ? dto.attributeMappings
        : existing?.attributeMappings,
      isActive: dto.isActive ?? existing?.isActive ?? true,
      ssoEnforced: dto.ssoEnforced ?? existing?.ssoEnforced ?? false,
      clientId: dto.clientId ?? existing?.clientId,
      issuerUrl: dto.issuerUrl ?? existing?.issuerUrl,
      entryPoint: dto.entryPoint ?? (existing as any)?.entryPoint,
    };

    // Encrypt clientSecret if provided
    if (dto.clientSecret) {
      const encryptionKey = this.config.get<string>("encryption.key", "");
      if (encryptionKey) {
        const result: any[] = await this.prisma.$queryRawUnsafe(
          "SELECT pgp_sym_encrypt($1, $2) as encrypted",
          dto.clientSecret,
          encryptionKey,
        );
        data.clientSecret = result[0]?.encrypted || dto.clientSecret;
      } else {
        data.clientSecret = dto.clientSecret;
      }
    }

    if (existing) {
      return this.prisma.idpConfig.update({
        where: { organizationId: orgId },
        data,
      });
    }

    return this.prisma.idpConfig.create({
      data: {
        ...data,
        organizationId: orgId,
      } as any,
    });
  }

  /**
   * Just-in-time provisioning: find SSO user by email or create.
   * Validates role from IdP attribute mapping against ROLE_HIERARCHY.
   * Defaults to "OPERATOR" if role is missing or unrecognized (D-02).
   */
  async findOrCreateSsoUser(
    params: FindOrCreateSsoUserParams,
  ): Promise<SsoUserResult> {
    const { orgId, externalId, email, firstName, lastName, role } = params;

    // Try to find existing user by email in this org
    if (email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true },
      });

      if (existingUser) {
        // Check if they're a member of this org
        const membership = await this.prisma.organizationMember.findUnique({
          where: {
            userId_organizationId: {
              userId: existingUser.id,
              organizationId: orgId,
            },
          },
          select: { role: true, isActive: true },
        });

        if (membership && membership.isActive) {
          this.logger.log(`SSO user found: ${email} in org ${orgId}`);
          return {
            id: existingUser.id,
            email: existingUser.email,
            orgId,
            role: membership.role,
          };
        }
      }
    }

    // JIT provisioning: create User + OrganizationMember in a $transaction
    // Resolve role from IdP attribute mapping or default to OPERATOR
    const resolvedRole = this.resolveRole(role);

    this.logger.log(
      `JIT provisioning user: ${email || externalId} in org ${orgId} with role ${resolvedRole}`,
    );

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        let user: { id: string; email: string };

        if (email) {
          user = await tx.user.upsert({
            where: { email },
            update: { firstName, lastName } as any,
            create: {
              email,
              firstName: firstName || "SSO",
              lastName: lastName || "User",
              isActive: true,
            } as any,
            select: { id: true, email: true },
          });
        } else {
          // No email — create with externalId as identifier
          user = await tx.user.create({
            data: {
              email: `${externalId}@sso.local`,
              firstName: firstName || externalId,
              lastName: lastName || "SSO User",
              isActive: true,
            } as any,
            select: { id: true, email: true },
          });
        }

        await tx.organizationMember.create({
          data: {
            userId: user.id,
            organizationId: orgId,
            role: resolvedRole as any,
          },
        });

        return { user };
      });

      return {
        id: result.user.id,
        email: result.user.email,
        orgId,
        role: resolvedRole,
      };
    } catch (err: any) {
      this.logger.error(
        `JIT provisioning failed for ${email || externalId}: ${err.message}`,
      );
      throw err;
    }
  }

  /**
   * Validate role against ROLE_HIERARCHY.
   * Returns the role if valid, or "OPERATOR" as default (D-02).
   */
  private resolveRole(role?: string): string {
    if (!role) return "OPERATOR";

    const validRole = role.toUpperCase();
    const roleKeys = Object.keys(ROLE_HIERARCHY);
    if (roleKeys.includes(validRole)) {
      return validRole;
    }

    this.logger.warn(`Unrecognized role "${role}" from IdP — defaulting to OPERATOR`);
    return "OPERATOR";
  }
}
