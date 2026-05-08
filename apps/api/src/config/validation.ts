/**
 * Joi validation schema for required environment variables.
 * Fails fast at startup if critical vars are missing or malformed.
 */
import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number().default(4000),

  DATABASE_URL: Joi.string().required(),

  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),

  JWT_ACCESS_SECRET: Joi.string().default('change-me-access-secret-in-prod'),
  JWT_REFRESH_SECRET: Joi.string().default('change-me-refresh-secret-in-prod'),
  JWT_ACCESS_EXPIRY: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRY: Joi.string().default('7d'),

  AI_PREPROCESSOR_URL: Joi.string().default('http://localhost:8000'),
  OLLAMA_BASE_URL: Joi.string().default('http://localhost:11434'),

  FCM_SERVER_KEY: Joi.string().optional().allow(''),
  FIREBASE_CREDENTIALS: Joi.string().optional().allow(''),
  PUSH_WEBHOOK_URL: Joi.string().optional().allow(''),

  // ── SMTP / Email ──
  SMTP_HOST: Joi.string().optional().allow(''),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().optional().allow(''),
  SMTP_PASS: Joi.string().optional().allow(''),
  SMTP_FROM: Joi.string().optional().allow(''),

  // ── Notifications ──
  NOTIFICATION_ENABLED: Joi.string().valid('true', 'false').default('true'),

  CORS_ORIGIN: Joi.string().default('*'),
  CORS_CREDENTIALS: Joi.string().valid('true', 'false').default('false'),

  RATE_LIMIT_TTL: Joi.number().default(60),
  RATE_LIMIT_MAX: Joi.number().default(20),
});
