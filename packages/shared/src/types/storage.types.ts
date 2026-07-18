// ─── Phase 4: Storage DTOs ───

export interface RetentionPolicyDto {
  id: string;
  siteId?: string | null;
  eventType: string;
  tableType: string;
  retentionDays: number;
  enabled: boolean;
  exportBeforePurge?: boolean | null;
  exportFormat?: string | null;
}

export interface ForensicEvidenceDto {
  id: string;
  eventId: string;
  mediaType: string;
  zipPath: string;
  tsaCertPath: string;
  hash: string;
  sizeBytes?: number | null;
  createdAt: string;
}

export interface BackupConfigDto {
  id: string;
  targetPath: string;
  schedule: string;
  enabled: boolean;
  lastBackupAt?: string | null;
  lastStatus?: string | null;
}

export interface BackupJobDto {
  id: string;
  status: string;
  sizeBytes?: number | null;
  error?: string | null;
  startedAt: string;
  completedAt?: string | null;
}

export interface BastionKpisDto {
  incidentsToday: number;
  activeAlerts: number;
  camerasOnline: number;
  storageUsedBytes: number;
  entriesToday: number;
}
