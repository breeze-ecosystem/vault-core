export interface LicenseStatusResponse {
  licenseState: "trial" | "active" | "grace" | "expired" | "no_license";
  expiresAt?: Date;
  graceEndsAt?: Date;
  trialEndsAt?: Date;
  maxCameras?: number;
  maxDoors?: number;
  isUnlimited?: boolean;
}

export interface ApiKeyInfo {
  id: string;
  name: string;
}

export interface UsageInfo {
  cameras: { current: number; max: number | null };
  doors: { current: number; max: number | null };
}

export interface ApiKeyResult {
  rawKey: string;
  keyPrefix: string;
  id: string;
}
