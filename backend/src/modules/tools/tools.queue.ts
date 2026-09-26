import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../../config';
import { processConvertJob, ConvertJobData, findLibreOfficeBinary } from './workers/convert.worker';
import { processCompressJob, CompressJobData, findGhostscriptBinary } from './workers/compress.worker';

export interface ToolJobRecord {
  id: string;
  userId: string;
  type: 'convert' | 'compress';
  status: 'pending' | 'processing' | 'done' | 'failed';
  originalName: string;
  mimeType?: string;
  inputPath: string;
  resultPath?: string;
  resultFilename?: string;
  originalSize: number;
  compressedSize?: number;
  reductionPercent?: number;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
  expiresAt: Date;
}

// In-memory persistent job registry for status polling and download lookups
const toolJobsStore = new Map<string, ToolJobRecord>();

// Dedicated directory for tool processing
const BASE_STORAGE = process.env.VERCEL ? '/tmp/studysync_tools' : path.resolve(process.cwd(), 'storage', 'tools_temp');
export const TOOLS_INPUT_DIR = path.join(BASE_STORAGE, 'input');
export const TOOLS_OUTPUT_DIR = path.join(BASE_STORAGE, 'output');

// Ensure storage directories exist
try {
  if (!fs.existsSync(TOOLS_INPUT_DIR)) fs.mkdirSync(TOOLS_INPUT_DIR, { recursive: true });
  if (!fs.existsSync(TOOLS_OUTPUT_DIR)) fs.mkdirSync(TOOLS_OUTPUT_DIR, { recursive: true });
} catch (err: any) {
  console.warn('[ToolsStorage] Directory creation note:', err.message);
}

// BullMQ Queue references
const CONVERT_QUEUE_NAME = 'tool-convert-jobs';
const COMPRESS_QUEUE_NAME = 'tool-compress-jobs';

let convertQueue: Queue | null = null;
let compressQueue: Queue | null = null;
let isRedisAvailable = false;

const redisConnectionConfig = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  retryStrategy: (times: number) => (times > 1 ? null : 1000),
};

/**
 * Health check diagnostics: checks for LibreOffice and Ghostscript binaries.
 * Fails loudly with explicit warnings if missing.
 */
export function checkToolBinaries(): {
  libreOffice: boolean;
  libreOfficePath: string | null;
  ghostscript: boolean;
  ghostscriptPath: string | null;
} {
  const loPath = findLibreOfficeBinary();
  const gsPath = findGhostscriptBinary();

  const loAvailable = !!loPath;
  const gsAvailable = !!gsPath;

  console.log('');
  console.log('  ┌────────────────────────────────────────────────────────┐');
  console.log('  │          🛠️  StudySync Document Tools Health           │');
  console.log('  ├────────────────────────────────────────────────────────┤');
  console.log(`  │  LibreOffice (soffice) : ${loAvailable ? '✅ Ready (' + loPath + ')' : '❌ MISSING — DOCX/PPTX to PDF will fail'} `);
  console.log(`  │  Ghostscript (gs)      : ${gsAvailable ? '✅ Ready (' + gsPath + ')' : '❌ MISSING — PDF compression will fail'} `);
  console.log(`  │  Sharp Image Engine    : ✅ Active (In-process C++ bindings) `);
  console.log('  └────────────────────────────────────────────────────────┘');
  console.log('');

  return {
    libreOffice: loAvailable,
    libreOfficePath: loPath,
    ghostscript: gsAvailable,
    ghostscriptPath: gsPath,
  };
}

/**
 * Initializes Redis & BullMQ workers for document tools, or activates
 * the in-process background worker if Redis is not present.
 */
export async function checkAndInitToolsQueues(): Promise<boolean> {
  // Always run startup health check on server start
  checkToolBinaries();

  // Start periodic 1-hour file auto-deletion cleanup
  startAutoCleanupTimer();

  try {
    const probe = new IORedis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      connectTimeout: 800,
      maxRetriesPerRequest: 0,
      retryStrategy: () => null,
      lazyConnect: true,
    });
    probe.on('error', () => {});
    await probe.connect();
    await probe.ping();
    await probe.quit();

    isRedisAvailable = true;
    console.log('[ToolsQueue] ✅ Connected to Redis — BullMQ tool workers active.');

    convertQueue = new Queue(CONVERT_QUEUE_NAME, {
      connection: redisConnectionConfig,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      },
    });

    compressQueue = new Queue(COMPRESS_QUEUE_NAME, {
      connection: redisConnectionConfig,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      },
    });

    startToolsWorkers();
    return true;
  } catch {
    isRedisAvailable = false;
    console.log('[ToolsQueue] ℹ️  Redis not running locally for tools.');
    console.log('[ToolsQueue] 🚀 Running in Standalone In-Process Tools Worker Mode');
    return false;
  }
}

/**
 * Start BullMQ workers when Redis is active
 */
function startToolsWorkers() {
  new Worker(
    CONVERT_QUEUE_NAME,
    async (job: Job<ConvertJobData>) => {
      await executeConvertJob(job.data);
    },
    { connection: redisConnectionConfig, concurrency: 3 }
  );

  new Worker(
    COMPRESS_QUEUE_NAME,
    async (job: Job<CompressJobData>) => {
      await executeCompressJob(job.data);
    },
    { connection: redisConnectionConfig, concurrency: 3 }
  );
}

/**
 * Core Convert Executor
 */
