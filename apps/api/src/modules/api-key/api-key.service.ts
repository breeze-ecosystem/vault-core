import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import * as crypto from "crypto";

export const DEFAULT_SCOPES = [
  "read:cameras",
  "read:doors",
  "read:alerts",
  "read:incidents",
  "read:events",
  "read:audit",
];

export interface CreateTenantApiKeyInput {
  name: string;
  scopes?: string[];
  rateLimit?: number;
  expiresAt?: string;
}

export interface CreateTenantApiKeyResult {
  id: string;
  name: string;
  keyPrefix: string;
  rawKey: string;
  scopes: string[];
  rateLimit: number;
}

export interface TenantApiKeyInfo {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  isActive: boolean;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Create a new tenant-scoped API key.
   * Generates a random 256-bit key prefixed with "osk_",
   * SHA-256 hashes it for storage, and returns the raw key ONCE.
   */
  async createKey(
    orgId: string,
    userId: string,
    dto: CreateTenantApiKeyInput,
  ): Promise<CreateTenantApiKeyResult> {
    // Generate raw key: 256-bit random hex with osk_ prefix
    const rawKeyRaw = crypto.randomBytes(32).toString("hex");
    const rawKey = `osk_${rawKeyRaw}`;
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const keyPrefix = "osk_";

    const scopes = dto.scopes ?? DEFAULT_SCOPES;
    const rateLimit = dto.rateLimit ?? 300;

    const record = await this.prisma.tenantApiKey.create({
      data: {
        name: dto.name,
        keyHash,
        keyPrefix,
        scopes,
        rateLimit,
        organizationId: orgId,
        createdById: userId,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    this.logger.log(
      `Created API key "${dto.name}" for org ${orgId} (rateLimit: ${rateLimit})`,
    );

    return {
      id: record.id,
      name: record.name,
      keyPrefix,
      rawKey,
      scopes,
      rateLimit,
    };
  }

  /**
   * List all API keys for an organization.
   * NEVER returns keyHash or rawKey — only masked display info.
   */
  async listKeys(orgId: string): Promise<TenantApiKeyInfo[]> {
    const keys = await this.prisma.tenantApiKey.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        scopes: true,
        rateLimit: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return keys.map((k) => ({
      ...k,
      scopes: k.scopes as string[],
    })) as TenantApiKeyInfo[];
  }

  /**
   * Revoke an API key by setting isActive=false and revokedAt.
   * Scoped to orgId to prevent cross-org key revocation.
   */
  async revokeKey(id: string, orgId: string): Promise<{ success: true }> {
    const existing = await this.prisma.tenantApiKey.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      throw new NotFoundException("Clé API non trouvée");
    }

    await this.prisma.tenantApiKey.update({
      where: { id },
      data: { isActive: false, revokedAt: new Date() },
    });

    this.logger.log(`Revoked API key ${id} for org ${orgId}`);
    return { success: true };
  }

  /**
   * Validate a raw API key: hash it, look up in DB, check expiry/revocation.
   * Returns the key record or null.
   */
  async validateKey(rawKey: string) {
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    const record = await this.prisma.tenantApiKey.findFirst({
      where: { keyHash, isActive: true },
    });

    if (!record) return null;

    // Check expiry
    if (record.expiresAt && record.expiresAt < new Date()) {
      return null;
    }

    // Check revocation
    if (record.revokedAt) {
      return null;
    }

    // Update lastUsedAt non-blocking
    this.prisma.tenantApiKey
      .update({ where: { id: record.id }, data: { lastUsedAt: new Date() } })
      .catch(() => {});

    return record;
  }

  /**
   * Get usage stats for a key (lastUsedAt + recent request count from Redis).
   */
  async getKeyUsage(orgId: string, keyId: string) {
    const key = await this.prisma.tenantApiKey.findFirst({
      where: { id: keyId, organizationId: orgId },
      select: { id: true, lastUsedAt: true, rateLimit: true },
    });

    if (!key) {
      throw new NotFoundException("Clé API non trouvée");
    }

    return {
      id: key.id,
      lastUsedAt: key.lastUsedAt,
      rateLimit: key.rateLimit,
    };
  }
}
