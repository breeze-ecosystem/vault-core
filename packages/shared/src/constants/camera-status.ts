export const CAMERA_STATUS = {
  ONLINE: "ONLINE",
  OFFLINE: "OFFLINE",
  MAINTENANCE: "MAINTENANCE",
  DEGRADED: "DEGRADED",
} as const;

export type CameraStatus = (typeof CAMERA_STATUS)[keyof typeof CAMERA_STATUS];
