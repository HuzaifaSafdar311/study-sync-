import fs from 'fs';
import path from 'path';
import { spawn, execSync } from 'child_process';

/**
 * Health check: Verify if LibreOffice (soffice) binary is callable.
 * Looks in PATH and standard installation directories.
 */
export function findLibreOfficeBinary(): string | null {
  const commonPaths = [
    // Linux standard paths
    '/usr/bin/soffice',
    '/usr/bin/libreoffice',
    '/usr/local/bin/soffice',
    // Windows standard paths
    'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
    'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
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

  // Fallback to checking PATH via where/which
  try {
    const cmd = process.platform === 'win32' ? 'where.exe soffice' : 'which soffice';
    const result = execSync(cmd, { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim().split(/\r?\n/)[0];
    if (result && fs.existsSync(result)) {
      return result;
    }
  } catch {
    // Binary not found
  }

  return null;
}

export interface ConvertJobData {
  jobId: string;
  inputPath: string;
  originalName: string;
  outputDir: string;
}

export interface ConvertJobResult {
  outputPath: string;
  outputFilename: string;
  sizeBytes: number;
}

/**
 * Converts DOCX / PPTX (and other Office formats) to PDF using LibreOffice headless.
 * Command: soffice --headless --convert-to pdf --outdir <outputDir> <inputPath>
 */
export async function processConvertJob(data: ConvertJobData): Promise<ConvertJobResult> {
  const { inputPath, originalName, outputDir } = data;

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file does not exist at: ${inputPath}`);
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const binary = findLibreOfficeBinary();
  const inputExt = path.extname(originalName).toLowerCase();
  const baseName = path.basename(originalName, inputExt);
  const expectedOutputFilename = `${baseName}.pdf`;
  const expectedOutputPath = path.join(outputDir, expectedOutputFilename);

  console.log(`[ConvertWorker] 📄 Converting "${originalName}" to PDF using LibreOffice (${binary})...`);

  // Run LibreOffice conversion in headless mode
  await new Promise<void>((resolve, reject) => {
    // LibreOffice creates the output PDF in outputDir with the same base name as input file
    const proc = spawn(binary || 'soffice', [
      '--headless',
      '--convert-to',
      'pdf',
      '--outdir',
      outputDir,
      inputPath,
    ]);

    let stderr = '';
    let stdout = '';

    proc.stdout.on('data', (d) => {
      stdout += d.toString();
    });

    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    proc.on('error', (err: any) => {
      if (err.code === 'ENOENT') {
        reject(
          new Error(
            `LibreOffice binary ("soffice") not found on server! Please install LibreOffice (apt-get install -y libreoffice) or ensure it is in PATH.`
          )
        );
      } else {
        reject(new Error(`Failed to start LibreOffice process: ${err.message}`));
      }
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `LibreOffice exited with code ${code}. Error: ${stderr.trim() || stdout.trim() || 'Unknown conversion error'}`
          )
        );
      }
    });
  });

  // LibreOffice names the output file using the input file's basename
  const inputBasename = path.basename(inputPath, path.extname(inputPath));
  const generatedPath = path.join(outputDir, `${inputBasename}.pdf`);

  let finalOutputPath = expectedOutputPath;

  if (fs.existsSync(generatedPath) && generatedPath !== expectedOutputPath) {
    // Rename to expected filename if different
    fs.renameSync(generatedPath, expectedOutputPath);
  } else if (!fs.existsSync(expectedOutputPath)) {
    // Look for any newly created .pdf in outputDir
    const files = fs.readdirSync(outputDir).filter((f) => f.toLowerCase().endsWith('.pdf'));
    if (files.length > 0) {
      const found = path.join(outputDir, files[0]);
      fs.renameSync(found, expectedOutputPath);
    } else {
      throw new Error(`LibreOffice conversion finished but no output PDF was generated.`);
    }
  }

  const stat = fs.statSync(finalOutputPath);
  console.log(`[ConvertWorker] ✅ Conversion succeeded: "${expectedOutputFilename}" (${stat.size} bytes)`);

  return {
    outputPath: finalOutputPath,
    outputFilename: expectedOutputFilename,
    sizeBytes: stat.size,
  };
}
