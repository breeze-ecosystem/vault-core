export const SLA_SEVERITY_DEFAULTS = {
  CRITICAL: 15,
  HIGH: 30,
  MEDIUM: 120,
  LOW: 480,
} as const;

export const INCIDENT_EVIDENCE_TYPES = ["access_event", "alert", "video_clip"] as const;