async function executeConvertJob(data: ConvertJobData): Promise<void> {
  const record = toolJobsStore.get(data.jobId);
  if (record) {
    record.status = 'processing';
  }

  try {
    const result = await processConvertJob(data);
    if (record) {
      record.status = 'done';
      record.resultPath = result.outputPath;
      record.resultFilename = result.outputFilename;
      record.completedAt = new Date();
    }
  } catch (error: any) {
    console.error(`[ToolsQueue] Convert job ${data.jobId} failed:`, error.message);
    if (record) {
      record.status = 'failed';
      record.error = error.message;
      record.completedAt = new Date();
    }
  }
}

/**
 * Core Compress Executor
 */
async function executeCompressJob(data: CompressJobData): Promise<void> {
  const record = toolJobsStore.get(data.jobId);
  if (record) {
    record.status = 'processing';
  }

  try {
    const result = await processCompressJob(data);
    if (record) {
      record.status = 'done';
      record.resultPath = result.outputPath;
      record.resultFilename = result.outputFilename;
      record.compressedSize = result.compressedSize;
      record.reductionPercent = result.reductionPercent;
      record.completedAt = new Date();
    }
  } catch (error: any) {
    console.error(`[ToolsQueue] Compress job ${data.jobId} failed:`, error.message);
    if (record) {
      record.status = 'failed';
      record.error = error.message;
      record.completedAt = new Date();
    }
  }
}

// ─── Public API for Queueing Jobs ─────────────────────────────────────

/**
 * Enqueue a DOCX/PPTX to PDF conversion job
 */
export async function queueConvertJob(params: {
  userId: string;
  originalName: string;
  inputPath: string;
  originalSize: number;
}): Promise<string> {
  const jobId = uuidv4();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

  const record: ToolJobRecord = {
    id: jobId,
    userId: params.userId,
    type: 'convert',
    status: 'pending',
    originalName: params.originalName,
    inputPath: params.inputPath,
    originalSize: params.originalSize,
    createdAt: new Date(),
    expiresAt,
  };

  toolJobsStore.set(jobId, record);

  const jobPayload: ConvertJobData = {
    jobId,
    inputPath: params.inputPath,
    originalName: params.originalName,
    outputDir: TOOLS_OUTPUT_DIR,
  };

  if (isRedisAvailable && convertQueue) {
    await convertQueue.add('convert-doc', jobPayload, { jobId });
  } else {
    // Standalone async execution (does not block HTTP response)
    setImmediate(() => {
      executeConvertJob(jobPayload).catch((e) => console.error('[ToolsStandalone] Convert error:', e));
    });
  }

  return jobId;
}

/**
 * Enqueue a Document Compression job (PDF, DOCX, PPTX, JPG, PNG)
 */
export async function queueCompressJob(params: {
  userId: string;
  originalName: string;
  inputPath: string;
  originalSize: number;
  mimeType?: string;
  qualityLevel?: 'ebook' | 'screen' | 'prepress';
}): Promise<string> {
  const jobId = uuidv4();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

  const record: ToolJobRecord = {
    id: jobId,
    userId: params.userId,
    type: 'compress',
    status: 'pending',
    originalName: params.originalName,
    mimeType: params.mimeType,
    inputPath: params.inputPath,
    originalSize: params.originalSize,
    createdAt: new Date(),
    expiresAt,
  };

  toolJobsStore.set(jobId, record);

  const jobPayload: CompressJobData = {
    jobId,
    inputPath: params.inputPath,
    originalName: params.originalName,
    outputDir: TOOLS_OUTPUT_DIR,
    mimeType: params.mimeType,
    qualityLevel: params.qualityLevel || 'ebook',
  };

  if (isRedisAvailable && compressQueue) {
    await compressQueue.add('compress-doc', jobPayload, { jobId });
  } else {
    // Standalone async execution
    setImmediate(() => {
      executeCompressJob(jobPayload).catch((e) => console.error('[ToolsStandalone] Compress error:', e));
    });
  }

  return jobId;
}

/**
 * Get job status by ID
 */
export function getToolJob(jobId: string): ToolJobRecord | undefined {
  return toolJobsStore.get(jobId);
}

// ─── Auto-Deletion Cleanup Engine ─────────────────────────────────────

/**
 * Purges files and job records older than 1 hour from server storage
 */
export function purgeExpiredToolFiles(): { deletedCount: number } {
  const now = Date.now();
  let deletedCount = 0;

  for (const [id, record] of toolJobsStore.entries()) {
    if (record.expiresAt.getTime() <= now) {
      try {
        if (record.inputPath && fs.existsSync(record.inputPath)) {
          fs.unlinkSync(record.inputPath);
          deletedCount++;
        }
        if (record.resultPath && fs.existsSync(record.resultPath)) {
          fs.unlinkSync(record.resultPath);
          deletedCount++;
        }
      } catch (err: any) {
        console.warn(`[ToolsCleanup] Error deleting file for job ${id}:`, err.message);
      }
      toolJobsStore.delete(id);
    }
  }

  return { deletedCount };
}

let cleanupTimer: NodeJS.Timeout | null = null;
function startAutoCleanupTimer() {
  if (cleanupTimer) return;
  // Run cleanup every 15 minutes
  cleanupTimer = setInterval(() => {
    const { deletedCount } = purgeExpiredToolFiles();
    if (deletedCount > 0) {
      console.log(`[ToolsCleanup] 🧹 Auto-deleted ${deletedCount} expired temporary files (> 1 hour old).`);
    }
  }, 15 * 60 * 1000);
}
