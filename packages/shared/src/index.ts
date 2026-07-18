// Schemas
export { registerSchema, loginSchema, refreshSchema, switchOrgSchema } from "./schemas/auth.schema";
export type { RegisterInput, LoginInput, RefreshInput, SwitchOrgInput } from "./schemas/auth.schema";

// Schemas - Organization
export { createOrganizationSchema, updateOrganizationSchema } from "./schemas/organization.schema";
export type { CreateOrganizationInput, UpdateOrganizationInput } from "./schemas/organization.schema";

// Schemas - Organization Config (Phase 8 stubs)
// export { anprThresholdSchema, healthThresholdSchema } from "./schemas/organization.schema";
// export type { AnprThresholdInput, HealthThresholdInput } from "./schemas/organization.schema";

// Schemas - Invite
export { createInviteSchema, acceptInviteSchema } from "./schemas/invite.schema";
export type { CreateInviteInput, AcceptInviteInput } from "./schemas/invite.schema";

// Schemas - Contact
export { contactSchema } from "./schemas/contact.schema";
export type { ContactInput } from "./schemas/contact.schema";

// Constants
export { ROLES, ROLE_HIERARCHY, hasMinRole } from "./constants/roles";
export type { Role } from "./constants/roles";

export { CAMERA_STATUS } from "./constants/camera-status";
export type { CameraStatus } from "./constants/camera-status";

export { ALERT_SEVERITY } from "./constants/alert-severity";
export type { AlertSeverity } from "./constants/alert-severity";

export { ALERT_STATUS } from "./constants/alert-status";
export type { AlertStatus } from "./constants/alert-status";

// Constants - Access Control
export { CREDENTIAL_TYPES } from "./constants/credential-types";
export type { CredentialType } from "./constants/credential-types";

export { DOOR_STATES } from "./constants/door-states";
export type { DoorState } from "./constants/door-states";

// Schemas - Site
export { createSiteSchema, updateSiteSchema } from "./schemas/site.schema";
export type { CreateSiteInput, UpdateSiteInput } from "./schemas/site.schema";

// Schemas - Camera
export { createCameraSchema, updateCameraSchema } from "./schemas/camera.schema";
export type { CreateCameraInput, UpdateCameraInput } from "./schemas/camera.schema";

// Schemas - PTZ
export { ptzContinuousSchema, ptzGotoPresetSchema, ptzSavePresetSchema } from "./schemas/camera.schema";
export type { PtzContinuousInput, PtzGotoPresetInput, PtzSavePresetInput } from "./schemas/camera.schema";

// Schemas - Controller
export { enrollControllerSchema } from "./schemas/controller.schema";
export type { EnrollControllerInput } from "./schemas/controller.schema";

// Types - Controller
export type { ControllerDto, ControllerStatus } from "./types/controller.types";

// Constants - Controller
export { CONTROLLER_STATUS } from "./constants/controller-status";

// Schemas - Alert
export { createAlertSchema, updateAlertSchema } from "./schemas/alert.schema";
export type { CreateAlertInput, UpdateAlertInput } from "./schemas/alert.schema";

// Schemas - Access Control
export {
  createCredentialSchema,
  updateCredentialSchema,
  createAccessLevelSchema,
  createScheduleSchema,
  updateScheduleSchema,
  createZoneSchema,
  createDoorSchema,
  createCameraDoorMapSchema,
} from "./schemas/access.schema";
export type {
  CreateCredentialInput,
  UpdateCredentialInput,
  CreateAccessLevelInput,
  CreateScheduleInput,
  UpdateScheduleInput,
  CreateZoneInput,
  CreateDoorInput,
  CreateCameraDoorMapInput,
} from "./schemas/access.schema";

// Schemas - Credential Lifecycle (Phase 8 stub — file not yet in repo)
// export { revokeCredentialSchema, reissueCredentialSchema } from "./schemas/credential.schema";
// export type { RevokeCredentialInput, ReissueCredentialInput } from "./schemas/credential.schema";

// Types
export type { TokenPayload, AuthResponse } from "./types/auth.types";

// Types - Access Control
export type {
  AccessDecision,
  CredentialDto,
  AccessLevelDto,
  ScheduleEntry,
  DoorStateEvent,
  BadgeReadEvent,
} from "./types/access.types";

// Schemas - Door Monitoring
export { updateAlertConfigSchema, emergencyOverrideSchema } from "./schemas/door.schema";
export type { UpdateAlertConfigInput, EmergencyOverrideInput } from "./schemas/door.schema";

export { doorCommandSchema, createDoorMonitoringSchema } from "./schemas/door.schema";
export type { DoorCommandInput, CreateDoorMonitoringInput } from "./schemas/door.schema";

