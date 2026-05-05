/**
 * Centralized configuration factory for the API.
 * Every value is pulled from process.env with sensible defaults.
 * Validated by ConfigModule via Joi schema in app.module.ts.
 */
export default () => ({
  // ── Server ──
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // ── Database ──
  databaseUrl: process.env.DATABASE_URL || 'postgresql://oversight:oversight_dev@localhost:5432/oversight',

  // ── Redis ──
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // ── JWT ──
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'change-me-access-secret-in-prod',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'change-me-refresh-secret-in-prod',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  // ── AI / Inference ──
  aiPreprocessorUrl: process.env.AI_PREPROCESSOR_URL || 'http://localhost:8000',
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',

  // ── Qdrant ──
  qdrantUrl: process.env.QDRANT_URL || 'http://localhost:6333',

  // ── FCM / Push Notifications ──
  fcm: {
    serverKey: process.env.FCM_SERVER_KEY || '',
    // Path to service account JSON (alternative to server key)
    credentialsPath: process.env.FIREBASE_CREDENTIALS || '',
    // Generic webhook URL for push notifications (alternative to FCM)
    webhookUrl: process.env.PUSH_WEBHOOK_URL || '',
    enabled: !!(process.env.FCM_SERVER_KEY || process.env.FIREBASE_CREDENTIALS || process.env.PUSH_WEBHOOK_URL),
  },

  // ── CORS ──
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  // ── Rate Limiting ──
  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10), // seconds
    max: parseInt(process.env.RATE_LIMIT_MAX || '20', 10), // requests per TTL
  },
});
