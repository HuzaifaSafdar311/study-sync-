import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { TOOLS_INPUT_DIR } from './tools.queue';
import { toolsService } from './tools.service';

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
export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

/**
 * Middleware to catch Multer file size limit error cleanly
 */
export const handleUpload = (req: any, res: Response, next: NextFunction) => {
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

export class ToolsController {
  /**
   * GET /api/tools/health
   * Returns status of external binaries (soffice, gs) and tool queue availability
   */
  public getHealth = (_req: Request, res: Response): void => {
    const diagnostics = toolsService.getHealthDiagnostics();
    res.json({
      success: true,
      data: diagnostics,
    });
  };

  /**
   * POST /api/tools/convert
   * Uploads Office document and queues server-side conversion to PDF via LibreOffice.
   */
  public convertFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded. Please select a DOCX or PPTX file.',
        });
        return;
      }

      const userId = (req as any).userId || 'anonymous';
      const result = await toolsService.queueConvert({
        userId,
        file: req.file,
      });

      res.status(202).json({
        success: true,
        message: 'Conversion job queued successfully.',
        data: result,
      });
    } catch (error: any) {
      if (error.statusCode) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
        return;
      }
      next(error);
    }
  };

  /**
   * POST /api/tools/compress
   * Uploads a document or image and queues server-side compression.
   */
  public compressFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No file uploaded. Please select a PDF, DOCX, PPTX, JPG, or PNG file.',
        });
        return;
      }

      const userId = (req as any).userId || 'anonymous';
      const qualityLevel = (req.body.qualityLevel as any) || 'ebook';

      const result = await toolsService.queueCompress({
        userId,
        file: req.file,
        qualityLevel,
      });

      res.status(202).json({
        success: true,
        message: 'Compression job queued successfully.',
        data: result,
      });
    } catch (error: any) {
      if (error.statusCode) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
        return;
      }
      next(error);
    }
  };

  /**
   * GET /api/tools/jobs/:id
   * Polls job status. Returns status ('pending' | 'processing' | 'done' | 'failed')
   * and compression metrics if applicable.
   */
  public getJobStatus = (req: Request, res: Response): void => {
    const id = String(req.params.id);
    const job = toolsService.getJob(id);

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
  };

  /**
   * GET /api/tools/jobs/:id/download
   * Streams/sends the converted or compressed result file once status is 'done'.
   */
  public downloadJobResult = (req: Request, res: Response): void => {
    try {
      const id = String(req.params.id);
      const job = toolsService.getJob(id);

      if (!job) {
        res.status(404).json({ success: false, message: 'Job not found or temporary files expired.' });
        return;
      }

      const reqUserId = (req as any).userId;
      if (job.userId && job.userId !== 'anonymous' && job.userId !== reqUserId) {
        res.status(403).json({
          success: false,
          message: 'Access denied: You do not have permission to download this file.',
        });
        return;
      }

      const { filePath, filename } = toolsService.getDownloadFile(id);

      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
      res.download(filePath, filename, (err) => {
        if (err && !res.headersSent) {
          console.error('[ToolsController] File download error:', err.message);
          res.status(500).json({ success: false, message: 'Failed to download file.' });
        }
      });
    } catch (error: any) {
      if (error.statusCode) {
        res.status(error.statusCode).json({
          success: false,
          message: error.message,
        });
        return;
      }
      res.status(500).json({ success: false, message: 'Failed to download file.' });
    }
  };
}

export const toolsController = new ToolsController();
