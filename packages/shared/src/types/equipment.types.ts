export interface CameraHealthDto {
  time?: string;
  cameraId: string;
  siteId: string;
  status: string;
  fpsActual?: number;
  fpsExpected?: number;
  latencyMs?: number;
  lastHeartbeat?: string;
}

export interface ReaderHealthDto {
  time?: string;
  readerId: string;
  siteId: string;
  status: string;
  failedReads?: number;
  responseTimeMs?: number;
  lastConnected?: string;
  firmwareVersion?: string;
}

export interface ControllerHealthDto {
  time?: string;
  controllerId: string;
  siteId: string;
  batteryLevel?: number;
  connectionStability?: string;
  firmwareVersion?: string;
  cpuLoad?: number;
  memoryUsage?: number;
}
