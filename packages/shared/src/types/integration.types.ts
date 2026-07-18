// ─── Phase 4: Integration DTOs ───

export interface IntegrationEndpointDto {
  id: string;
  organizationId: string;
  type: string;
  name: string;
  isActive: boolean;
  config: Record<string, unknown>;
  lastEventAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FireAlarmEventDto {
  id: string;
  organizationId: string;
  siteId: string;
  zone: string;
  sensorId: string;
  severity: string;
  message?: string | null;
  timestamp: string;
}

export interface BmsEventDto {
  id: string;
  organizationId: string;
  siteId: string;
  zone: string;
  eventType: string;
  value?: number | null;
  unit?: string | null;
  message?: string | null;
  timestamp: string;
}
