export const CONTROLLER_STATUS = {
  PENDING: "PENDING",
  ONLINE: "ONLINE",
  OFFLINE: "OFFLINE",
  DEGRADED: "DEGRADED",
} as const;

export type ControllerStatus = (typeof CONTROLLER_STATUS)[keyof typeof CONTROLLER_STATUS];
