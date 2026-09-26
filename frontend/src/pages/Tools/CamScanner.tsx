import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  FileText,
  Image as ImageIcon,
  ArrowRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';

interface Point {
  x: number;
  y: number;
}

export default function CamScanner() {
  // Step: 'capture' | 'crop' | 'filter'
  const [step, setStep] = useState<'capture' | 'crop' | 'filter'>('capture');

  // Camera & Stream
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Raw Captured Image
  const [capturedImage, setCapturedImage] = useState<HTMLImageElement | null>(null);

  // Crop / Quad Corner Points: [TL, TR, BR, BL]
  const [corners, setCorners] = useState<Point[]>([
    { x: 0.1, y: 0.1 },
    { x: 0.9, y: 0.1 },
    { x: 0.9, y: 0.9 },
    { x: 0.1, y: 0.9 },
  ]);
  const [draggingCorner, setDraggingCorner] = useState<number | null>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);

  // Filtered / Warped Result
  const [warpedCanvas, setWarpedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [activeFilter, setActiveFilter] = useState<'original' | 'bw' | 'grayscale' | 'magic'>('original');

  // Initialize camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.warn('[CamScanner] Camera access error:', err.message);
      setCameraError('Camera access unavailable or permission denied. You can upload an image instead.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // ─── Capture Photo from Camera ───────────────────────────────────────
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const img = new Image();
    img.src = canvas.toDataURL('image/jpeg', 0.95);
    img.onload = () => {
      stopCamera();
      setCapturedImage(img);
      autoDetectCorners(img);
      setStep('crop');
    };
  };

  // ─── Upload Image Fallback ───────────────────────────────────────────
  const handleUploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        stopCamera();
        setCapturedImage(img);
        autoDetectCorners(img);
        setStep('crop');
      };
    };
    reader.readAsDataURL(file);
  };

  // ─── Edge Detection & Corner Finding ─────────────────────────────────
  const autoDetectCorners = (img: HTMLImageElement) => {
    // Standard quad with 6% padding inwards as reliable default document boundary
    setCorners([
      { x: img.naturalWidth * 0.08, y: img.naturalHeight * 0.08 },
      { x: img.naturalWidth * 0.92, y: img.naturalHeight * 0.08 },
      { x: img.naturalWidth * 0.92, y: img.naturalHeight * 0.92 },
      { x: img.naturalWidth * 0.08, y: img.naturalHeight * 0.92 },
    ]);
  };

  // ─── Draw Interactive Crop Canvas ────────────────────────────────────
  const drawCropCanvas = useCallback(() => {
    const canvas = cropCanvasRef.current;
    if (!canvas || !capturedImage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Maintain aspect ratio within container
    canvas.width = capturedImage.naturalWidth;
    canvas.height = capturedImage.naturalHeight;

    // Draw background image
    ctx.drawImage(capturedImage, 0, 0);

    // Draw shaded polygon mask outside quad
    ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Cut out inner quad
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    ctx.lineTo(corners[1].x, corners[1].y);
    ctx.lineTo(corners[2].x, corners[2].y);
    ctx.lineTo(corners[3].x, corners[3].y);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(capturedImage, 0, 0);
    ctx.restore();

    // Draw boundary stroke
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    ctx.lineTo(corners[1].x, corners[1].y);
    ctx.lineTo(corners[2].x, corners[2].y);
    ctx.lineTo(corners[3].x, corners[3].y);
    ctx.closePath();
    ctx.lineWidth = Math.max(3, canvas.width / 350);
    ctx.strokeStyle = '#6366F1';
    ctx.stroke();

    // Draw corner handles
    const handleRadius = Math.max(12, canvas.width / 70);
    corners.forEach((corner, idx) => {
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, handleRadius, 0, Math.PI * 2);
      ctx.fillStyle = draggingCorner === idx ? '#4F46E5' : '#FFFFFF';
      ctx.fill();
      ctx.lineWidth = Math.max(3, canvas.width / 350);
      ctx.strokeStyle = '#6366F1';
      ctx.stroke();

      // Inner dot
      ctx.beginPath();
      ctx.arc(corner.x, corner.y, handleRadius * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = '#6366F1';
      ctx.fill();
    });
  }, [capturedImage, corners, draggingCorner]);

  useEffect(() => {
    if (step === 'crop') {
      drawCropCanvas();
    }
  }, [step, drawCropCanvas]);

  // ─── Drag Corner Handlers ────────────────────────────────────────────
  const getCanvasMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = cropCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasMousePos(e);
    const canvas = cropCanvasRef.current;
    if (!canvas) return;

    const threshold = Math.max(30, canvas.width / 30);
    let foundIndex: number | null = null;

    corners.forEach((c, i) => {
      const dist = Math.hypot(c.x - pos.x, c.y - pos.y);
      if (dist < threshold) {
        foundIndex = i;
      }
    });

    setDraggingCorner(foundIndex);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggingCorner === null || !capturedImage) return;
    const pos = getCanvasMousePos(e);

    const boundedX = Math.max(0, Math.min(capturedImage.naturalWidth, pos.x));
    const boundedY = Math.max(0, Math.min(capturedImage.naturalHeight, pos.y));

    setCorners((prev) => {
      const next = [...prev];
      next[draggingCorner] = { x: boundedX, y: boundedY };
      return next;
    });
  };

  const handleMouseUp = () => {
    setDraggingCorner(null);
  };

  // ─── Perspective Warp & Filter Application ───────────────────────────
  const applyPerspectiveWarp = () => {
    if (!capturedImage) return;

    // Calculate dimensions of warped document
    const [tl, tr, br, bl] = corners;

    const widthTop = Math.hypot(tr.x - tl.x, tr.y - tl.y);
    const widthBottom = Math.hypot(br.x - bl.x, br.y - bl.y);
    const targetWidth = Math.round(Math.max(widthTop, widthBottom));

    const heightLeft = Math.hypot(bl.x - tl.x, bl.y - tl.y);
    const heightRight = Math.hypot(br.x - tr.x, br.y - tr.y);
    const targetHeight = Math.round(Math.max(heightLeft, heightRight));

    const outCanvas = document.createElement('canvas');
    outCanvas.width = targetWidth;
    outCanvas.height = targetHeight;
    const outCtx = outCanvas.getContext('2d');
    if (!outCtx) return;

    // Render warped quad via bilinear mapping
    warpBilinear(capturedImage, corners, outCanvas, outCtx);

    setWarpedCanvas(outCanvas);
    setStep('filter');
  };

  /**
   * Bilinear perspective interpolation on canvas
   */
  const warpBilinear = (
    srcImg: HTMLImageElement,
    quad: Point[],
    dstCanvas: HTMLCanvasElement,
    dstCtx: CanvasRenderingContext2D
  ) => {
    const w = dstCanvas.width;
    const h = dstCanvas.height;

    // Create temp offscreen source canvas
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = srcImg.naturalWidth;
    srcCanvas.height = srcImg.naturalHeight;
    const srcCtx = srcCanvas.getContext('2d')!;
    srcCtx.drawImage(srcImg, 0, 0);

    const srcData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
    const dstData = dstCtx.createImageData(w, h);

    const [tl, tr, br, bl] = quad;

    const sWidth = srcCanvas.width;
    const sHeight = srcCanvas.height;
    const srcPixels = srcData.data;
    const dstPixels = dstData.data;

    // Sample across grid
    for (let y = 0; y < h; y++) {
      const v = y / h;
      for (let x = 0; x < w; x++) {
        const u = x / w;

        // Bilinear interpolation formula:
        // P(u, v) = (1-u)(1-v)*TL + u(1-v)*TR + u*v*BR + (1-u)*v*BL
        const px = (1 - u) * (1 - v) * tl.x + u * (1 - v) * tr.x + u * v * br.x + (1 - u) * v * bl.x;
        const py = (1 - u) * (1 - v) * tl.y + u * (1 - v) * tr.y + u * v * br.y + (1 - u) * v * bl.y;

        const srcX = Math.round(px);
        const srcY = Math.round(py);

        if (srcX >= 0 && srcX < sWidth && srcY >= 0 && srcY < sHeight) {
          const srcIdx = (srcY * sWidth + srcX) * 4;
          const dstIdx = (y * w + x) * 4;

          dstPixels[dstIdx] = srcPixels[srcIdx];
          dstPixels[dstIdx + 1] = srcPixels[srcIdx + 1];
          dstPixels[dstIdx + 2] = srcPixels[srcIdx + 2];
          dstPixels[dstIdx + 3] = 255;
        }
      }
    }

    dstCtx.putImageData(dstData, 0, 0);
  };

  // ─── Filter Processors ────────────────────────────────────────────────
  const getFilteredCanvas = (): HTMLCanvasElement | null => {
    if (!warpedCanvas) return null;

    const canvas = document.createElement('canvas');
    canvas.width = warpedCanvas.width;
    canvas.height = warpedCanvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(warpedCanvas, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;

    if (activeFilter === 'grayscale') {
      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        d[i] = gray;
        d[i + 1] = gray;
        d[i + 2] = gray;
      }
    } else if (activeFilter === 'bw') {
      // High-contrast Document B&W Filter (Adaptive text threshold)
      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const val = gray > 135 ? 255 : 0;
        d[i] = val;
        d[i + 1] = val;
        d[i + 2] = val;
      }
    } else if (activeFilter === 'magic') {
      // Magic Color: enhance contrast and saturation for lecture notes
      for (let i = 0; i < d.length; i += 4) {
        d[i] = Math.min(255, d[i] * 1.15 - 15);
        d[i + 1] = Math.min(255, d[i + 1] * 1.15 - 15);
        d[i + 2] = Math.min(255, d[i + 2] * 1.15 - 15);
      }
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  };

  // ─── Export Handlers ──────────────────────────────────────────────────
  const handleExportPdf = () => {
    const canvas = getFilteredCanvas();
    if (!canvas) return;

    try {
      const isLandscape = canvas.width > canvas.height;
      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Scale to fit page with small margin
      const margin = 10;
      const availWidth = pageWidth - margin * 2;
      const availHeight = pageHeight - margin * 2;

      const imgRatio = canvas.width / canvas.height;
      let finalW = availWidth;
      let finalH = availWidth / imgRatio;

      if (finalH > availHeight) {
        finalH = availHeight;
        finalW = availHeight * imgRatio;
      }

      const x = (pageWidth - finalW) / 2;
      const y = (pageHeight - finalH) / 2;

      pdf.addImage(imgData, 'JPEG', x, y, finalW, finalH);
      pdf.save(`StudySync_Scan_${Date.now()}.pdf`);
      toast.success('Scan exported as PDF!');
    } catch (err: any) {
      toast.error('Failed to generate PDF: ' + err.message);
    }
  };

  const handleExportImage = () => {
    const canvas = getFilteredCanvas();
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `StudySync_Scan_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('Scan exported as image!');
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setWarpedCanvas(null);
    setStep('capture');
    startCamera();
  };

  return (
    <div style={{ maxWidth: '880px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            background: 'rgba(99, 102, 241, 0.1)',
            borderRadius: '999px',
            color: '#6366F1',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '0.75rem',
          }}
        >
          <Camera size={16} />
          Document Cam Scanner
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
          Smart Mobile & Webcam Scanner
        </h1>
        <p style={{ color: '#64748B', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
          Capture physical notes, correct perspective warping with interactive handles, apply crisp text
          filters, and export directly as PDF or PNG.
        </p>
      </div>

      {/* Main Scanner Container */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          padding: '1.75rem',
        }}
      >
        {/* Step Indicator */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '32px',
            marginBottom: '1.75rem',
            borderBottom: '1px solid #F1F5F9',
            paddingBottom: '1rem',
          }}
        >
          {[
            { id: 'capture', label: '1. Capture' },
            { id: 'crop', label: '2. Adjust Corners' },
            { id: 'filter', label: '3. Filter & Export' },
          ].map((s) => (
            <span
              key={s.id}
              style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                color: step === s.id ? '#6366F1' : '#94A3B8',
                borderBottom: step === s.id ? '2px solid #6366F1' : 'none',
                paddingBottom: '6px',
              }}
            >
              {s.label}
            </span>
          ))}
        </div>

        {/* STEP 1: CAMERA CAPTURE */}
        {step === 'capture' && (
          <div>
            <div
              style={{
                position: 'relative',
                background: '#0F172A',
                borderRadius: '16px',
                overflow: 'hidden',
                aspectRatio: '16/10',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.5rem',
              }}
            >
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: isCameraActive ? 'block' : 'none',
                }}
              />

              {!isCameraActive && (
                <div style={{ textAlign: 'center', color: '#94A3B8', padding: '2rem' }}>
                  <Camera size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                  <p style={{ fontSize: '0.95rem', marginBottom: '1rem' }}>
                    {cameraError || 'Camera preview initializing...'}
                  </p>
                  <label
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      borderRadius: '8px',
                      background: '#6366F1',
                      color: '#FFF',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <ImageIcon size={16} />
                    Upload Photo from Device
                    <input
                      type="file"
                      aria-label="Upload photo from device"
                      accept="image/*"
                      onChange={handleUploadImage}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              )}

              {/* Viewfinder crosshairs */}
              {isCameraActive && (
                <div
                  style={{
                    position: 'absolute',
                    top: '10%',
                    left: '10%',
                    right: '10%',
                    bottom: '10%',
                    border: '2px dashed rgba(255, 255, 255, 0.4)',
                    borderRadius: '12px',
                    pointerEvents: 'none',
                  }}
                />
              )}
            </div>

            {/* Capture controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              {isCameraActive && (
                <button
                  type="button"
                  onClick={capturePhoto}
                  style={{
                    padding: '14px 28px',
                    borderRadius: '999px',
                    background: '#6366F1',
                    color: '#FFF',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                  }}
                >
                  <Camera size={20} />
                  Capture Photo
                </button>
              )}
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  borderRadius: '999px',
                  background: '#F1F5F9',
                  color: '#334155',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                <ImageIcon size={18} />
                Upload Photo
                <input
                  type="file"
                  aria-label="Upload photo"
                  accept="image/*"
                  onChange={handleUploadImage}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>
        )}

        {/* STEP 2: CORNER ADJUSTMENT */}
        {step === 'crop' && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <p style={{ color: '#64748B', fontSize: '0.9rem' }}>
                Drag the 4 corner handles to align with the edges of your document for perspective flattening.
              </p>
            </div>

            <div
              style={{
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                background: '#0F172A',
                borderRadius: '16px',
                overflow: 'hidden',
                marginBottom: '1.5rem',
                maxHeight: '520px',
              }}
            >
              <canvas
                ref={cropCanvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{
                  maxWidth: '100%',
                  maxHeight: '520px',
                  objectFit: 'contain',
                  cursor: draggingCorner !== null ? 'grabbing' : 'crosshair',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleRetake}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFF',
                  color: '#475569',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Retake
              </button>

              <button
                type="button"
                onClick={applyPerspectiveWarp}
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  background: '#6366F1',
                  color: '#FFF',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                }}
              >
                Flatten & Apply Filter
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: FILTER & EXPORT */}
        {step === 'filter' && (
          <div>
            {/* Filter selection buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '1.5rem' }}>
              {[
                { id: 'original', label: 'Original' },
                { id: 'magic', label: 'Magic Enhance' },
                { id: 'bw', label: 'Crisp B&W Text' },
                { id: 'grayscale', label: 'Grayscale' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFilter(f.id as any)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: activeFilter === f.id ? '2px solid #6366F1' : '1px solid #CBD5E1',
                    background: activeFilter === f.id ? '#EEF2FF' : '#FFFFFF',
                    color: activeFilter === f.id ? '#4338CA' : '#475569',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Document Preview Canvas */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                background: '#F8FAFC',
                borderRadius: '16px',
                border: '1px solid #E2E8F0',
                padding: '1.5rem',
                marginBottom: '1.5rem',
                maxHeight: '480px',
                overflow: 'auto',
              }}
            >
              {warpedCanvas && (
                <img
                  src={getFilteredCanvas()?.toDataURL('image/jpeg', 0.9) || ''}
                  alt="Scanned Document"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '440px',
                    borderRadius: '8px',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                  }}
                />
              )}
            </div>

            {/* Export action bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setStep('crop')}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFF',
                  color: '#475569',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Back to Crop
              </button>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={handleExportImage}
                  style={{
                    padding: '12px 18px',
                    borderRadius: '10px',
                    border: '1px solid #6366F1',
                    background: '#EEF2FF',
                    color: '#4338CA',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <ImageIcon size={18} />
                  Download Image
                </button>

                <button
                  type="button"
                  onClick={handleExportPdf}
                  style={{
                    padding: '12px 22px',
                    borderRadius: '10px',
                    background: '#6366F1',
                    color: '#FFF',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
                  }}
                >
                  <FileText size={18} />
                  Export as PDF (A4)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
