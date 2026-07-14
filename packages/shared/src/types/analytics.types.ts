export interface ZoneAnalyticsDto {
  zoneId: string;
  siteId: string;
  zoneName: string;
  bucket: string;
  deniedCount: number;
  grantedCount: number;
  doorAnomalyCount: number;
  unsecuredCount: number;
  activeDoors: number;
}

export interface SiteAnalyticsDto {
  siteId: string;
  siteName: string;
  bucket: string;
  totalDenied: number;
  totalGranted: number;
  doorsWithAnomalies: number;
  doorsUnsecured: number;
  incidentsCreated: number;
}

export interface IntrusionEventDto {
  id: string;
  zoneId: string;
  siteId: string;
  doorId?: string;
  detectedAt: string;
  cameraId?: string;
  snapshotUrl?: string;
  confidence: number;
  status: string;
}

export interface LoiteringEventDto {
  id: string;
  zoneId: string;
  siteId: string;
  startedAt: string;
  durationSeconds: number;
  doorId?: string;
  maxConfidence: number;
  cameraId?: string;
  status: string;
}

export interface AbnormalActivityDto {
  zoneId: string;
  siteId: string;
  metric: string;
  currentValue: number;
  baselineMean: number;
  baselineStdDev: number;
  deviation: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  detectedAt: string;
}

export interface AnalyticsTrendPoint {
  bucket: string;
  value: number;
  metric: string;
}

export interface AnalyticsQueryParams {
  siteId?: string;
  zoneId?: string;
  from?: string;
  to?: string;
  granularity?: 'hourly' | 'daily';
}