// Types - Door Monitoring
export type {
  DoorStateDto,
  DoorAlertJob,
  EmergencyOverrideEvent,
  DoorAlertConfig,
} from "./types/door.types";

// Types - Door Commands & OSDP Events
export type { DoorCommandResponse, OsdpEventDto, CommandState } from "./types/door.types";

// Types - Camera
export type { PTZPreset, PTZCapabilities } from "./types/camera.types";

// Schemas - Door Threshold Config (Phase 8 stub)
// export { doorThresholdConfigSchema } from "./schemas/door.schema";
// export type { DoorThresholdConfigInput } from "./schemas/door.schema";

// Types - Correlation (Video-Event Timeline & Tailgating)
export type {
  TimelineEntry,
  PaginatedTimelineResponse,
  CorrelationJob,
  TailgatingJob,
} from "./types/correlation.types";

// Schemas - Audit
export { auditQuerySchema, auditVerifySchema, auditVerifyOrgChainSchema, auditExportSchema } from "./schemas/audit.schema";

export type { AuditQueryInput, AuditVerifyInput, AuditVerifyOrgChainInput, AuditExportInput } from "./schemas/audit.schema";
// Types - Audit
export type {
  AuditEntry,
  ChainVerificationResult,
  AuditExportParams,
  AuditStats,
} from "./types/audit.types";

// Constants - Incident
export { INCIDENT_STATUS } from "./constants/incident-status";
export type { IncidentStatus } from "./constants/incident-status";

// Constants - Incident Phase 8 (file not yet in repo)
// export { SLA_SEVERITY_DEFAULTS, INCIDENT_EVIDENCE_TYPES } from "./constants/incident-constants";

// Schemas - Incident
export {
  createIncidentSchema,
  updateIncidentStatusSchema,
  assignIncidentSchema,
  addCommentSchema,
  queryIncidentSchema,
  addEvidenceSchema,
} from "./schemas/incident.schema";
export type {
  CreateIncidentInput,
  UpdateIncidentStatusInput,
  AssignIncidentInput,
  AddCommentInput,
  QueryIncidentInput,
  AddEvidenceInput,
} from "./schemas/incident.schema";

// Schemas - Incident SLA & Evidence Bundle (Phase 8 stubs)
// export { slaProfileSchema, slaProfilesConfigSchema, evidenceBundleSchema } from "./schemas/incident.schema";
// export type { SlaProfileInput, SlaProfilesConfigInput, EvidenceBundleInput } from "./schemas/incident.schema";

// Types - Incident
export type {
  IncidentDto,
  IncidentCommentDto,
  IncidentAssignmentDto,
  IncidentEvidenceDto,
  AddEvidenceInput as AddEvidenceDto,
  CreateIncidentInput as CreateIncidentDto,
  UpdateIncidentStatusInput as UpdateIncidentStatusDto,
  AssignIncidentInput as AssignIncidentDto,
  AddCommentInput as AddCommentDto,
  IncidentHistoryEntry,
} from "./types/incident.types";

// Schemas - Visitor
export {
  preregisterSchema,
  checkInSchema,
  checkOutSchema,
  visitorQuerySchema,
} from "./schemas/visitor.schema";
export type {
  PreregisterInput,
  CheckInInput,
  CheckOutInput,
  VisitorQueryInput,
} from "./schemas/visitor.schema";

// Schemas - Visitor Host Approval & Timed Pass (Phase 8 stubs)
// export { hostApprovalSchema, timedPassSchema } from "./schemas/visitor.schema";
// export type { HostApprovalInput, TimedPassInput } from "./schemas/visitor.schema";

// Types - Visitor
export type {
  VisitorDto,
  VisitDto,
} from "./types/visitor.types";

// Constants - Vehicle
export { VEHICLE_LIST_TYPES, VEHICLE_DECISIONS, VEHICLE_DECISION_REASONS } from "./constants/vehicle-constants";
export type { VehicleListType, VehicleDecision } from "./constants/vehicle-constants";

// Schemas - Vehicle
export { createVehicleListEntrySchema, updateVehicleListEntrySchema, vehicleEventQuerySchema } from "./schemas/vehicle.schema";
export type { CreateVehicleListEntryInput, VehicleEventQueryInput } from "./schemas/vehicle.schema";

// Schemas - Vehicle Event Correlation (Phase 8 stub)
// export { vehicleEventCorrelationSchema } from "./schemas/vehicle.schema";
// export type { VehicleEventCorrelationInput } from "./schemas/vehicle.schema";

// Types - Vehicle
export type { VehicleListEntryDto, VehicleEventDto } from "./types/vehicle.types";

// Schemas - AI
export { aiQuerySchema, aiAssistantSchema, aiSummarizeSchema } from "./schemas/ai.schema";
export type { AIQueryInput, AIAssistantInput, AISummarizeInput } from "./schemas/ai.schema";

