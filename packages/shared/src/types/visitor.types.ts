// ─── Visitor Management Types ───

export interface VisitorDto {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VisitDto {
  id: string;
  visitorId: string;
  hostUserId: string;
  hostName?: string;
  purpose?: string;
  validFrom: string;
  validUntil: string;
  credentialId?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  status: string;
  zoneRestrictions?: string[];
  createdAt: string;
  updatedAt: string;
  visitor?: VisitorDto;
}

export interface PreregisterInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  hostUserId: string;
  purpose?: string;
  validFrom: string;
  validUntil: string;
  zoneIds?: string[];
}

export interface CheckInInput {
  visitId: string;
}

export interface CheckOutInput {
  visitId: string;
}

export interface VisitorQueryInput {
  status?: string;
  hostUserId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}
