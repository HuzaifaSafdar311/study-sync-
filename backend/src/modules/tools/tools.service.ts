import path from 'path';
import fs from 'fs';
import {
  queueConvertJob,
  queueCompressJob,
  getToolJob,
  checkToolBinaries,
  ToolJobRecord,
} from './tools.queue';

export const CONVERT_SUPPORTED_EXTENSIONS = ['.docx', '.pptx', '.doc', '.ppt', '.odt', '.rtf'];
export const COMPRESS_SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.pptx', '.jpg', '.jpeg', '.png', '.webp'];

export class ToolsService {
  /**
   * Return external binary health status (LibreOffice, Ghostscript, Sharp)
   */
  public getHealthDiagnostics() {
    return checkToolBinaries();
  }

  /**
   * Validates and enqueues a document conversion job
   */
  public async queueConvert(params: {
    userId: string;
    file: Express.Multer.File;
  }): Promise<{
    jobId: string;
    type: 'convert';
    status: 'pending';
    originalName: string;
    originalSize: number;
    pollUrl: string;
  }> {
    const { userId, file } = params;
    const ext = path.extname(file.originalname).toLowerCase();

    if (!CONVERT_SUPPORTED_EXTENSIONS.includes(ext)) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      const err: any = new Error(
        `Unsupported file format for conversion: ${ext}. Supported: DOCX, PPTX, DOC, PPT, ODT, RTF.`
      );
      err.statusCode = 400;
      throw err;
    }

    const jobId = await queueConvertJob({
      userId: userId || 'anonymous',
      originalName: file.originalname,
      inputPath: file.path,
      originalSize: file.size,
    });

    return {
      jobId,
      type: 'convert',
      status: 'pending',
      originalName: file.originalname,
      originalSize: file.size,
      pollUrl: `/api/tools/jobs/${jobId}`,
    };
  }

  /**
   * Validates and enqueues a document/image compression job
   */
  public async queueCompress(params: {
    userId: string;
    file: Express.Multer.File;
    qualityLevel?: 'ebook' | 'screen' | 'prepress';
  }): Promise<{
    jobId: string;
    type: 'compress';
    status: 'pending';
    originalName: string;
    originalSize: number;
    pollUrl: string;
  }> {
    const { userId, file, qualityLevel = 'ebook' } = params;
    const ext = path.extname(file.originalname).toLowerCase();

    if (!COMPRESS_SUPPORTED_EXTENSIONS.includes(ext)) {
      if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      const err: any = new Error(
        `Unsupported file format for compression: ${ext}. Supported: PDF, DOCX, PPTX, JPG, PNG, WEBP.`
      );
      err.statusCode = 400;
      throw err;
    }

    const jobId = await queueCompressJob({
      userId: userId || 'anonymous',
      originalName: file.originalname,
      inputPath: file.path,
      originalSize: file.size,
      mimeType: file.mimetype,
      qualityLevel,
    });

    return {
      jobId,
      type: 'compress',
      status: 'pending',
      originalName: file.originalname,
      originalSize: file.size,
      pollUrl: `/api/tools/jobs/${jobId}`,
    };
  }

  /**
   * Retrieves a job record by ID
   */
  public getJob(jobId: string): ToolJobRecord | undefined {
    return getToolJob(jobId);
  }

  /**
   * Validates and retrieves download information for a completed job
   */
  public getDownloadFile(jobId: string): {
    filePath: string;
    filename: string;
  } {
    const job = getToolJob(jobId);

    if (!job) {
      const err: any = new Error('Job not found or expired.');
      err.statusCode = 404;
      throw err;
    }

    if (job.status !== 'done' || !job.resultPath) {
      const err: any = new Error(`Job is not ready for download (current status: ${job.status}).`);
      err.statusCode = 400;
      throw err;
    }

    if (!fs.existsSync(job.resultPath)) {
      const err: any = new Error('Result file has already expired and was removed from storage.');
      err.statusCode = 410;
      throw err;
    }

    const filename = job.resultFilename || path.basename(job.resultPath);
    return {
      filePath: job.resultPath,
      filename,
    };
  }
}

export const toolsService = new ToolsService();
