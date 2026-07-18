import { SetMetadata } from "@nestjs/common";

export const FEATURE_KEY = "requiredFeature";
export const RequiresFeature = (feature: string) => SetMetadata(FEATURE_KEY, feature);

export const PACK_KEY = "requiredPack";
export const RequiresPack = (pack: "VISION" | "BASTION") => SetMetadata(PACK_KEY, pack);

export const MODULE_KEY = "requiredModule";
export const RequiresModule = (moduleKey: string) => SetMetadata(MODULE_KEY, moduleKey);
