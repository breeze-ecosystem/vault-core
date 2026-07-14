export interface MaintenanceTicketDto {
  id: string;
  title: string;
  description?: string;
  severity: string;
  status: string;
  siteId: string;
  assignedToId?: string;
  assignedToName?: string;
  deviceType?: string;
  deviceId?: string;
  deviceName?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface UnifiedIncidentDto {
  id: string;
  title: string;
  description?: string;
  severity: string;
  status: string;
  ticketType: "SECURITY_INCIDENT" | "MAINTENANCE_TICKET";
  siteId: string;
  siteName?: string;
  assignedToName?: string;
  deviceType?: string;
  deviceName?: string;
  createdAt: string;
}
