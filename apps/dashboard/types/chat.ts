export interface ChatMessageDto {
  message: string;
  cameraId?: string;
  history?: string[];
}

export interface ChatResponse {
  answer: string;
  camerasQueried: string[];
  snapshotIncluded: boolean;
  timestamp: string;
}

export interface ChatCamera {
  id: string;
  name: string;
  status: 'ONLINE' | 'OFFLINE' | 'MAINTENANCE' | 'DEGRADED';
  siteName?: string;
}