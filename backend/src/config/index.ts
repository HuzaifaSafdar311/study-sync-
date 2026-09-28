import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val || !val.trim()) {
    throw new Error(`[Config Error] Missing required environment variable: ${key}. Please check your .env configuration.`);
  }
  return val.trim();
}

export function validateStartupEnv(): void {
  const missing: string[] = [];
  if (!process.env.DATABASE_URL?.trim()) missing.push('DATABASE_URL');
  if (!process.env.JWT_ACCESS_SECRET?.trim()) missing.push('JWT_ACCESS_SECRET');
  if (!process.env.GROQ_API_KEY?.trim() && !process.env.GROQ_API_KEYS?.trim()) missing.push('GROQ_API_KEY');
  if (!process.env.GEMINI_API_KEY?.trim() && !process.env.GEMINI_API_KEYS?.trim()) missing.push('GEMINI_API_KEY');

  // SEC-001: Refuse to start in production if BYOK master encryption key is missing
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.BYOK_ENCRYPTION_SECRET?.trim() && !process.env.ENCRYPTION_MASTER_KEY?.trim()) {
      missing.push('BYOK_ENCRYPTION_SECRET');
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[Startup Validation Error] Missing required environment variables: ${missing.join(', ')}. Server cannot start without these.`
    );
  }
}

// Fail-fast validation at boot
validateStartupEnv();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: process.env.NODE_ENV !== 'production',

  // Database
  databaseUrl: requireEnv('DATABASE_URL'),
  supabase: {
    url: requireEnv('SUPABASE_URL'),
    anonKey: requireEnv('SUPABASE_ANON_KEY'),
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // JWT
  jwt: {
    accessSecret: requireEnv('JWT_ACCESS_SECRET'),
    refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Dedicated High-Security Admin JWT (completely isolated from student tokens)
  adminJwt: {
    secret: process.env.ADMIN_JWT_SECRET?.trim() || process.env.JWT_ACCESS_SECRET?.trim() || 'studysync_secure_admin_jwt_secret_key_2026',
    expiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '12h',
  },

  // Google OAuth
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/auth/google/callback` : 'http://localhost:5000/api/auth/google/callback'),
  },

  // Groq API (single or rotated keys)
  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    keys: (process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || '')
      .replace(/["']/g, '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean),
  },

  // Gemini API (single or rotated keys)
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    keys: (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '')
      .replace(/["']/g, '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean),
  },

  // Tavily API
  tavily: {
    apiKey: process.env.TAVILY_API_KEY || '',
  },

  // SendGrid
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'reminders@studysync.ai',
  },

  // WhatsApp Cloud API
  whatsapp: {
    token: process.env.WHATSAPP_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  },

  // Frontend
  frontendUrl:
    process.env.FRONTEND_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173'),
};
