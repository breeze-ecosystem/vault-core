export interface LicenseClaims {
  organizationId: string;
  issuedAt: number;
  expiresAt: number;
  maxCameras: number;
  maxDoors: number;
  maxUsers: number;
  gracePeriodDays: number;
  licenseVersion: number;
  pack: "VISION" | "BASTION";
  modules: string[];
}

export type LicenseState = "trial" | "active" | "grace" | "degraded" | "expired" | "no_license";

export interface LicenseStatusDto {
  licenseState: LicenseState;
  expiresAt?: string;
  graceEndsAt?: string;
  trialEndsAt?: string;
  maxCameras?: number;
  maxDoors?: number;
  maxUsers?: number;
  isUnlimited?: boolean;
  pack?: string;
  modules?: string[];
}
