import { MiddlewareConsumer, Module, NestModule, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { HealthModule } from './modules/health/health.module';
import { OrganizationModule } from './modules/organization/organization.module';
import { InviteModule } from './modules/organization/invite/invite.module';
import { KioskModule } from './modules/kiosk/kiosk.module';
import { CameraModule } from './modules/camera/camera.module';
import { AlertModule } from './modules/alert/alert.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { QueueModule } from './modules/queue/queue.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { InferenceModule } from './modules/inference/inference.module';
import { AuditModule } from './modules/audit/audit.module';
import { NotificationModule } from './modules/notification/notification.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ChatModule } from './modules/chat/chat.module';
import { ControllerModule } from './modules/controller/controller.module';
import { SupervisionModule } from './modules/supervision/supervision.module';
import { MqttModule } from './mqtt/mqtt.module';
import { AccessModule } from './modules/access/access.module';
import { DoorModule } from './modules/door/door.module';
import { CorrelationModule } from './modules/correlation/correlation.module';
import { IncidentModule } from './modules/incident/incident.module';
import { VisitorModule } from './modules/visitor/visitor.module';
import { AnprModule } from './modules/anpr/anpr.module';
import { AiModule } from './modules/ai/ai.module';
import { AiAgentModule } from './modules/ai-agent/ai-agent.module';
import { EquipmentModule } from './modules/equipment/equipment.module';
import { GovernanceModule } from './modules/governance/governance.module';
import { SsoModule } from './modules/sso/sso.module';
import { ApiKeyModule } from './modules/api-key/api-key.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { LicenseModule } from './modules/license/license.module';
import { ContactModule } from './modules/contact/contact.module';
import { DetectionModule } from './modules/detection/detection.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { RiskModule } from './modules/risk/risk.module';
import { PatternsModule } from './modules/patterns/patterns.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { TenantIsolationGuard } from './common/guards/tenant-isolation.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { FeatureGateGuard } from './common/guards/feature-gate.guard';
import { LicenseExpiryGuard } from './modules/license/guards/license-expiry.guard';
import { FeatureGateModule } from './modules/feature-gate/feature-gate.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { IngestionService } from './modules/ingestion/ingestion.service';
import { AuditInterceptor } from './modules/audit/audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
    }),
    ScheduleModule.forRoot(),
    // ── Alphabetical module order ──
    AccessModule,
    AiAgentModule,
    AiModule,
    AlertModule,
    AnalyticsModule,
    AnprModule,
    ApiKeyModule,
    AuditModule,
    AuthModule,
    CameraModule,
    ChatModule,
    ComplianceModule,
    ContactModule,
    ControllerModule,
    CorrelationModule,
    DashboardModule,
    DetectionModule,
    DoorModule,
    EquipmentModule,
    FeatureGateModule,
    GovernanceModule,
    HealthModule,
    IncidentModule,
    InferenceModule,
    IngestionModule,
    InviteModule,
    KioskModule,
    LicenseModule,
    MaintenanceModule,
    MqttModule,
    NotificationModule,
    NotificationsModule,
    OrganizationModule,
    PatternsModule,
    PrismaModule,
    QueueModule,
    RiskModule,
    SsoModule,
    SupervisionModule,
    UserModule,
    VisitorModule,
    WebhookModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantIsolationGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: FeatureGateGuard },
    { provide: APP_GUARD, useClass: LicenseExpiryGuard },
    // NOTE: TenantApiKeyGuard is NOT a global APP_GUARD — it's applied per-controller
    // via @UseGuards() on v1 controllers only. JWT-based routes don't need it.
    //
    // RATE LIMITER NOTE: The global @fastify/rate-limit protects /api/* routes.
    // v1 endpoints (/api/v1/*) use per-key rate limiting in TenantApiKeyGuard instead.
    // If the global rate limiter causes double-counting, configure it to exclude
    // /api/v1/* paths. Currently both may trigger (per-key guard runs inside NestJS
    // request lifecycle, Fastify rate limiter at HTTP layer) — acceptable for initial
    // delivery. Exclusion hook can be added in a follow-up.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule implements NestModule, OnModuleInit {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantContextMiddleware)
      .forRoutes('*');
  }

  constructor(private ingestionService: IngestionService) {}

  async onModuleInit() {
    // Auto-start cameras that were recording before restart
    try {
      await this.ingestionService.startAllActiveCameras();
    } catch {
      // Cameras may not exist yet (first run)
    }
  }
}
