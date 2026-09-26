# StudySync AI — Tools Section Documentation

## Overview

The Tools section is a collection of standalone document utilities built for students: a PDF converter, a document compressor, and a cam scanner. It sits alongside the core task/reminder features of StudySync AI but works independently, a user can open Tools and use it without any task data involved.

The guiding design rule: anything that can run in the browser, runs in the browser. Anything that needs a real binary (LibreOffice, Ghostscript) runs on the server through a background job queue. This keeps the backend light and keeps results fast for the operations that don't need a server round trip.

---

## 1. Architecture

### 1.1 Split: Client-side vs Server-side

| Feature | Where it runs | Why |
|---|---|---|
| Image(s) to PDF | Client | Pure JS libraries handle this fine, no upload needed |
| PDF merge | Client | Same, works entirely in-browser |
| PDF split | Client | Same |
| PDF to images | Client | Same |
| DOCX/PPTX to PDF | Server (BullMQ worker) | Needs LibreOffice headless, not available in-browser |
| PDF compression | Server (BullMQ worker) | Needs Ghostscript for real size reduction |
| DOCX/PPTX compression | Server (BullMQ worker) | Needs to unzip, recompress images, rezip |
| Image compression | Server or Client | Can go either way; server chosen for consistency with the rest of the compressor |
| Cam scanner | Client | Camera access, edge detection, and export all run in-browser |

Not in scope: PDF to DOCX conversion. Output quality for this direction is unreliable (broken tables, lost formatting) and was judged not worth shipping in v1.

### 1.2 Backend flow for server-side jobs

```
1. User uploads file → POST /api/tools/{convert|compress}
2. Server validates file (type, size ≤ 25MB), saves to temp storage
3. Job pushed to BullMQ queue, job ID returned to client immediately
4. Client polls GET /api/tools/jobs/:id for status
5. Worker picks up job, runs LibreOffice/Ghostscript/sharp
6. On completion, result file saved, job marked "done" with a download URL
7. Client calls GET /api/tools/jobs/:id/download
8. Server auto-deletes the source and result files after 1 hour
```

Nothing is processed synchronously inside the request/response cycle. This matters because conversion and compression can take several seconds on larger files, and blocking a request thread for that long isn't acceptable under load.

### 1.3 Folder structure

```
backend/src/modules/tools/
  routes.ts               # upload, job status, download endpoints
  queue.ts                # BullMQ queue definitions
  workers/
    convert.worker.ts     # DOCX/PPTX → PDF via LibreOffice
    compress.worker.ts    # branches by file type: Ghostscript | sharp | rezip

frontend/src/pages/Tools/
  ToolsHub.tsx             # landing grid, links to each tool
  PdfConverter.tsx         # image→PDF, merge, split, PDF→images
  Compressor.tsx           # upload + compress, shows before/after size
  CamScanner.tsx           # camera capture, edge detection, export
```

---

## 2. PDF Converter

### 2.1 Features

- **Image(s) to PDF** — combine one or more images into a single PDF, client-side
- **PDF merge** — combine multiple PDFs into one, client-side
- **PDF split** — extract a page range or split into individual pages, client-side
- **PDF to images** — export each page as a separate image (PNG/JPG), client-side
- **DOCX/PPTX to PDF** — server-side, via LibreOffice headless

### 2.2 Libraries

| Task | Library | Runs |
|---|---|---|
| Image to PDF | `pdf-lib` | Client |
| PDF merge/split | `pdf-lib` | Client |
| PDF rendering (for split/to-images) | `pdf.js` | Client |
| DOCX/PPTX to PDF | LibreOffice headless (`soffice --headless --convert-to pdf`) | Server |

### 2.3 DOCX/PPTX to PDF worker

The server calls LibreOffice as a subprocess:

```bash
soffice --headless --convert-to pdf --outdir /tmp/output /tmp/input/file.docx
```

This needs LibreOffice installed in the Docker image (see Section 5). Conversion fidelity is generally high for standard documents; complex layouts (heavy custom fonts, embedded objects) may shift slightly, which is a known limitation of headless LibreOffice conversion and not something to try to fix at the app level.

---

## 3. Document Compressor

