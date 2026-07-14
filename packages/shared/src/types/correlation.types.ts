export interface TimelineEntry {
  eventId: string;
  eventType: "access" | "door";
  timestamp: string;
  doorId: string;
  doorName?: string;
  zoneId?: string;
  summary: string;
  detail?: string;
  videoThumbnailUrl?: string;
  snapshotUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface PaginatedTimelineResponse {
  data: TimelineEntry[];
  total: number;
  page: number;
  limit: number;
}

export interface CorrelationJob {
  eventType: string;
  doorId: string;
  siteId: string;
  credentialId?: string;
  userId?: string;
  reason?: string;
  timestamp: string;
}

export interface TailgatingJob {
  doorId: string;
  siteId: string;
  eventTimestamp: string;
  accessEventId: string;
}
