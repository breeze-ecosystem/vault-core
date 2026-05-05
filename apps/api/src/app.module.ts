import { MiddlewareConsumer, Module, OnModuleInit } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import configuration from "./config/configuration";
import { validationSchema } from "./config/validation";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UserModule } from "./modules/user/user.module";
import { HealthModule } from "./modules/health/health.module";
import { SiteModule } from "./modules/site/site.module";
import { CameraModule } from "./modules/camera/camera.module";
import { AlertModule } from "./modules/alert/alert.module";
import { DashboardModule } from "./modules/dashboard/dashboard.module";
import { QueueModule } from "./modules/queue/queue.module";
import { IngestionModule } from "./modules/ingestion/ingestion.module";
import { InferenceModule } from "./modules/inference/inference.module";
import { AuditModule } from "./modules/audit/audit.module";
import { NotificationModule } from "./modules/notification/notification.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { AuditMiddleware } from "./audit/audit.middleware";
import { IngestionService } from "./modules/ingestion/ingestion.service";

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
    PrismaModule,
    AuthModule,
    UserModule,
    HealthModule,
    SiteModule,
    CameraModule,
    AlertModule,
    DashboardModule,
    QueueModule,
    IngestionModule,
    InferenceModule,
    AuditModule,
    NotificationModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements OnModuleInit {
  constructor(private ingestionService: IngestionService) {}

  async onModuleInit() {
    // Auto-start cameras that were recording before restart
    try {
      await this.ingestionService.startAllActiveCameras();
    } catch {
      // Cameras may not exist yet (first run)
    }
  }

  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuditMiddleware).forRoutes('*');
  }
}
