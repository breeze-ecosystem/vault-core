import type { DoorState } from "../constants/door-states";

export interface DoorStateDto {
  doorId: string;
  name: string;
  zoneId: string;
  state: DoorState;
  lastChanged: string;
  controllerId?: string;
}

export interface DoorAlertJob {
  doorId: string;
  siteId: string;
  state: DoorState;
  reason: string;
  timestamp: string;
}

export interface EmergencyOverrideEvent {
  zoneId: string;
  status: "lockdown" | "emergency-unlock" | "cleared";
  triggeredBy: string;
  timestamp: string;
}

export interface DoorAlertConfig {
  heldOpenThresholdMs: number;
  forcedOpenImmediate: boolean;
  unsecuredImmediate: boolean;
  settlingTimeoutMs: number;
  desyncMaxRetries: number;
}
