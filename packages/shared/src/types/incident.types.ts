import type { AlertSeverity } from "../constants/alert-severity";

export interface IncidentDto {
  id: string;
  title: string;
  description?: string | null;
  severity: AlertSeverity;
  status: string;
  siteId: string;
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
  siteId: string;
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

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
