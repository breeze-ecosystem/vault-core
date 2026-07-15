export interface CameraHealthDto {
  time?: string;
  cameraId: string;
  organizationId: string;
  status: string;
  fpsActual?: number;
  fpsExpected?: number;
  latencyMs?: number;
  lastHeartbeat?: string;
}

export interface ReaderHealthDto {
  time?: string;
  readerId: string;
  organizationId: string;
  status: string;
  failedReads?: number;
  responseTimeMs?: number;
  lastConnected?: string;
  firmwareVersion?: string;
}

export interface ControllerHealthDto {
  time?: string;
  controllerId: string;
  organizationId: string;
  batteryLevel?: number;
  connectionStability?: string;
  firmwareVersion?: string;
  cpuLoad?: number;
  memoryUsage?: number;
}

export interface PredictionDto {
  id: string;
  time: string;
  organizationId: string;
  deviceType: string;
  deviceId: string;
  deviceName?: string;
  metric: string;
  currentValue: number;
  failureThreshold: number;
  slope: number;
  hoursToFailure: number | null;
  confidence: "high" | "medium" | "low";
  dataPoints: number;
  triggeredAlert: boolean;
}

export interface CameraDoorAssociationDto {
  cameraId: string;
  cameraName: string;
  doorId?: string;
  doorName?: string;
  doorZoneId?: string;
  angle?: string;
  priority: number;
  status: "mapped" | "orphan_camera" | "orphan_door" | "zone_mismatch";
}

export interface PredictiveQueryParams {
  organizationId?: string;
  deviceType?: string;
  metric?: string;
  triggeredAlert?: boolean;
}
