import fs from 'fs';
import path from 'path';
import prisma from '../../config/database';
import { systemQuotaService } from '../ai/systemQuota.service';

const baseDir = process.env.VERCEL ? '/tmp' : process.cwd();
const STORAGE_DIR = path.resolve(baseDir, 'storage');

const UPLOADS_FILE = path.resolve(STORAGE_DIR, 'user_upload_stats.json');
const WHATSAPP_STATS_FILE = path.resolve(STORAGE_DIR, 'user_whatsapp_stats.json');
const EMAIL_STATS_FILE = path.resolve(STORAGE_DIR, 'user_email_stats.json');

interface UserUploadStats {
  totalBytes: number;
  filesCount: number;
  lastUploadedAt?: string;
  files?: Array<{ name: string; sizeBytes: number; courseId?: string; uploadedAt: string }>;
}

interface UserWhatsAppStats {
  sentCount: number;
  receivedCount: number;
  lastMessageAt?: string;
}

interface UserEmailStats {
  sentCount: number;
  lastSentAt?: string;
}

class UserAnalyticsService {
  private uploadsCache: Map<string, UserUploadStats> = new Map();
  private whatsappCache: Map<string, UserWhatsAppStats> = new Map();
  private emailCache: Map<string, UserEmailStats> = new Map();
  private loaded = false;

  constructor() {
    this.ensureStorageDir();
    this.loadAll();
  }

