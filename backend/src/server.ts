import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { errorHandler, generalLimiter } from './middleware';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import taskRoutes from './modules/tasks/task.routes';
import voiceRoutes from './modules/voice/voice.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import courseRoutes from './modules/courses/course.routes';
import whatsappRoutes from './modules/whatsapp/whatsapp.routes';
import apiKeyRoutes from './modules/auth/apiKey.routes';
import adminRoutes from './modules/admin/admin.routes';
import toolsRoutes from './modules/tools/tools.routes';
import { whatsAppService } from './modules/whatsapp/whatsapp.service';
import {
  startStandaloneReminderEngine,
  checkAndInitRedisQueues,
} from './modules/notifications/notification.queue';
import { checkAndInitToolsQueues } from './modules/tools/tools.queue';
import { testSupabaseConnection } from './config/supabase';
import { pingRedis } from './config/redis';
import { findLibreOfficeBinary } from './modules/tools/workers/convert.worker';
import { findGhostscriptBinary } from './modules/tools/workers/compress.worker';

const app = express();

// ─── Security & Parsing Middleware ────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: config.isDev ? false : undefined,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}) as any);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5000',
  'http://localhost:3000',
  'https://studysync-tan.vercel.app',
  ...(config.frontendUrl ? config.frontendUrl.split(',').map((s) => s.trim()) : []),
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }
    return callback(new Error('CORS error: Origin not allowed by StudySync security policy'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-token', 'X-Requested-With'],
  exposedHeaders: ['Content-Disposition'],
}) as any);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser() as any);

// General rate limiter (100 req/min per IP)
app.use(generalLimiter as any);

// ─── Health Check ─────────────────────────────────────────────────────

const healthResponse = async (_req: express.Request, res: express.Response) => {
  let dbOk = false;
  try {
    dbOk = await testSupabaseConnection();
  } catch {
    dbOk = false;
  }

  let redisOk = false;
  try {
    redisOk = await pingRedis();
  } catch {
    redisOk = false;
  }

  const sofficePath = findLibreOfficeBinary();
  const sofficeOk = sofficePath !== null;

  const gsPath = findGhostscriptBinary();
  const gsOk = gsPath !== null;

  const allHealthy = dbOk && redisOk && sofficeOk && gsOk;
  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json({
    success: allHealthy,
    status: allHealthy ? 'healthy' : 'degraded',
    message: allHealthy ? 'StudySync API is fully operational.' : 'One or more subsystem health checks failed.',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    checks: {
      database: { status: dbOk ? 'ok' : 'failed' },
      redis: { status: redisOk ? 'ok' : 'failed' },
      binaries: {
        soffice: { status: sofficeOk ? 'ok' : 'failed', path: sofficePath },
        ghostscript: { status: gsOk ? 'ok' : 'failed', path: gsPath },
      },
    },
  });
};
app.get('/api/health', healthResponse);
app.get('/health', healthResponse);

// ─── API Routes (Mounted on both /api and root for Vercel serverless & local) ───

app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);

app.use('/api/tasks', taskRoutes);
app.use('/tasks', taskRoutes);

app.use('/api/voice', voiceRoutes);
app.use('/voice', voiceRoutes);

app.use('/api/notifications', notificationRoutes);
app.use('/notifications', notificationRoutes);

app.use('/api/courses', courseRoutes);
app.use('/courses', courseRoutes);

app.use('/api/whatsapp', whatsappRoutes);
app.use('/whatsapp', whatsappRoutes);

app.use('/api/user/keys', apiKeyRoutes);
app.use('/user/keys', apiKeyRoutes);

app.use('/api/admin', adminRoutes);
app.use('/admin', adminRoutes);

app.use('/api/tools', toolsRoutes);
app.use('/tools', toolsRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'This endpoint does not exist. Check the URL and try again.',
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────

app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────────────

const startServer = async () => {
  try {
    // Start automated standalone email & WhatsApp reminder engine (active with or without Redis)
    startStandaloneReminderEngine();

    // Initialize WhatsApp multi-device client (reconnects saved session or awaits QR scan)
    whatsAppService.init().catch((err) => {
      console.warn('[Server] WhatsApp init background notice:', err.message);
    });

    // Check Redis and enable BullMQ workers only if Redis is running locally
    checkAndInitRedisQueues().catch(() => {});

    // Check and initialize tools workers & diagnostic binary checks
    checkAndInitToolsQueues().catch((err) => {
      console.warn('[Server] Tools queue initialization notice:', err.message);
    });

    app.listen(config.port, () => {
      console.log('');
      console.log('  ╔══════════════════════════════════════════╗');
      console.log('  ║                                          ║');
      console.log('  ║   📚 StudySync AI — Backend Server       ║');
      console.log(`  ║   🌐 http://localhost:${config.port}              ║`);
      console.log(`  ║   🔧 Environment: ${config.nodeEnv.padEnd(19)}║`);
      console.log('  ║                                          ║');
      console.log('  ╚══════════════════════════════════════════╝');
      console.log('');
    });
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
};

// ─── Process-Level Error Handlers (prevent WhatsApp Baileys crashes) ──
process.on('unhandledRejection', (reason: any) => {
  const msg = reason?.message || String(reason);
  // Suppress known Baileys timeout / socket errors
  if (/timed out|connection closed|stream end/i.test(msg)) {
    console.warn('[Process] Suppressed unhandledRejection (Baileys socket):', msg);
    return;
  }
  console.error('[Process] Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err: Error) => {
  const msg = err?.message || '';
  if (/timed out|connection closed|stream end|ECONNRESET/i.test(msg)) {
    console.warn('[Process] Suppressed uncaughtException (Baileys socket):', msg);
    return;
  }
  console.error('[Process] Uncaught Exception:', err);
  // Only exit for truly fatal errors
  if (/EADDRINUSE|Cannot find module/i.test(msg)) {
    process.exit(1);
  }
});

// Only start standalone HTTP listener and background loops if NOT running as a Vercel Serverless Function
if (!process.env.VERCEL) {
  startServer();
}

export default app;
