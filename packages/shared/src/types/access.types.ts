import type { CredentialType } from "../constants/credential-types";
import type { DoorState } from "../constants/door-states";

export interface AccessDecision {
  decision: "granted" | "denied";
  reason: string;
  timestamp: Date;
}

export interface CredentialDto {
  id: string;
  userId: string;
  type: CredentialType;
  badgeNumber?: string | null;
  pinHash?: string | null;
  mobileWalletId?: string | null;
  qrSeed?: string | null;
  isActive: boolean;
  validFrom?: string | null;
  validUntil?: string | null;
  maxUses?: number | null;
  useCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AccessLevelDto {
  id: string;
  credentialId: string;
  zoneId: string;
  scheduleId: string;
  priority: number;
}

export interface ScheduleEntry {
  dayOfWeek: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

export interface DoorStateEvent {
  doorId: string;
  organizationId: string;
  state: DoorState;
  previousState?: DoorState;
  sequence: number;
  triggeredBy?: string;
  timestamp: Date;
}

export interface BadgeReadEvent {
  organizationId: string;
  readerId: string;
  badgeNumber: string;
  sequence: number;
  timestamp: Date;
}
