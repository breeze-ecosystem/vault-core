export default () => ({
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  databaseUrl: process.env.DATABASE_URL,

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  aiPreprocessorUrl: process.env.AI_PREPROCESSOR_URL || 'http://localhost:8000',
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',

  qdrantUrl: process.env.QDRANT_URL || 'http://localhost:6333',

  fcm: {
    serverKey: process.env.FCM_SERVER_KEY || '',
    credentialsPath: process.env.FIREBASE_CREDENTIALS || '',
    webhookUrl: process.env.PUSH_WEBHOOK_URL || '',
    enabled: !!(process.env.FCM_SERVER_KEY || process.env.FIREBASE_CREDENTIALS || process.env.PUSH_WEBHOOK_URL),
  },

  resendApiKey: process.env.RESEND_API_KEY || '',
  resendFromEmail: process.env.RESEND_FROM_EMAIL || 'OVERSIGHT AI <onboarding@resend.dev>',

  dashboardUrl: process.env.DASHBOARD_URL || 'https://oversight.digitsoftafrica.com',

  notificationEnabled: process.env.NOTIFICATION_ENABLED !== 'false',

  cors: {
    origin: process.env.CORS_ORIGIN || '',
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },

  rateLimit: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    authMax: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5', 10),
  },

  trustProxy: process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production',

  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
    username: process.env.MQTT_USERNAME || '',
    password: process.env.MQTT_PASSWORD || '',
  },
});
