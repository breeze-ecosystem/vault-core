import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const PACK_FEATURES: Record<string, Array<{ key: string; moduleKey?: string }>> = {
  VISION: [
    { key: "live_streaming" },
    { key: "motion_detection" },
    { key: "basic_facial_recognition" },
    { key: "local_storage" },
    { key: "event_timeline" },
    { key: "video_export" },
    { key: "multi_user" },
    { key: "ai_night_vision" },
    { key: "adaptive_quality" },
    { key: "push_notifications" },
    { key: "sms_alerts" },
    { key: "whatsapp_alerts" },
    { key: "sensitivity_threshold" },
    { key: "detection_zones" },
    { key: "configurable_retention" },
    { key: "auto_screenshots" },
    { key: "h265_compression" },
    { key: "local_dashboard" },
    { key: "stream_sharing" },
    { key: "auto_geofencing" },
    { key: "silent_hours" },
    { key: "offline_vpn_access" },
  ],
  BASTION: [
    { key: "advanced_facial_recognition" },
    { key: "anti_spoofing" },
    { key: "abandoned_object_detection" },
    { key: "weapon_detection" },
    { key: "crowd_counting" },
    { key: "behavioral_analysis" },
    { key: "access_control_integration" },
    { key: "biometric_integration" },
    { key: "qr_credential" },
    { key: "multi_site" },
    { key: "enterprise_sso" },
    { key: "immutable_audit" },
    { key: "extra_cameras", moduleKey: "extra_cameras" },
    { key: "access_control", moduleKey: "access_control" },
    { key: "extra_sites", moduleKey: "extra_sites" },
    { key: "predictive_analytics", moduleKey: "predictive_analytics" },
    { key: "dpo_service", moduleKey: "dpo_service" },
    { key: "sla_premium", moduleKey: "sla_premium" },
    { key: "api_tierce", moduleKey: "api_tierce" },
  ],
};

@Injectable()
export class FeatureGateService {
  private readonly logger = new Logger(FeatureGateService.name);

  constructor(private prisma: PrismaService) {}

  async seedDefaultFlags(
    organizationId: string,
    pack: string = "VISION",
    moduleKeys: string[] = [],
  ): Promise<void> {
    const features = PACK_FEATURES[pack] ?? PACK_FEATURES.VISION;

    for (const feature of features) {
      const enabled = feature.moduleKey
        ? moduleKeys.includes(feature.moduleKey)
        : true;

      try {
        await this.prisma.featureFlag.upsert({
          where: {
            organizationId_key: {
              organizationId,
              key: feature.key,
            },
          },
          update: { enabled, pack, moduleKey: feature.moduleKey ?? null },
          create: {
            organizationId,
            key: feature.key,
            enabled,
            pack,
            moduleKey: feature.moduleKey ?? null,
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
      `Seeded ${features.length} feature flags for org ${organizationId} (pack: ${pack})`,
    );
  }
}