### 3.1 Why it's not one function

A single "compress this file" function doesn't work well across file types, so the compressor detects file type on upload and routes to the right handler. Each type compresses differently:

| File type | Method | Tool |
|---|---|---|
| PDF | Downsample embedded images, strip redundant/unused data | Ghostscript |
| DOCX / PPTX | Unzip (they're zip archives internally), recompress embedded images, rezip | `sharp` + Node's zip handling |
| JPG / PNG | Resize and re-encode at lower quality | `sharp` |

For DOCX/PPTX, the text content itself takes up almost no space, size is dominated by embedded images, so that's the only lever worth pulling.

### 3.2 Ghostscript command (PDF)

```bash
gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/ebook \
   -dNOPAUSE -dQUIET -dBATCH \
   -sOutputFile=/tmp/output/compressed.pdf /tmp/input/file.pdf
```

`/ebook` setting balances quality and size reduction for typical student documents (lecture slides, scanned notes). Adjust to `/screen` for more aggressive compression if needed.

### 3.3 Response format

The compressor returns:
```json
{
  "originalSize": 4200000,
  "compressedSize": 1100000,
  "reductionPercent": 74,
  "downloadUrl": "/api/tools/jobs/abc123/download"
}
```

---

## 4. Cam Scanner

### 4.1 Flow

1. Request camera access via `getUserMedia`
2. Live preview shown to user
3. On capture, automatic document edge detection runs on the captured frame
4. Detected corners overlaid on the image; user can drag to adjust manually if detection is off
5. Perspective correction warps the image to a flat rectangle
6. Optional filter applied: original, black & white, or grayscale
7. Export as PDF (via `jsPDF`) or as a standalone image

### 4.2 Libraries

| Task | Library |
|---|---|
| Camera access | Browser native `getUserMedia` |
| Edge detection + perspective warp | `jscanify` (lightweight) or `OpenCV.js` (more control, heavier) |
| PDF export | `jsPDF` |

`jscanify` is the lighter option and sufficient for most cases. `OpenCV.js` is the fallback if edge detection accuracy on `jscanify` proves insufficient in testing, at the cost of a larger bundle.

### 4.3 Manual correction fallback

Auto-detection can fail on low-contrast backgrounds or unusual lighting. The manual fallback lets the user drag the four corner points before the perspective warp is applied, this should always be available, not just triggered on detection failure, so users can fix an imperfect auto-detect too.

---

## 5. Infrastructure Requirements

### 5.1 Docker

The backend Docker image needs LibreOffice and Ghostscript installed as system packages, not npm dependencies:

```dockerfile
RUN apt-get update && apt-get install -y \
    libreoffice \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*
```

### 5.2 Health checks

Since these are subprocess calls to system binaries rather than npm packages, a missing binary won't fail until a job actually tries to run it. Add a startup health check that confirms both `soffice` and `gs` are present and callable, and fails loudly (not silently) if either is missing, so a bad deploy is caught immediately rather than surfacing as a broken feature days later.

### 5.3 File handling

- Max upload size: 25MB per file
- Files rejected above that limit with a clear error message, not a silent failure
- Source and result files auto-deleted from server storage 1 hour after job completion
- Temp storage should be a dedicated directory, cleaned independently of the main file system used by other modules

---

## 6. API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/tools/convert` | Upload file, queue a conversion job |
| POST | `/api/tools/compress` | Upload file, queue a compression job |
| GET | `/api/tools/jobs/:id` | Poll job status (`pending`, `processing`, `done`, `failed`) |
| GET | `/api/tools/jobs/:id/download` | Download the result once status is `done` |

All endpoints go through the same auth middleware and Zod validation already used elsewhere in the app, no new conventions introduced for this module.

---

## 7. Known Limitations

- PDF to DOCX conversion is out of scope for v1, not offered.
- DOCX/PPTX to PDF conversion may shift complex layouts slightly (font substitution, embedded object positioning), inherent to headless LibreOffice.
- Cam scanner edge detection accuracy depends on lighting and background contrast; manual correction is the safety net, not a rare fallback.
- Compression is lossy for images embedded in PDFs/DOCX/PPTX; original files should be kept by the user if archival quality matters.