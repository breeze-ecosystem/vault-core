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
import { SupervisionModule } from './modules/supervision/supervision.module';
import { MqttModule } from './mqtt/mqtt.module';
import { AccessModule } from './modules/access/access.module';
import { DoorModule } from './modules/door/door.module';
import { CorrelationModule } from './modules/correlation/correlation.module';
import { IncidentModule } from './modules/incident/incident.module';
import { VisitorModule } from './modules/visitor/visitor.module';
import { AnprModule } from './modules/anpr/anpr.module';
import { AiModule } from './modules/ai/ai.module';
import { EquipmentModule } from './modules/equipment/equipment.module';
import { GovernanceModule } from './modules/governance/governance.module';
import { LicenseModule } from './modules/license/license.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { RiskModule } from './modules/risk/risk.module';
import { PatternsModule } from './modules/patterns/patterns.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { TenantIsolationGuard } from './common/guards/tenant-isolation.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { FeatureGateGuard } from './common/guards/feature-gate.guard';
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
    PrismaModule,
    AuthModule,
    UserModule,
    HealthModule,
    OrganizationModule,
    InviteModule,
    CameraModule,
    AlertModule,
    DashboardModule,
    QueueModule,
    IngestionModule,
    InferenceModule,
    AuditModule,
    NotificationModule,
    NotificationsModule,
    ChatModule,
    SupervisionModule,
    MqttModule,
    AccessModule,
    DoorModule,
    CorrelationModule,
    IncidentModule,
    VisitorModule,
    AnprModule,
    AiModule,
    EquipmentModule,
    GovernanceModule,
    AnalyticsModule,
    RiskModule,
    PatternsModule,
    MaintenanceModule,
    FeatureGateModule,
    LicenseModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantIsolationGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: FeatureGateGuard },
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
