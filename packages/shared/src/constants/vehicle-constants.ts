export const VEHICLE_LIST_TYPES = { ALLOWLIST: "allowlist", BLOCKLIST: "blocklist" } as const;
export type VehicleListType = (typeof VEHICLE_LIST_TYPES)[keyof typeof VEHICLE_LIST_TYPES];

export const VEHICLE_DECISIONS = { ALLOW: "ALLOW", DENY: "DENY", UNKNOWN: "UNKNOWN" } as const;
export type VehicleDecision = (typeof VEHICLE_DECISIONS)[keyof typeof VEHICLE_DECISIONS];

export const VEHICLE_DECISION_REASONS = ["allowlist", "blocklist", "unknown", "schedule"] as const;
