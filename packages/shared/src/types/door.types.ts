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
  organizationId: string;
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

export interface DoorCommandResponse {
  status: 'sent' | 'acknowledged' | 'failed';
  doorId: string;
  timestamp: string;
}

export interface OsdpEventDto {
  eventType: 'badge_read' | 'door_state' | 'tamper' | 'forced_open';
  doorId: string;
  badgeNumber?: string;
  direction?: 'ingress' | 'egress';
  tampered?: boolean;
  controllerSerial?: string;
  timestamp: string;
  sequence: number;
}

export type CommandState = 'idle' | 'sending' | 'sent' | 'acknowledged' | 'failed';
