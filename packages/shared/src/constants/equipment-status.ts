export const EQUIPMENT_STATUS = {
  ONLINE: "online",
  OFFLINE: "offline",
  DEGRADED: "degraded",
  MAINTENANCE: "maintenance",
} as const;

export type EquipmentStatus = (typeof EQUIPMENT_STATUS)[keyof typeof EQUIPMENT_STATUS];
