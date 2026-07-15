export interface VehicleListEntryDto {
  id: string;
  type: "allowlist" | "blocklist";
  plate: string;
  organizationId: string;
  description?: string | null;
  isActive: boolean;
  createdById: string;
  createdBy?: { firstName: string; lastName: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleEventDto {
  time: string;
  organizationId: string;
  cameraId?: string | null;
  plate: string;
  confidence?: number | null;
  imageUrl?: string | null;
  decision: string;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CreateVehicleListEntryInput {
  type: "allowlist" | "blocklist";
  plate: string;
  organizationId: string;
  description?: string;
  isActive?: boolean;
}

export interface VehicleEventQueryInput {
  plate?: string;
  organizationId?: string;
  from?: string;
  to?: string;
  decision?: string;
  page?: number;
  limit?: number;
}
