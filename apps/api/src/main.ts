import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ValidationPipe, Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { AppModule } from "./app.module";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );

  const configService = app.get(ConfigService);

  await app.register(cookie);

  // Rate limiting
  await app.register(rateLimit, {
    max: configService.get<number>("rateLimit.max", 20),
    timeWindow: `${configService.get<number>("rateLimit.ttl", 60)} seconds`,
    // Stricter limits on auth endpoints
    keyGenerator: (request: any) => {
      return request.ip || request.raw?.socket?.remoteAddress || "unknown";
    },
  });

  app.setGlobalPrefix("api");

  const corsOrigin = configService.get<string>("cors.origin", "*");
  app.enableCors({
    origin: corsOrigin === "*" ? true : corsOrigin.split(","),
    credentials: configService.get<boolean>("cors.credentials", false),
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // Swagger documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle("OVERSIGHT AI API")
    .setDescription("Video intelligence platform - API documentation")
    .setVersion("1.0")
    .addBearerAuth()
    .addCookieAuth("refreshToken")
    .addTag("auth", "Authentication endpoints")
    .addTag("users", "User management")
    .addTag("sites", "Site management")
    .addTag("cameras", "Camera management")
    .addTag("alerts", "Alert management")
    .addTag("dashboard", "Dashboard & statistics")
    .addTag("ingestion", "Video stream ingestion")
    .addTag("audit", "Audit logs")
    .addTag("health", "Health checks")
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  const port = configService.get<number>("port", 4000);
  await app.listen(port, "0.0.0.0");
  logger.log(`API running on http://localhost:${port}/api`);
  logger.log(`Swagger docs on http://localhost:${port}/api/docs`);
  logger.log(`Environment: ${configService.get("nodeEnv", "development")}`);
}

bootstrap();
