export const CREDENTIAL_TYPES = {
  BADGE: "BADGE",
  PIN: "PIN",
  MOBILE: "MOBILE",
  QR: "QR",
  FINGERPRINT: "FINGERPRINT",
  FACE: "FACE",
} as const;

export type CredentialType = (typeof CREDENTIAL_TYPES)[keyof typeof CREDENTIAL_TYPES];
