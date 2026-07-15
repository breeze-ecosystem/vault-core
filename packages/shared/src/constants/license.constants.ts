export const LICENSE_VERSION = 1;

export const LICENSE_STATUS = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  GRACE: "GRACE",
  EXPIRED: "EXPIRED",
} as const;

export type LicenseStatus = (typeof LICENSE_STATUS)[keyof typeof LICENSE_STATUS];

export const GRACE_PERIOD_DAYS_DEFAULT = 7;

export const TRIAL_DURATION_DAYS = 7;
