import fs from 'fs';
import path from 'path';
import { spawn, execSync } from 'child_process';
import AdmZip from 'adm-zip';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

/**
 * Health check: Locate Ghostscript binary.
 * Searches PATH and standard installation directories.
 */
export function findGhostscriptBinary(): string | null {
  const commonPaths = [
    // Linux standard paths
    '/usr/bin/gs',
    '/usr/local/bin/gs',
    // Windows standard paths
    'C:\\Program Files\\gs\\gs10.03.0\\bin\\gswin64c.exe',
    'C:\\Program Files\\gs\\gs10.02.1\\bin\\gswin64c.exe',
    'C:\\Program Files\\gs\\gs10.01.2\\bin\\gswin64c.exe',
  ];

  for (const binPath of commonPaths) {
    try {
      if (fs.existsSync(binPath)) {
        return binPath;
      }
    } catch {
      // Ignore filesystem access check errors
    }
  }

  try {
    const candidates = process.platform === 'win32' ? ['where.exe gswin64c', 'where.exe gswin32c', 'where.exe gs'] : ['which gs'];
    for (const c of candidates) {
      try {
        const result = execSync(c, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim().split(/\r?\n/)[0];
        if (result && fs.existsSync(result)) {
          return result;
        }
      } catch {
        // Continue searching
      }
    }
  } catch {
    // Not found
  }

  return null;
}

export interface CompressJobData {
  jobId: string;
  inputPath: string;
  originalName: string;
  outputDir: string;
  mimeType?: string;
  qualityLevel?: 'ebook' | 'screen' | 'prepress'; // defaults to ebook
}

export interface CompressJobResult {
  outputPath: string;
  outputFilename: string;
  originalSize: number;
  compressedSize: number;
  reductionPercent: number;
}

/**
 * Main compression worker router:
 * Detects file type on upload and branches to the appropriate handler:
 * - PDF -> Ghostscript
 * - DOCX / PPTX -> unzip, recompress embedded images via sharp, rezip
 * - JPG / PNG / WebP -> sharp resize & requality
 */
export async function processCompressJob(data: CompressJobData): Promise<CompressJobResult> {
  const { inputPath, originalName, outputDir, qualityLevel = 'ebook' } = data;

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file does not exist at: ${inputPath}`);
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const originalStat = fs.statSync(inputPath);
  const originalSize = originalStat.size;
  const ext = path.extname(originalName).toLowerCase();
  const baseName = path.basename(originalName, ext);
  const outputFilename = `compressed_${baseName}${ext}`;
  const outputPath = path.join(outputDir, outputFilename);

  console.log(`[CompressWorker] 🗜️ Compressing "${originalName}" (${originalSize} bytes, ext: ${ext})...`);

  if (ext === '.pdf') {
    await compressPdf(inputPath, outputPath, qualityLevel);
  } else if (ext === '.docx' || ext === '.pptx') {
    await compressOfficeDocument(inputPath, outputPath);
  } else if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
    await compressImageWithSharp(inputPath, outputPath, ext);
  } else {
    throw new Error(`Unsupported file type for compression: ${ext}. Supported: PDF, DOCX, PPTX, JPG, PNG, WEBP.`);
  }

  if (!fs.existsSync(outputPath)) {
    throw new Error(`Compression completed but output file not found at: ${outputPath}`);
  }

  const compressedStat = fs.statSync(outputPath);
  let compressedSize = compressedStat.size;

  // Edge case: if compression resulted in a larger file (e.g. already ultra-compressed file),
  // copy original to output so the user never receives a larger file!
  if (compressedSize > originalSize) {
    console.log(`[CompressWorker] Notice: compressed file (${compressedSize}B) was larger than original (${originalSize}B). Retaining original.`);
    fs.copyFileSync(inputPath, outputPath);
    compressedSize = originalSize;
  }

  const reductionPercent = originalSize > 0
    ? Math.max(0, Math.round(((originalSize - compressedSize) / originalSize) * 100))
    : 0;

  console.log(
    `[CompressWorker] ✅ Compression done: ${originalSize}B -> ${compressedSize}B (-${reductionPercent}%)`
  );

  return {
    outputPath,
    outputFilename,
    originalSize,
    compressedSize,
    reductionPercent,
  };
}

/**
 * 1. PDF Compression Router:
 * - If Ghostscript binary is found, executes Ghostscript downsampling command.
 * - If Ghostscript is missing on the local machine (e.g. Windows without GS installed),
 *   seamlessly falls back to pure in-process object-stream and metadata optimization via pdf-lib.
 */
async function compressPdf(
  inputPath: string,
  outputPath: string,
  quality: 'ebook' | 'screen' | 'prepress' = 'ebook'
): Promise<void> {
  const binary = findGhostscriptBinary();

  if (binary) {
    try {
      console.log(`[CompressWorker] Using Ghostscript binary (${binary}) with setting /${quality}...`);
      await runGhostscriptSubprocess(binary, inputPath, outputPath, quality);
      return;
    } catch (gsErr: any) {
      console.warn(`[CompressWorker] Ghostscript run encountered notice: ${gsErr.message}. Falling back to in-process PDF optimization...`);
    }
  } else {
    console.log('[CompressWorker] Ghostscript binary not in PATH. Using high-efficiency in-process PDF optimization engine...');
  }

  // In-process fallback: load, strip bloated metadata/catalog, and re-encode with object stream compression
  await compressPdfWithPdfLib(inputPath, outputPath);
}

/**
 * In-process PDF optimization using pdf-lib.
 * Strips redundant metadata and writes compressed object streams.
 */
async function compressPdfWithPdfLib(
  inputPath: string,
  outputPath: string
): Promise<void> {
  const rawBytes = fs.readFileSync(inputPath);
  const pdfDoc = await PDFDocument.load(rawBytes, { ignoreEncryption: true });

  // Clear bloated metadata
  pdfDoc.setTitle('');
  pdfDoc.setAuthor('');
  pdfDoc.setSubject('');
  pdfDoc.setKeywords([]);
  pdfDoc.setProducer('StudySync AI Document Compressor');
  pdfDoc.setCreator('StudySync AI');

  // Save with compressed object streams (FlateDecode)
  const optimizedBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    updateFieldAppearances: false,
  });

  fs.writeFileSync(outputPath, optimizedBytes);
}

/**
 * Executes Ghostscript process
 */
async function runGhostscriptSubprocess(
  binary: string,
  inputPath: string,
  outputPath: string,
  quality: 'ebook' | 'screen' | 'prepress' = 'ebook'
): Promise<void> {
  const pdfSetting = `/${quality}`;

  await new Promise<void>((resolve, reject) => {
    const args = [
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.4',
      `-dPDFSETTINGS=${pdfSetting}`,
      '-dNOPAUSE',
      '-dQUIET',
      '-dBATCH',
      `-sOutputFile=${outputPath}`,
      inputPath,
    ];

    const proc = spawn(binary, args);

    let stderr = '';
    let stdout = '';

    proc.stdout.on('data', (d) => {
      stdout += d.toString();
    });

    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    proc.on('error', (err: any) => {
      reject(err);
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `Ghostscript exited with code ${code}. Error: ${stderr.trim() || stdout.trim() || 'Unknown PDF compression error'}`
          )
        );
      }
    });
  });
}

/**
 * 2. DOCX / PPTX Compression:
 * DOCX and PPTX are OpenXML ZIP archives. Text is minimal; embedded media dominates size.
 * Unzip archive, recompress embedded images in word/media/ or ppt/media/ with sharp, and rezip.
 */
async function compressOfficeDocument(inputPath: string, outputPath: string): Promise<void> {
  const zip = new AdmZip(inputPath);
  const zipEntries = zip.getEntries();

  let imagesOptimized = 0;

  for (const entry of zipEntries) {
    if (entry.isDirectory) continue;

    const entryName = entry.entryName.toLowerCase();
    // Office media files reside in word/media/ or ppt/media/
    const isOfficeMedia =
      entryName.startsWith('word/media/') ||
      entryName.startsWith('ppt/media/') ||
      entryName.includes('/media/');

    const isImage =
      entryName.endsWith('.png') ||
      entryName.endsWith('.jpg') ||
      entryName.endsWith('.jpeg') ||
      entryName.endsWith('.webp');

    if (isOfficeMedia && isImage) {
      try {
        const originalBuffer = entry.getData();
        const originalEntrySize = originalBuffer.length;

        // Skip tiny icon images under 15KB
        if (originalEntrySize < 15 * 1024) continue;

        let compressedBuffer: Buffer | null = null;

        if (entryName.endsWith('.png')) {
          compressedBuffer = await sharp(originalBuffer)
            .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
            .png({ compressionLevel: 8, quality: 65 })
            .toBuffer();
        } else if (entryName.endsWith('.jpg') || entryName.endsWith('.jpeg')) {
          compressedBuffer = await sharp(originalBuffer)
            .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 65, mozjpeg: true })
            .toBuffer();
        } else if (entryName.endsWith('.webp')) {
          compressedBuffer = await sharp(originalBuffer)
            .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 65 })
            .toBuffer();
        }

        if (compressedBuffer && compressedBuffer.length < originalEntrySize) {
          zip.updateFile(entry.entryName, compressedBuffer);
          imagesOptimized++;
        }
      } catch (err: any) {
        console.warn(`[CompressWorker] Skipping media file ${entry.entryName}:`, err.message);
      }
    }
  }

  console.log(`[CompressWorker] Recompressed ${imagesOptimized} embedded media files in Office package.`);
  zip.writeZip(outputPath);
}

/**
 * 3. JPG / PNG / WebP Compression using Sharp:
 * Resizes if width/height exceeds 2560px and recompresses at quality 65.
 */
async function compressImageWithSharp(inputPath: string, outputPath: string, ext: string): Promise<void> {
  const image = sharp(inputPath);
  const metadata = await image.metadata();

  const maxDimension = 2560;
  let pipeline = image;

  if (metadata.width && metadata.height) {
    if (metadata.width > maxDimension || metadata.height > maxDimension) {
      pipeline = pipeline.resize({
        width: maxDimension,
        height: maxDimension,
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
  }

  if (ext === '.jpg' || ext === '.jpeg') {
    await pipeline.jpeg({ quality: 65, mozjpeg: true }).toFile(outputPath);
  } else if (ext === '.png') {
    await pipeline.png({ compressionLevel: 8, quality: 65 }).toFile(outputPath);
  } else if (ext === '.webp') {
    await pipeline.webp({ quality: 65 }).toFile(outputPath);
  } else {
    await pipeline.toFile(outputPath);
  }
}
