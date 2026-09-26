import { Router } from 'express';
import { toolsController, handleUpload } from './tools.controller';
import { authGuard } from '../../middleware/authGuard';
import { adminAuthGuard } from '../../middleware/adminAuthGuard';
import { toolsProcessingLimiter } from '../../middleware/rateLimit';

const router = Router();

/**
 * GET /api/tools/health
 * Returns status of external binaries (soffice, gs) and tool queue availability.
 * Protected: Admin-only diagnostics route.
 */
router.get('/health', adminAuthGuard as any, toolsController.getHealth);

/**
 * POST /api/tools/convert
 * Uploads Office document (DOCX, PPTX, etc.) and queues server-side conversion to PDF via LibreOffice.
 * Protected: Requires student auth and strict CPU rate limiting.
 */
router.post('/convert', authGuard as any, toolsProcessingLimiter as any, handleUpload, toolsController.convertFile);

/**
 * POST /api/tools/compress
 * Uploads a document or image and queues server-side compression.
 * Branches to Ghostscript (PDF), Unzip+Sharp+Rezip (DOCX/PPTX), or Sharp (JPG/PNG).
 * Protected: Requires student auth and strict CPU rate limiting.
 */
router.post('/compress', authGuard as any, toolsProcessingLimiter as any, handleUpload, toolsController.compressFile);

/**
 * GET /api/tools/jobs/:id
 * Polls job status. Returns status ('pending' | 'processing' | 'done' | 'failed')
 * and compression metrics if applicable.
 */
router.get('/jobs/:id', toolsController.getJobStatus);

/**
 * GET /api/tools/jobs/:id/download
 * Streams/sends the converted or compressed result file once status is 'done'.
 */
router.get('/jobs/:id/download', authGuard as any, toolsController.downloadJobResult);

export default router;
