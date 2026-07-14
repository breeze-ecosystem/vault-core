export interface MqttMessage<T = unknown> {
  topic: string;
  payload: T;
  qos: 0 | 1 | 2;
  retain: boolean;
}

export interface DoorStatePayload {
  deviceId?: string;
  controller_id?: string;
  state: string;
  sequence: number;
  timestamp?: string;
}

export interface BadgeReadPayload {
  badgeNumber: string;
  sequence: number;
  deviceId?: string;
  timestamp?: string;
}

export interface DoorStateEvent {
  doorId: string;
  siteId: string;
  state: string;
  previousState?: string;
  sequence: number;
  triggeredBy?: string;
  timestamp: Date;
}

export interface BadgeReadEvent {
  siteId: string;
  readerId: string;
  badgeNumber: string;
  sequence: number;
  timestamp: Date;
}
