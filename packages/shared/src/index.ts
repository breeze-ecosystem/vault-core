// Schemas
export { registerSchema, loginSchema, refreshSchema } from "./schemas/auth.schema";
export type { RegisterInput, LoginInput, RefreshInput } from "./schemas/auth.schema";

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

// Types - Door Monitoring
export type {
  DoorStateDto,
  DoorAlertJob,
  EmergencyOverrideEvent,
  DoorAlertConfig,
} from "./types/door.types";

// Types - Correlation (Video-Event Timeline & Tailgating)
export type {
  TimelineEntry,
  PaginatedTimelineResponse,
  CorrelationJob,
  TailgatingJob,
} from "./types/correlation.types";

// Schemas - Audit
export { auditQuerySchema, auditVerifySchema, auditExportSchema } from "./schemas/audit.schema";
export type { AuditQueryInput, AuditVerifyInput, AuditExportInput } from "./schemas/audit.schema";

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

// Types - Vehicle
export type { VehicleListEntryDto, VehicleEventDto } from "./types/vehicle.types";

// Schemas - AI
export { aiQuerySchema, aiAssistantSchema, aiSummarizeSchema } from "./schemas/ai.schema";
export type { AIQueryInput, AIAssistantInput, AISummarizeInput } from "./schemas/ai.schema";

// Types - AI
export type {
  AIQueryResult,
  AIQuerySpec,
  IncidentSummaryDto,
  AssistantResponse,
  TimelineEntry as AITimelineEntry,
} from "./types/ai.types";