// Schemas - Agent
export { agentChatSchema, agentSseEventSchema, riskExplainSchema } from "./schemas/agent.schema";
export type { AgentChatInput, AgentSseEvent, RiskExplainInput } from "./schemas/agent.schema";

// Types - AI
export type {
  AIQueryResult,
  AIQuerySpec,
  IncidentSummaryDto,
  AssistantResponse,
  TimelineEntry as AITimelineEntry,
} from "./types/ai.types";

// Types - Agent
export type {
  AgentChatInput as AgentChatInputType,
  AgentChatMessage,
  SSEEvent,
  AgentStatus,
  RiskExplanation,
  PatternDetail,
  AgentTraceEntry,
} from "./types/agent.types";

// Constants - Equipment
export { EQUIPMENT_STATUS } from "./constants/equipment-status";
export type { EquipmentStatus } from "./constants/equipment-status";

// Schemas - Equipment
export { equipmentQuerySchema } from "./schemas/equipment.schema";
export type { EquipmentQueryInput } from "./schemas/equipment.schema";

// Schemas - Equipment Health (Phase 8 stubs)
// export { healthScoreQuerySchema, deviceHealthQuerySchema } from "./schemas/equipment.schema";
// export type { HealthScoreQueryInput, DeviceHealthQueryInput } from "./schemas/equipment.schema";

// Types - Equipment
export type {
  CameraHealthDto,
  ReaderHealthDto,
  ControllerHealthDto,
  PredictionDto,
  CameraDoorAssociationDto,
} from "./types/equipment.types";

// Schemas - Governance
export {
  createRetentionPolicySchema,
  updateRetentionPolicySchema,
  CLASSIFICATION_LABELS,
  EXPORT_FORMATS,
} from "./schemas/governance.schema";
export type {
  CreateRetentionPolicyInput as CreateRetentionPolicyInput,
  UpdateRetentionPolicyInput as UpdateRetentionPolicyInput,
} from "./schemas/governance.schema";

// Types - Governance
export type {
  RetentionPolicyDto,
  CreateRetentionPolicyInput as CreateRetentionPolicyDto,
  UpdateRetentionPolicyInput as UpdateRetentionPolicyDto,
} from "./types/governance.types";

// Schemas - Analytics
export { analyticsQuerySchema } from "./schemas/analytics.schema";
export type { AnalyticsQueryParams } from "./schemas/analytics.schema";

// Schemas - Analytics Phase 8 (stubs — will be defined when Phase 8 is planned)
// export { zoneMetricsQuerySchema, heatmapQuerySchema, trendQuerySchema } from "./schemas/analytics.schema";
// export type { ZoneMetricsQueryInput, HeatmapQueryInput, TrendQueryInput } from "./schemas/analytics.schema";

// Types - Analytics
export type {
  ZoneAnalyticsDto,
  SiteAnalyticsDto,
  IntrusionEventDto,
  LoiteringEventDto,
  AbnormalActivityDto,
  AnalyticsTrendPoint,
} from "./types/analytics.types";

// Schemas - Risk
export { riskQuerySchema } from "./schemas/risk.schema";
export type { RiskQueryParams } from "./schemas/risk.schema";

// Types - Risk
export type {
  RiskScoreDto,
  RiskFactors,
  RiskTrendPoint,
  SiteRiskSummary,
} from "./types/risk.types";

// Schemas - Patterns
export { patternsQuerySchema } from "./schemas/patterns.schema";
export type { PatternsQueryParams } from "./schemas/patterns.schema";

// Types - Patterns
export type {
  DetectedPatternDto,
  PatternDefinition,
} from "./types/patterns.types";

// Schemas - Maintenance
export { createMaintenanceTicketSchema, maintenanceQuerySchema } from "./schemas/maintenance.schema";
export type { CreateMaintenanceTicketInput, MaintenanceQueryInput } from "./schemas/maintenance.schema";

// Types - Maintenance
export type {
  MaintenanceTicketDto,
  UnifiedIncidentDto,
} from "./types/maintenance.types";

// Constants - License
export { LICENSE_VERSION, LICENSE_STATUS, GRACE_PERIOD_DAYS_DEFAULT, TRIAL_DURATION_DAYS } from "./constants/license.constants";
export type { LicenseStatus } from "./constants/license.constants";

// Schemas - License
export { activateLicenseSchema } from "./schemas/license.schema";
export type { ActivateLicenseInput } from "./schemas/license.schema";

// Types - License
export type { LicenseClaims, LicenseState, LicenseStatusDto } from "./types/license.types";

// Schemas - API Key (Enterprise)
export { createTenantApiKeySchema } from "./schemas/api-key.schema";
export type { CreateTenantApiKeyInput } from "./schemas/api-key.schema";

