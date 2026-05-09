import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ValidationPipe, Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { v4 as uuidv4 } from "uuid";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import helmet from "@fastify/helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    { logger: ["log", "error", "warn", "debug"] }
  );

  const configService = app.get(ConfigService);

  // ── Trust proxy (behind Traefik/Caddy/Nginx) ──
  if (configService.get<boolean>("trustProxy", true)) {
    (app.getHttpAdapter().getInstance() as any).trustProxy = true;
  }

  // ── Request ID ──
  app
    .getHttpAdapter()
    .getInstance()
    .addHook("onRequest", async (request: any, reply: any) => {
      request.id = request.headers["x-request-id"] || uuidv4();
      reply.header("X-Request-ID", request.id);
    });

  // ── Security headers (Helmet) ──
  const nodeEnv = configService.get<string>("nodeEnv", "development");
  await app.register(helmet, {
    contentSecurityPolicy: nodeEnv === "production" ? undefined : false,
  });

  await app.register(cookie);

  // ── Rate limiting ──
  const rateLimitMax = configService.get<number>("rateLimit.max", 100);
  const rateLimitTtl = configService.get<number>("rateLimit.ttl", 60);
  const rateLimitAuthMax = configService.get<number>(
    "rateLimit.authMax",
    5
  );

  await app.register(rateLimit, {
    max: rateLimitMax,
    timeWindow: `${rateLimitTtl} seconds`,
    keyGenerator: (request: any) => {
      return request.ip || request.raw?.socket?.remoteAddress || "unknown";
    },
    errorResponseBuilder: () => ({
      statusCode: 429,
      error: "Too Many Requests",
      message: "Trop de requêtes. Veuillez réessayer plus tard.",
    }),
  });

  // Stricter rate limit on auth endpoints
  app
    .getHttpAdapter()
    .getInstance()
    .addHook("onRoute", (routeOptions: any) => {
      const url = routeOptions.url || "";
      if (
        url.includes("/auth/login") ||
        url.includes("/auth/register") ||
        url.includes("/auth/refresh")
      ) {
        routeOptions.config = routeOptions.config || {};
        routeOptions.config.rateLimit = {
          max: rateLimitAuthMax,
          timeWindow: `${rateLimitTtl} seconds`,
        };
      }
    });

  app.setGlobalPrefix("api");

  // ── CORS ──
  const corsOrigin = configService.get<string>("cors.origin", "*");
  const allowedOrigins =
    corsOrigin === "*" ? true : corsOrigin.split(",").map((s) => s.trim());
  app.enableCors({
    origin: allowedOrigins,
    credentials: configService.get<boolean>("cors.credentials", true),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Request-ID",
      "Accept",
    ],
    exposedHeaders: ["X-Request-ID"],
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
    .addTag("notifications", "Notifications")
    .addTag("health", "Health checks")
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  const port = configService.get<number>("port", 4000);
  await app.listen(port, "0.0.0.0");

  logger.log(`🚀 API running on http://localhost:${port}/api`);
  logger.log(`📖 Swagger docs on http://localhost:${port}/api/docs`);
  logger.log(`🌍 CORS origins: ${corsOrigin}`);
  logger.log(
    `⏱️  Rate limit: ${rateLimitMax} req/${rateLimitTtl}s (auth: ${rateLimitAuthMax} req/${rateLimitTtl}s)`
  );
  logger.log(`🔒 Environment: ${nodeEnv}`);
}

bootstrap();
