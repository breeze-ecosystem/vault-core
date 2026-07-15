import type { AlertSeverity } from "../constants/alert-severity";

export interface IncidentDto {
  id: string;
  title: string;
  description?: string | null;
  severity: AlertSeverity;
  status: string;
  organizationId: string;
  sourceType?: string | null;
  sourceId?: string | null;
  assignedToId?: string | null;
  assignedAt?: string | null;
  slaMinutes: number;
  escalationChain: any[];
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
  _count?: {
    comments: number;
  };
}

export interface IncidentCommentDto {
  id: string;
  incidentId: string;
  userId: string;
  userName?: string;
  text: string;
  createdAt: string;
  user?: {
    firstName: string;
    lastName: string;
  };
}

export interface IncidentAssignmentDto {
  id: string;
  incidentId: string;
  assignedById: string;
  assignedToId: string;
  assignedAt: string;
  note?: string | null;
  assignedBy?: {
    firstName: string;
    lastName: string;
  };
  assignedTo?: {
    firstName: string;
    lastName: string;
  };
}

export interface CreateIncidentInput {
  title: string;
  description?: string;
  severity: AlertSeverity;
  organizationId: string;
  sourceType?: string;
  sourceId?: string;
}

export interface UpdateIncidentStatusInput {
  status: string;
  reason?: string;
}

export interface AssignIncidentInput {
  userId: string;
  note?: string;
}

export interface AddCommentInput {
  text: string;
}

export interface IncidentHistoryEntry {
  time: string;
  status: string;
  previous_status?: string | null;
  triggered_by?: string | null;
  metadata?: any;
}

export interface IncidentEvidenceDto {
  id: string;
  incidentId: string;
  type: string;
  url?: string | null;
  eventType?: string | null;
  eventId?: string | null;
  description?: string | null;
  uploadedById: string;
  uploaderName?: string | null;
  createdAt: string;
}

export interface AddEvidenceInput {
  type: "video_clip" | "snapshot" | "access_event" | "document" | "note";
  url?: string;
  eventType?: string;
  eventId?: string;
  description?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
