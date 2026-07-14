export const INCIDENT_STATUS = {
  OPEN: "open",
  TRIAGE: "triage",
  INVESTIGATING: "investigating",
  RESOLVED: "resolved",
  CLOSED: "closed",
} as const;

export type IncidentStatus = (typeof INCIDENT_STATUS)[keyof typeof INCIDENT_STATUS];