// Schemas - Webhook (Enterprise)
export { createWebhookSubscriptionSchema, updateWebhookSubscriptionSchema } from "./schemas/webhook.schema";
export type { CreateWebhookSubscriptionInput, UpdateWebhookSubscriptionInput } from "./schemas/webhook.schema";

// Schemas - SSO (Enterprise)
export { createIdpConfigSchema, updateIdpConfigSchema } from "./schemas/sso.schema";
export type { CreateIdpConfigInput, UpdateIdpConfigInput } from "./schemas/sso.schema";

// Schemas - Compliance (Enterprise)
export {
  generateComplianceReportSchema,
  hapdpDeclarationSchema,
  consentSignageSchema,
  subjectAccessOtpSchema,
  subjectAccessVerifySchema,
  subjectAccessRequestSchema,
} from "./schemas/compliance.schema";
export type {
  GenerateComplianceReportInput,
  HapdpDeclarationInput,
  ConsentSignageInput,
  SubjectAccessOtpInput,
  SubjectAccessVerifyInput,
  SubjectAccessRequestInput,
} from "./schemas/compliance.schema";

// Schemas - Storage (Phase 4)
export {
  retentionPolicySchema,
  forensicEvidenceSchema,
  backupConfigSchema,
} from "./schemas/storage.schema";
export type {
  RetentionPolicyInput,
  ForensicEvidenceInput,
  BackupConfigInput,
} from "./schemas/storage.schema";

// Schemas - Integration (Phase 4)
export {
  fireAlarmSchema,
  bmsEventSchema,
} from "./schemas/integration.schema";
export type {
  FireAlarmInput,
  BmsEventInput,
} from "./schemas/integration.schema";

// ── VISION Pack ──
export {
  faceWhitelistSchema,
  updateFaceWhitelistSchema,
  detectionZoneSchema,
  updateDetectionZoneSchema,
  createStreamShareSchema,
  geofencingConfigSchema,
  updateGeofencingConfigSchema,
  dndScheduleSchema,
  updateDndScheduleSchema,
  alertChannelConfigSchema,
  recordingConfigSchema,
  updateRecordingConfigSchema,
} from "./schemas/vision";
export type {
  FaceWhitelistInput,
  UpdateFaceWhitelistInput,
  DetectionZoneInput,
  UpdateDetectionZoneInput,
  CreateStreamShareInput,
  GeofencingConfigInput,
  UpdateGeofencingConfigInput,
  DNDScheduleInput,
  UpdateDNDScheduleInput,
  AlertChannelConfigInput,
  RecordingConfigInput,
  UpdateRecordingConfigInput,
} from "./schemas/vision";

export type {
  FaceWhitelist,
  DetectionZone,
  StreamShare,
  GeofencingConfig,
  GeofencingArmStatus,
  DNDSchedule,
  DNDDaySchedule,
  AlertChannelConfig,
  RecordingConfig,
} from "./types/vision";

export {
  VISION_MAX_CAMERAS,
  VISION_MAX_FACES,
  VISION_MAX_SECONDARY_USERS,
  VISION_MAX_RETENTION_DAYS,
  SHARE_DURATIONS,
  GEOFENCING_DEFAULT_ARM_DELAY,
  GEOFENCING_DEFAULT_TIMEOUT,
  ALERT_CHANNELS,
} from "./constants/index";

// Types - Compliance (Phase 4)
export type {
  HapdpDeclarationDto,
  SubjectAccessRequestDto,
  SubjectDataDto,
} from "./types/compliance.types";

// Types - Storage (Phase 4)
export type {
  RetentionPolicyDto as StorageRetentionPolicyDto,
  ForensicEvidenceDto,
  BackupConfigDto,
  BackupJobDto,
  BastionKpisDto,
} from "./types/storage.types";

// Types - Integration (Phase 4)
export type {
  IntegrationEndpointDto,
  FireAlarmEventDto,
  BmsEventDto,
} from "./types/integration.types";

// Constants - BASTION Event Types (Phase 4)
export { BASTION_EVENT_TYPES } from "./constants/bastion-event-types";
export type { BastionEventType } from "./constants/bastion-event-types";

// Constants - BASTION Module Keys (Phase 4)
export { BASTION_MODULE_KEYS } from "./constants/feature-keys";
export type { BastionModuleKey } from "./constants/feature-keys";

// ── BASTION Pack ──
export {
  createFaceSchema,
  createAccessGroupSchema,
  createCredentialSiteAccessSchema,
} from "./schemas/access.schema";
export type {
  CreateFaceInput,
  CreateAccessGroupInput,
  CreateCredentialSiteAccessInput,
} from "./schemas/access.schema";