  private ensureStorageDir() {
    try {
      if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true });
      }
    } catch {}
  }

  private loadAll() {
    if (this.loaded) return;
    try {
      if (fs.existsSync(UPLOADS_FILE)) {
        const raw = JSON.parse(fs.readFileSync(UPLOADS_FILE, 'utf-8'));
        for (const [k, v] of Object.entries(raw)) {
          this.uploadsCache.set(k, v as UserUploadStats);
        }
      }
      if (fs.existsSync(WHATSAPP_STATS_FILE)) {
        const raw = JSON.parse(fs.readFileSync(WHATSAPP_STATS_FILE, 'utf-8'));
        for (const [k, v] of Object.entries(raw)) {
          this.whatsappCache.set(k, v as UserWhatsAppStats);
        }
      }
      if (fs.existsSync(EMAIL_STATS_FILE)) {
        const raw = JSON.parse(fs.readFileSync(EMAIL_STATS_FILE, 'utf-8'));
        for (const [k, v] of Object.entries(raw)) {
          this.emailCache.set(k.toLowerCase(), v as UserEmailStats);
        }
      }
    } catch (e) {
      console.warn('[UserAnalyticsService] Error loading stats files:', e);
    }
    this.loaded = true;
  }

  private saveUploads() {
    try {
      this.ensureStorageDir();
      const obj: Record<string, UserUploadStats> = {};
      for (const [k, v] of this.uploadsCache.entries()) obj[k] = v;
      fs.writeFileSync(UPLOADS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[UserAnalyticsService] Error saving uploads:', e);
    }
  }

  private saveWhatsApp() {
    try {
      this.ensureStorageDir();
      const obj: Record<string, UserWhatsAppStats> = {};
      for (const [k, v] of this.whatsappCache.entries()) obj[k] = v;
      fs.writeFileSync(WHATSAPP_STATS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[UserAnalyticsService] Error saving WhatsApp stats:', e);
    }
  }

  private saveEmail() {
    try {
      this.ensureStorageDir();
      const obj: Record<string, UserEmailStats> = {};
      for (const [k, v] of this.emailCache.entries()) obj[k] = v;
      fs.writeFileSync(EMAIL_STATS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[UserAnalyticsService] Error saving email stats:', e);
    }
  }

  /**
   * Records a file upload for a specific user
   */
  recordUpload(userId: string, filename: string, sizeBytes: number, courseId?: string) {
    this.loadAll();
    const existing = this.uploadsCache.get(userId) || { totalBytes: 0, filesCount: 0, files: [] };
    const newBytes = (existing.totalBytes || 0) + sizeBytes;
    const newCount = (existing.filesCount || 0) + 1;
    const filesList = existing.files || [];
    filesList.push({
      name: filename,
      sizeBytes,
      courseId,
      uploadedAt: new Date().toISOString(),
    });

    this.uploadsCache.set(userId, {
      totalBytes: newBytes,
      filesCount: newCount,
      lastUploadedAt: new Date().toISOString(),
      files: filesList.slice(-50), // Keep recent 50 files
    });
    this.saveUploads();
  }

  /**
   * Returns upload statistics for a user
   */
  getUploadStats(userId: string): { totalBytes: number; totalMB: number; filesCount: number } {
    this.loadAll();
    const data = this.uploadsCache.get(userId);
    if (data && data.totalBytes > 0) {
      const mb = Math.round((data.totalBytes / (1024 * 1024)) * 100) / 100;
      return {
        totalBytes: data.totalBytes,
        totalMB: mb,
        filesCount: data.filesCount || 0,
      };
    }
    return { totalBytes: 0, totalMB: 0, filesCount: 0 };
  }

  /**
   * Records an outbound or inbound WhatsApp message
   */
  recordWhatsAppMessage(identifier: string, direction: 'sent' | 'received' = 'sent') {
    if (!identifier) return;
    this.loadAll();
    const cleanId = identifier.replace(/[^0-9]/g, '');
    const key = cleanId || identifier;
    const existing = this.whatsappCache.get(key) || { sentCount: 0, receivedCount: 0 };

    if (direction === 'sent') {
      existing.sentCount = (existing.sentCount || 0) + 1;
    } else {
      existing.receivedCount = (existing.receivedCount || 0) + 1;
    }
    existing.lastMessageAt = new Date().toISOString();

    this.whatsappCache.set(key, existing);
    this.saveWhatsApp();
  }

  /**
   * Returns WhatsApp message stats for a user (by userId or phone)
   */
  getWhatsAppStats(userId: string, whatsappNumber?: string | null): {
    isIntegrated: boolean;
    number: string | null;
    messagesSent: number;
    messagesReceived: number;
  } {
    this.loadAll();
    const cleanPhone = (whatsappNumber || '').replace(/[^0-9]/g, '');
    const isIntegrated = Boolean(cleanPhone && cleanPhone.length >= 7);

    // Look up by clean phone or userId
    const byPhone = cleanPhone ? this.whatsappCache.get(cleanPhone) : null;
    const byUser = this.whatsappCache.get(userId);

    const sent = (byPhone?.sentCount || 0) + (byUser?.sentCount || 0);
    const received = (byPhone?.receivedCount || 0) + (byUser?.receivedCount || 0);

    return {
      isIntegrated,
      number: whatsappNumber || null,
      messagesSent: sent,
      messagesReceived: received,
    };
  }

  /**
   * Records an outbound email sent to an email address
   */
  recordEmailSent(email: string) {
    if (!email) return;
    this.loadAll();
    const key = email.toLowerCase().trim();
    const existing = this.emailCache.get(key) || { sentCount: 0 };
    existing.sentCount = (existing.sentCount || 0) + 1;
    existing.lastSentAt = new Date().toISOString();

    this.emailCache.set(key, existing);
    this.saveEmail();
  }

  /**
   * Returns email dispatch statistics for a user
   */
  getEmailStats(email: string): { sentCount: number; lastSentAt?: string } {
    this.loadAll();
    const key = (email || '').toLowerCase().trim();
    const data = this.emailCache.get(key);
    return {
      sentCount: data?.sentCount || 0,
      lastSentAt: data?.lastSentAt,
    };
  }

  /**
   * Gathers full 360-degree analytics for a single student
   */
  async getUserFullAnalytics(user: {
    id: string;
    email: string;
    whatsappNumber?: string | null;
    aiProviderPreference?: string;
    activeByokProvider?: string | null;
  }) {
    // 1. System AI Quota & Usage
    const quota = await systemQuotaService.checkSystemQuota(user.id);
    const systemUsage = {
      used: quota.count,
      limit: quota.limit,
      remaining: quota.remaining,
      isByok: quota.isByok,
      provider: quota.isByok ? (user.activeByokProvider || quota.activeProvider || 'byok') : undefined,
    };

    // 2. Upload Stats
    let uploads = this.getUploadStats(user.id);
    // If upload stats file had 0, check database course_materials content as fallback
    if (uploads.totalBytes === 0) {
      try {
        const materials = await prisma.courseMaterial.findMany({
          where: { userId: user.id },
          select: { content: true, title: true },
        });
        if (materials && materials.length > 0) {
          let byteCount = 0;
          materials.forEach((m: any) => {
            byteCount += Buffer.byteLength(m.content || '', 'utf-8');
          });
          const mb = Math.round((byteCount / (1024 * 1024)) * 100) / 100;
          uploads = {
            totalBytes: byteCount,
            totalMB: Math.max(0.1, mb),
            filesCount: materials.length,
          };
        }
      } catch {}
    }

    // 3. WhatsApp Stats
    const wa = this.getWhatsAppStats(user.id, user.whatsappNumber);

    // 4. Email Stats
    const emailData = this.getEmailStats(user.email);

    return {
      systemAiUsage: systemUsage,
      uploads,
      whatsapp: {
        isIntegrated: wa.isIntegrated,
        number: wa.number,
        messagesSent: wa.messagesSent,
      },
      emails: {
        sentCount: emailData.sentCount,
      },
    };
  }

  /**
   * Returns aggregated telemetry totals across all users
   */
  getGlobalTelemetryTotals() {
    this.loadAll();
    let totalUploadBytes = 0;
    let totalUploadedFiles = 0;
    for (const u of this.uploadsCache.values()) {
      totalUploadBytes += u.totalBytes || 0;
      totalUploadedFiles += u.filesCount || 0;
    }
    const totalUploadMB = Math.round((totalUploadBytes / (1024 * 1024)) * 100) / 100;

    let totalWhatsAppSent = 0;
    for (const w of this.whatsappCache.values()) {
      totalWhatsAppSent += w.sentCount || 0;
    }

    let totalEmailsSent = 0;
    for (const e of this.emailCache.values()) {
      totalEmailsSent += e.sentCount || 0;
    }

    const allUsage = systemQuotaService.getAllUsage();
    let totalSystemAiCalls = 0;
    for (const rec of allUsage.values()) {
      totalSystemAiCalls += rec.count || 0;
    }

    return {
      totalUploadBytes,
      totalUploadMB,
      totalUploadedFiles,
      totalWhatsAppSent,
      totalEmailsSent,
      totalSystemAiCalls,
    };
  }
}

export const userAnalyticsService = new UserAnalyticsService();
