export interface RetentionPolicyDto {
  id: string;
  eventType: string;
  tableType: string;
  retentionDays: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRetentionPolicyInput {
  eventType: string;
  tableType: string;
  retentionDays: number;
  enabled?: boolean;
}

export interface UpdateRetentionPolicyInput {
  retentionDays?: number;
  enabled?: boolean;
}
