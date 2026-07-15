export interface AIQuerySpec {
  event_types: string[];
  filters: {
    site_name?: string;
    from_time?: string;
    to_time?: string;
    door_name?: string;
    plate?: string;
  };
  query_summary: string;
}

export interface AIQueryResult {
  query: string;
  spec: AIQuerySpec;
  results: TimelineEntry[];
  summary: string;
}

export interface TimelineEntry {
  time: string;
  event_type: string;
  organization_id: string;
  door_id?: string;
  door_name?: string;
  credential_id?: string;
  user_name?: string;
  decision?: string;
  summary: string;
  camera_id?: string;
  snapshot_url?: string;
}

export interface IncidentSummaryDto {
  incidentId: string;
  title: string;
  summary: string;
  keyEvents: string[];
  recommendedActions: string[];
  generatedAt: string;
}

export interface AssistantResponse {
  answer: string;
  sources: {
    type: string;
    time: string;
    summary: string;
  }[];
}
