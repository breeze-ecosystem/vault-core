export type ControllerStatus = 'PENDING' | 'ONLINE' | 'OFFLINE' | 'DEGRADED';

export interface ControllerDto {
  id: string;
  name?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  organizationId: string;
  siteId?: string;
  serialPort?: string;
  osdpAddress?: number;
  secureChannel: boolean;
  status: ControllerStatus;
  lastSeen?: string;
}
