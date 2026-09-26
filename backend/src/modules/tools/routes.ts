import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  queueConvertJob,
  queueCompressJob,
  getToolJob,
  checkToolBinaries,
  TOOLS_INPUT_DIR,
} from './queue';

const router = Router();

// Multer storage: save incoming file directly to TOOLS_INPUT_DIR with unique prefix
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, TOOLS_INPUT_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${uuidv4()}_${Date.now()}${ext}`;
    cb(null, safeName);
  },
});

// Enforce strict 25MB maximum limit per upload
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

// Middleware to catch Multer file size limit error cleanly
const handleUpload = (req: any, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size exceeds maximum allowed limit of 25MB.',
        });
      }
      return res.status(400).json({
        success: false,
        message: `File upload error: ${err.message}`,
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload failed.',
      });
    }
    next();
  });
};

/**
 * GET /api/tools/health
 * Returns status of external binaries (soffice, gs) and tool queue availability
 */
router.get('/health', (_req, res) => {
  const diagnostics = checkToolBinaries();
  res.json({
    success: true,
    data: diagnostics,
  });
});

/**
 * POST /api/tools/convert
 * Uploads Office document (DOCX, PPTX, etc.) and queues server-side conversion to PDF via LibreOffice.
 * Returns job ID immediately. Does not process synchronously.
 */
router.post(
  '/convert',
  handleUpload,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded. Please select a DOCX or PPTX file.',
        });
        return;
      }

      const originalName = req.file.originalname;
      const ext = path.extname(originalName).toLowerCase();
      const validExtensions = ['.docx', '.pptx', '.doc', '.ppt', '.odt', '.rtf'];

      if (!validExtensions.includes(ext)) {
        // Delete uploaded file if invalid extension
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

        res.status(400).json({
          success: false,
          message: `Unsupported file format for conversion: ${ext}. Supported: DOCX, PPTX, DOC, PPT, ODT, RTF.`,
        });
        return;
      }

      const jobId = await queueConvertJob({
        userId: (req as any).userId || 'anonymous',
        originalName,
        inputPath: req.file.path,
        originalSize: req.file.size,
      });

      res.status(202).json({
        success: true,
        message: 'Conversion job queued successfully.',
        data: {
          jobId,
          type: 'convert',
          status: 'pending',
          originalName,
          originalSize: req.file.size,
          pollUrl: `/api/tools/jobs/${jobId}`,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/tools/compress
 * Uploads a document or image and queues server-side compression.
 * Branches to Ghostscript (PDF), Unzip+Sharp+Rezip (DOCX/PPTX), or Sharp (JPG/PNG).
 * Returns job ID immediately.
 */
router.post(
  '/compress',
  handleUpload,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded. Please select a PDF, DOCX, PPTX, JPG, or PNG file.',
        });
        return;
      }

      const originalName = req.file.originalname;
      const ext = path.extname(originalName).toLowerCase();
      const validExtensions = ['.pdf', '.docx', '.pptx', '.jpg', '.jpeg', '.png', '.webp'];

      if (!validExtensions.includes(ext)) {
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

        res.status(400).json({
          success: false,
          message: `Unsupported file format for compression: ${ext}. Supported: PDF, DOCX, PPTX, JPG, PNG, WEBP.`,
        });
        return;
      }

      const qualityLevel = (req.body.qualityLevel as any) || 'ebook';

      const jobId = await queueCompressJob({
        userId: (req as any).userId || 'anonymous',
        originalName,
        inputPath: req.file.path,
        originalSize: req.file.size,
        mimeType: req.file.mimetype,
        qualityLevel,
      });

      res.status(202).json({
        success: true,
        message: 'Compression job queued successfully.',
        data: {
          jobId,
          type: 'compress',
          status: 'pending',
          originalName,
          originalSize: req.file.size,
          pollUrl: `/api/tools/jobs/${jobId}`,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/tools/jobs/:id
 * Polls job status. Returns status ('pending' | 'processing' | 'done' | 'failed')
 * and compression metrics if applicable.
 */
router.get('/jobs/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const job = getToolJob(id);

  if (!job) {
    res.status(404).json({
      success: false,
      message: 'Job not found or temporary files expired (older than 1 hour).',
    });
    return;
  }

  res.json({
    success: true,
    data: {
      id: job.id,
      type: job.type,
      status: job.status,
      originalName: job.originalName,
      originalSize: job.originalSize,
      compressedSize: job.compressedSize,
      reductionPercent: job.reductionPercent,
      error: job.error,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      downloadUrl: job.status === 'done' ? `/api/tools/jobs/${job.id}/download` : undefined,
    },
  });
});

/**
 * GET /api/tools/jobs/:id/download
 * Streams/sends the converted or compressed result file once status is 'done'.
 */
router.get('/jobs/:id/download', (req: Request, res: Response) => {
  const id = String(req.params.id);
  const job = getToolJob(id);

  if (!job) {
    res.status(404).json({
      success: false,
      message: 'Job not found or expired.',
    });
    return;
  }

  if (job.status !== 'done' || !job.resultPath) {
    res.status(400).json({
      success: false,
      message: `Job is not ready for download (current status: ${job.status}).`,
    });
    return;
  }

  if (!fs.existsSync(job.resultPath)) {
    res.status(410).json({
      success: false,
      message: 'Result file has already expired and was removed from storage.',
    });
    return;
  }

  const filename = job.resultFilename || path.basename(job.resultPath);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  res.download(job.resultPath, filename, (err) => {
    if (err && !res.headersSent) {
      console.error('[ToolsRoutes] File download error:', err.message);
      res.status(500).json({ success: false, message: 'Failed to download file.' });
    }
  });
});

export default router;
