export const BASTION_EVENT_TYPES = {
  // Alert events
  ALERT_CREATED: "bastion.alert_created",
  ALERT_RESOLVED: "bastion.alert_resolved",
  // Access events
  ACCESS_GRANTED: "bastion.access_granted",
  ACCESS_DENIED: "bastion.access_denied",
  DOOR_FORCED: "bastion.door_forced",
  // AI detection events
  AI_DETECTION: "bastion.ai_detection",
  FACE_MATCH: "bastion.face_match",
  WEAPON_DETECTED: "bastion.weapon_detected",
  // Compliance events
  COMPLIANCE_EVENT: "bastion.compliance_event",
  SUBJECT_ACCESS_REQUEST: "bastion.subject_access_request",
  // Integration events
  FIRE_ALARM: "bastion.fire_alarm",
  BMS_EVENT: "bastion.bms_event",
  // Reporting
  REPORT_READY: "bastion.report_ready",
  // Backup events
  BACKUP_COMPLETED: "bastion.backup_completed",
  BACKUP_FAILED: "bastion.backup_failed",
} as const;

export type BastionEventType = (typeof BASTION_EVENT_TYPES)[keyof typeof BASTION_EVENT_TYPES];
