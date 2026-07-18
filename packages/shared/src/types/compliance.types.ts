import type { HapdpDeclarationInput } from "../schemas/compliance.schema";

// ─── Phase 4: HAPDP DTOs ───

export interface HapdpDeclarationDto extends HapdpDeclarationInput {
  generatedAt: string;
  referenceNumber: string;
}

export interface SubjectAccessRequestDto {
  id: string;
  email: string;
  requestType: string;
  status: string;
  details?: string | null;
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectDataDto {
  email: string;
  name: string;
  role: string;
  sites: string[];
  lastAccess: string;
  relatedAlerts: number;
  relatedFaces: number;
  dataItems: Array<{
    type: string;
    description: string;
    date: string;
  }>;
}
