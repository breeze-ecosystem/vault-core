export interface DetectedPatternDto {
  id: string;
  time: string;
  organizationId: string;
  patternId: string;
  patternName: string;
  deviceType: "door" | "reader" | "camera" | "controller";
  deviceId: string;
  occurrenceCount: number;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  metadata?: any;
  resolved: boolean;
  resolvedAt?: string;
}

export interface PatternDefinition {
  id: string;
  name: string;
  description: string;
  deviceType: string;
  query: string;
  params: any[];
  severity: string;
}

export interface PatternsQueryParams {
  organizationId?: string;
  deviceType?: string;
  severity?: string;
  resolved?: boolean;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}
