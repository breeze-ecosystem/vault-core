import { SetMetadata } from "@nestjs/common";

export const AUDIT_KEY = "audit";

export interface AuditMeta {
  entity: string;
  action: string;
  captureChanges?: boolean;
}

export const Audited = (meta: AuditMeta) => SetMetadata(AUDIT_KEY, meta);
