import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Feature-to-tier mapping: which features are available at each plan tier.
 * Features with a minimum tier are enabled for that tier and above.
 */
const DEFAULT_FEATURES: {
  key: string;
  minTier: "FREE" | "PROFESSIONAL" | "ENTERPRISE";
  description?: string;
}[] = [
  { key: "basic_monitoring", minTier: "FREE" },
  { key: "advanced_analytics", minTier: "PROFESSIONAL" },
  { key: "export_csv", minTier: "PROFESSIONAL" },
  { key: "api_access", minTier: "ENTERPRISE" },
  { key: "custom_branding", minTier: "ENTERPRISE" },
  { key: "sso", minTier: "ENTERPRISE" },
];

const TIER_ORDER: Record<string, number> = {
  FREE: 0,
  PROFESSIONAL: 1,
  ENTERPRISE: 2,
};

@Injectable()
export class FeatureGateService {
  private readonly logger = new Logger(FeatureGateService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Seed default feature flags for a newly created organization.
   * Features whose minimum tier is <= the org's plan tier are enabled.
   * Uses upsert to be idempotent.
   */
  async seedDefaultFlags(
    organizationId: string,
    planTier: string = "FREE",
  ): Promise<void> {
    const orgTierLevel = TIER_ORDER[planTier] ?? 0;

    for (const feature of DEFAULT_FEATURES) {
      const featureMinLevel = TIER_ORDER[feature.minTier] ?? 0;
      const enabled = orgTierLevel >= featureMinLevel;

      try {
        await this.prisma.featureFlag.upsert({
          where: {
            organizationId_key: {
              organizationId,
              key: feature.key,
            },
          },
          update: {
            enabled,
            tier: feature.minTier,
          },
          create: {
            organizationId,
            key: feature.key,
            enabled,
            tier: feature.minTier,
          },
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Failed to seed feature flag ${feature.key} for org ${organizationId}: ${message}`,
        );
      }
    }

    this.logger.log(
      `Seeded ${DEFAULT_FEATURES.length} feature flags for org ${organizationId} (tier: ${planTier})`,
    );
  }
}
