import { SetMetadata } from "@nestjs/common";

export const FEATURE_KEY = "requiredFeature";
export const RequiresFeature = (feature: string) => SetMetadata(FEATURE_KEY, feature);

export const PACK_KEY = "requiredPack";
export const RequiresPack = (pack: "VISION" | "BASTION") => SetMetadata(PACK_KEY, pack);

export const MODULE_KEY = "requiredModule";
export const RequiresModule = (moduleKey: string) => SetMetadata(MODULE_KEY, moduleKey);

// ─── Phase 4: BASTION Module Keys ───

export const BASTION_MODULE_KEYS = {
  HAPDP: "hapdp",
  BASTION_REPORTS: "bastion_reports",
  BASTION_STORAGE: "bastion_storage",
  BASTION_API: "bastion_api",
  BASTION_INTEGRATIONS: "bastion_integrations",
} as const;

export type BastionModuleKey = (typeof BASTION_MODULE_KEYS)[keyof typeof BASTION_MODULE_KEYS];
