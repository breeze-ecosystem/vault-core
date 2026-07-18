// ─── Phase 4: BASTION Sub-Feature Module Keys ───

export const BASTION_MODULE_KEYS = {
  HAPDP: "hapdp",
  BASTION_REPORTS: "bastion_reports",
  BASTION_STORAGE: "bastion_storage",
  BASTION_API: "bastion_api",
  BASTION_INTEGRATIONS: "bastion_integrations",
} as const;

export type BastionModuleKey = (typeof BASTION_MODULE_KEYS)[keyof typeof BASTION_MODULE_KEYS];
