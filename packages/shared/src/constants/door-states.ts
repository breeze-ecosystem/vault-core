export const DOOR_STATES = {
  LOCKED: "locked",
  UNLOCKED: "unlocked",
  HELD_OPEN: "held-open",
  FORCED: "forced",
  UNSECURED: "unsecured",
  DESYNCHRONIZED: "desynchronized",
} as const;

export type DoorState = (typeof DOOR_STATES)[keyof typeof DOOR_STATES];
