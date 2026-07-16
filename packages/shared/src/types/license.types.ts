export interface LicenseClaims {
  organizationId: string;
  issuedAt: number;
  expiresAt: number;
  maxCameras: number;
  maxDoors: number;
  gracePeriodDays: number;
  licenseVersion: number;
  currency?: string;
}

export type LicenseState = "trial" | "active" | "grace" | "expired" | "no_license";

export interface LicenseStatusDto {
  licenseState: LicenseState;
  expiresAt?: string;
  graceEndsAt?: string;
  trialEndsAt?: string;
  maxCameras?: number;
  maxDoors?: number;
  isUnlimited?: boolean;
}
