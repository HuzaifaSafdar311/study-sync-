import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Plus,
  Trash2,
  Download,
  Layers,
  Scissors,
  FileSpreadsheet,
  Image as ImageIcon,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { toolsApi } from '../../services/api';

// Set worker source for pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

type ConverterTab = 'img2pdf' | 'office2pdf' | 'merge' | 'split' | 'pdf2img';

export default function PdfConverter() {
  const [activeTab, setActiveTab] = useState<ConverterTab>('img2pdf');

  return (
    <div style={{ maxWidth: '920px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Page Title */}
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
          <FileText size={16} />
          Multi-Purpose PDF Toolset
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
          PDF Converter & Utilities
        </h1>
        <p style={{ color: '#64748B', fontSize: '1rem', maxWidth: '600px', margin: '0 auto' }}>
          Combine images into PDFs, convert DOCX & PPTX via LibreOffice, merge or split pages, and extract
          high-resolution images from any PDF.
        </p>
      </div>

      {/* Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          background: '#F1F5F9',
          padding: '6px',
          borderRadius: '14px',
          marginBottom: '2rem',
          overflowX: 'auto',
        }}
      >
        {[
          { id: 'img2pdf', label: 'Images to PDF', icon: ImageIcon },
          { id: 'office2pdf', label: 'DOCX / PPTX to PDF', icon: FileSpreadsheet },
          { id: 'merge', label: 'Merge PDFs', icon: Layers },
          { id: 'split', label: 'Split PDF', icon: Scissors },
          { id: 'pdf2img', label: 'PDF to Images', icon: ImageIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ConverterTab)}
              style={{
                flex: 1,
                minWidth: '140px',
                padding: '10px 14px',
                borderRadius: '10px',
                border: 'none',
                background: isActive ? '#FFFFFF' : 'transparent',
                color: isActive ? '#4338CA' : '#64748B',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: isActive ? '0 2px 6px rgba(0, 0, 0, 0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
          padding: '2rem',
        }}
      >
        {activeTab === 'img2pdf' && <ImagesToPdfTab />}
        {activeTab === 'office2pdf' && <OfficeToPdfTab />}
        {activeTab === 'merge' && <MergePdfTab />}
        {activeTab === 'split' && <SplitPdfTab />}
        {activeTab === 'pdf2img' && <PdfToImagesTab />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1: Images to PDF (Client-side via pdf-lib)
// ─────────────────────────────────────────────────────────────────────────────
function ImagesToPdfTab() {
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (newFiles.length === 0) {
      toast.error('Please select image files (PNG, JPG, WEBP).');
      return;
    }

    const updated = [...images, ...newFiles];
    setImages(updated);

    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const generatePdf = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);

    try {
      const pdfDoc = await PDFDocument.create();

      for (const file of images) {
        const arrayBuffer = await file.arrayBuffer();
        let pdfImage;

        if (file.type.includes('png')) {
          pdfImage = await pdfDoc.embedPng(arrayBuffer);
        } else {
          // Standard JPEG embedding
          pdfImage = await pdfDoc.embedJpg(arrayBuffer);
        }

        const page = pdfDoc.addPage([pdfImage.width, pdfImage.height]);
        page.drawImage(pdfImage, {
          x: 0,
          y: 0,
          width: pdfImage.width,
          height: pdfImage.height,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `StudySync_Combined_${Date.now()}.pdf`;
      link.click();

      toast.success(`Successfully combined ${images.length} image(s) into PDF!`);
    } catch (err: any) {
      toast.error('Error generating PDF: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.25rem' }}>
          Combine Images into Single PDF
        </h3>
        <p style={{ color: '#64748B', fontSize: '0.875rem' }}>
          Upload photos or scanned pages. Runs 100% in your browser without uploading to any server.
        </p>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFiles(e.target.files)}
        multiple
        accept="image/*"
        style={{ display: 'none' }}
      />

      {images.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed #CBD5E1',
            borderRadius: '16px',
            padding: '3.5rem 2rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: '#F8FAFC',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#EEF2FF',
              color: '#6366F1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}
          >
            <Upload size={28} />
          </div>
          <h4 style={{ fontWeight: 700, color: '#1E293B', marginBottom: '0.5rem' }}>Select or Drop Images</h4>
          <p style={{ color: '#64748B', fontSize: '0.85rem' }}>Supports JPG, PNG, and WebP formats</p>
        </div>
      ) : (
        <div>
          {/* Thumbnails Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: '12px',
              marginBottom: '1.5rem',
              maxHeight: '340px',
              overflowY: 'auto',
              padding: '8px',
              background: '#F8FAFC',
              borderRadius: '12px',
            }}
          >
            {previews.map((src, i) => (
              <div
                key={i}
                style={{
                  position: 'relative',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: '1px solid #E2E8F0',
                  aspectRatio: '1',
                  background: '#FFF',
                }}
              >
                <img src={src} alt={`Page ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <span
                  style={{
                    position: 'absolute',
                    bottom: '4px',
                    left: '4px',
                    padding: '2px 6px',
                    background: 'rgba(15, 23, 42, 0.75)',
                    color: '#FFF',
                    fontSize: '0.7rem',
                    borderRadius: '4px',
                    fontWeight: 700,
                  }}
                >
                  Page {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.9)',
                    color: '#FFF',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            {/* Add More Button */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                borderRadius: '10px',
                border: '2px dashed #CBD5E1',
                aspectRatio: '1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#6366F1',
                background: '#FFF',
              }}
            >
              <Plus size={24} />
              <span style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '4px' }}>Add More</span>
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748B' }}>
              <strong>{images.length}</strong> image(s) queued for PDF
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setImages([]);
                  setPreviews([]);
                }}
                style={{
                  padding: '10px 16px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: '#FFF',
                  color: '#475569',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Clear All
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={generatePdf}
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
                <Download size={18} />
                {isProcessing ? 'Generating PDF...' : 'Download Combined PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2: DOCX / PPTX to PDF (Server-side via LibreOffice BullMQ Worker)
// ─────────────────────────────────────────────────────────────────────────────
function OfficeToPdfTab() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<'pending' | 'processing' | 'done' | 'failed' | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const ext = '.' + f.name.split('.').pop()?.toLowerCase();
    const valid = ['.docx', '.pptx', '.doc', '.ppt', '.odt'];
    if (!valid.includes(ext)) {
      toast.error(`Please select a DOCX, PPTX, or DOC file.`);
      return;
    }
    setFile(f);
    setStatus(null);
    setDownloadUrl(null);
    setErrorMsg(null);
  };

  const startConversion = async () => {
    if (!file) return;
    setIsProcessing(true);
    setStatus('pending');
    setErrorMsg(null);

    try {
      const res = await toolsApi.convert(file);
      const jobId = res.data?.data?.jobId;
      if (!jobId) throw new Error('Failed to retrieve conversion job ID.');

      const poll = setInterval(async () => {
        try {
          const pollRes = await toolsApi.getJobStatus(jobId);
          const data = pollRes.data?.data;
          if (!data) return;

          setStatus(data.status);
          if (data.status === 'done') {
            clearInterval(poll);
            setIsProcessing(false);
            setDownloadUrl(toolsApi.getDownloadUrl(jobId));
            toast.success('Office document converted to PDF!');
          } else if (data.status === 'failed') {
            clearInterval(poll);
            setIsProcessing(false);
            setErrorMsg(data.error || 'LibreOffice conversion failed on server.');
            toast.error(data.error || 'Conversion failed.');
          }
        } catch {
          clearInterval(poll);
          setIsProcessing(false);
          setStatus('failed');
          setErrorMsg('Error checking conversion status.');
        }
      }, 1500);
    } catch (err: any) {
      setIsProcessing(false);
      setStatus('failed');
      const msg = err.response?.data?.message || err.message || 'Failed to submit conversion job.';
      setErrorMsg(msg);
      toast.error(msg);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.25rem' }}>
          DOCX & PPTX to PDF Converter
        </h3>
        <p style={{ color: '#64748B', fontSize: '0.875rem' }}>
          Server-side conversion via headless LibreOffice background worker. Preserves formatting and slide layouts.
        </p>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleSelect}
        accept=".docx,.pptx,.doc,.ppt,.odt"
        style={{ display: 'none' }}
      />

      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed #CBD5E1',
            borderRadius: '16px',
            padding: '3.5rem 2rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: '#F8FAFC',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#EEF2FF',
              color: '#6366F1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}
          >
            <Upload size={28} />
          </div>
          <h4 style={{ fontWeight: 700, color: '#1E293B', marginBottom: '0.5rem' }}>Upload Word or PowerPoint File</h4>
          <p style={{ color: '#64748B', fontSize: '0.85rem' }}>Supports .DOCX, .PPTX, .DOC, .PPT up to 25MB</p>
        </div>
      ) : (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem',
              background: '#F1F5F9',
              borderRadius: '12px',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '8px',
                  background: '#6366F1',
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FileSpreadsheet size={22} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>{file.name}</h4>
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            </div>
            {!isProcessing && status !== 'done' && (
              <button
                type="button"
                onClick={() => setFile(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: '0.85rem',
                }}
              >
                Change file
              </button>
            )}
          </div>

          {isProcessing && (
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid #E2E8F0',
                  borderTopColor: '#6366F1',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 1rem',
                }}
              />
              <p style={{ fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                {status === 'pending' ? 'Queued in BullMQ worker...' : 'Rendering PDF with LibreOffice...'}
              </p>
              <span style={{ color: '#64748B', fontSize: '0.85rem' }}>This usually takes 2–6 seconds</span>
            </div>
          )}

          {status === 'done' && downloadUrl && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <CheckCircle2 size={42} style={{ color: '#10B981', margin: '0 auto 0.75rem' }} />
              <h4 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
                PDF Conversion Complete!
              </h4>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '1.25rem' }}>
                <a
                  href={downloadUrl}
                  download
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    borderRadius: '10px',
                    background: '#10B981',
                    color: '#FFF',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  <Download size={18} />
                  Download Converted PDF
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setStatus(null);
                  }}
                  style={{
                    padding: '12px 18px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    background: '#FFF',
                    color: '#475569',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Convert Another
                </button>
              </div>
            </div>
          )}

          {status === 'failed' && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#EF4444' }}>
              <p style={{ fontWeight: 600, marginBottom: '1rem' }}>{errorMsg || 'Conversion failed.'}</p>
              <button
                type="button"
                onClick={() => setFile(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: '#6366F1',
                  color: '#FFF',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Try Again
              </button>
            </div>
          )}

          {!isProcessing && status !== 'done' && status !== 'failed' && (
            <button
              type="button"
              onClick={startConversion}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                background: '#6366F1',
                color: '#FFF',
                border: 'none',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <Zap size={18} />
              Convert to PDF
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 3: Merge PDFs (Client-side via pdf-lib)
// ─────────────────────────────────────────────────────────────────────────────
function MergePdfTab() {
  const [files, setFiles] = useState<File[]>([]);
  const [isMerging, setIsMerging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const pdfs = Array.from(selected).filter((f) => f.type === 'application/pdf' || f.name.endsWith('.pdf'));
    setFiles((prev) => [...prev, ...pdfs]);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const mergePdfs = async () => {
    if (files.length < 2) {
      toast.error('Please select at least 2 PDF files to merge.');
      return;
    }
    setIsMerging(true);

    try {
      const mergedPdf = await PDFDocument.create();

      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const srcPdf = await PDFDocument.load(bytes);
        const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
        copiedPages.forEach((p) => mergedPdf.addPage(p));
      }

      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `StudySync_Merged_${Date.now()}.pdf`;
      link.click();

      toast.success(`Successfully merged ${files.length} PDFs!`);
    } catch (err: any) {
      toast.error('Merge failed: ' + err.message);
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.25rem' }}>
          Merge Multiple PDFs
        </h3>
        <p style={{ color: '#64748B', fontSize: '0.875rem' }}>
          Stitch lecture handouts, project submissions, and notes together in order.
        </p>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFiles(e.target.files)}
        multiple
        accept=".pdf"
        style={{ display: 'none' }}
      />

      {files.length === 0 ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed #CBD5E1',
            borderRadius: '16px',
            padding: '3.5rem 2rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: '#F8FAFC',
          }}
        >
          <Layers size={32} style={{ color: '#6366F1', margin: '0 auto 1rem' }} />
          <h4 style={{ fontWeight: 700, color: '#1E293B', marginBottom: '0.5rem' }}>Select 2 or More PDFs to Merge</h4>
          <p style={{ color: '#64748B', fontSize: '0.85rem' }}>Click to browse your device</p>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
            {files.map((f, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  background: '#F8FAFC',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 700, color: '#6366F1', fontSize: '0.85rem' }}>#{i + 1}</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1E293B' }}>{f.name}</span>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    ({(f.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer' }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#FFF',
                color: '#334155',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Plus size={16} />
              Add More PDFs
            </button>

            <button
              type="button"
              disabled={isMerging}
              onClick={mergePdfs}
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
              }}
            >
              <Download size={18} />
              {isMerging ? 'Merging Files...' : 'Merge & Download PDF'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 4: Split PDF (Client-side via pdf-lib)
// ─────────────────────────────────────────────────────────────────────────────
function SplitPdfTab() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [pageRange, setPageRange] = useState<string>('');
  const [isSplitting, setIsSplitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    try {
      const bytes = await f.arrayBuffer();
      const pdf = await PDFDocument.load(bytes);
      setFile(f);
      setPageCount(pdf.getPageCount());
      setPageRange(`1-${pdf.getPageCount()}`);
    } catch (err: any) {
      toast.error('Could not load PDF: ' + err.message);
    }
  };

  const splitPdf = async () => {
    if (!file || pageCount === 0) return;
    setIsSplitting(true);

    try {
      const bytes = await file.arrayBuffer();
      const srcPdf = await PDFDocument.load(bytes);

      // Parse range: e.g. "1-3, 5"
      const pagesToExtract = new Set<number>();
      const parts = pageRange.split(',');

      for (const part of parts) {
        const trimmed = part.trim();
        if (trimmed.includes('-')) {
          const [startStr, endStr] = trimmed.split('-');
          const start = parseInt(startStr, 10);
          const end = parseInt(endStr, 10);
          if (!isNaN(start) && !isNaN(end)) {
            for (let i = Math.max(1, start); i <= Math.min(pageCount, end); i++) {
              pagesToExtract.add(i - 1); // 0-indexed
            }
          }
        } else {
          const single = parseInt(trimmed, 10);
          if (!isNaN(single) && single >= 1 && single <= pageCount) {
            pagesToExtract.add(single - 1);
          }
        }
      }

      if (pagesToExtract.size === 0) {
        toast.error('Please specify valid pages within range 1 to ' + pageCount);
        setIsSplitting(false);
        return;
      }

      const newPdf = await PDFDocument.create();
      const pageIndices = Array.from(pagesToExtract).sort((a, b) => a - b);
      const copied = await newPdf.copyPages(srcPdf, pageIndices);
      copied.forEach((p) => newPdf.addPage(p));

      const outBytes = await newPdf.save();
      const blob = new Blob([outBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `StudySync_Extracted_${Date.now()}.pdf`;
      link.click();

      toast.success(`Extracted ${pageIndices.length} page(s) successfully!`);
    } catch (err: any) {
      toast.error('Split failed: ' + err.message);
    } finally {
      setIsSplitting(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.25rem' }}>
          Split or Extract PDF Pages
        </h3>
        <p style={{ color: '#64748B', fontSize: '0.875rem' }}>
          Extract specific pages or page ranges from a large document or textbook chapter.
        </p>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleSelect}
        accept=".pdf"
        style={{ display: 'none' }}
      />

      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed #CBD5E1',
            borderRadius: '16px',
            padding: '3.5rem 2rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: '#F8FAFC',
          }}
        >
          <Scissors size={32} style={{ color: '#6366F1', margin: '0 auto 1rem' }} />
          <h4 style={{ fontWeight: 700, color: '#1E293B', marginBottom: '0.5rem' }}>Upload PDF to Split</h4>
          <p style={{ color: '#64748B', fontSize: '0.85rem' }}>Supports documents of any page length</p>
        </div>
      ) : (
        <div>
          <div
            style={{
              padding: '1.25rem',
              background: '#F1F5F9',
              borderRadius: '12px',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ fontWeight: 700, color: '#0F172A' }}>{file.name}</div>
            <span style={{ fontSize: '0.85rem', color: '#64748B' }}>
              Total Pages: <strong>{pageCount}</strong>
            </span>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Pages to Extract (e.g. 1-3, 5, 8-10):
            </label>
            <input
              type="text"
              value={pageRange}
              onChange={(e) => setPageRange(e.target.value)}
              placeholder="e.g. 1-5"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                fontSize: '0.95rem',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setFile(null)}
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
              Choose Different File
            </button>
            <button
              type="button"
              disabled={isSplitting}
              onClick={splitPdf}
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
              }}
            >
              <Scissors size={18} />
              {isSplitting ? 'Extracting Pages...' : 'Extract & Download PDF'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 5: PDF to Images (Client-side via pdfjs-dist)
// ─────────────────────────────────────────────────────────────────────────────
function PdfToImagesTab() {
  const [file, setFile] = useState<File | null>(null);
  const [renderedImages, setRenderedImages] = useState<string[]>([]);
  const [isRendering, setIsRendering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setRenderedImages([]);
    renderPages(f);
  };

  const renderPages = async (pdfFile: File) => {
    setIsRendering(true);

    try {
      const buffer = await pdfFile.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
      const pdf = await loadingTask.promise;

      const pageUrls: string[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;

        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;
        pageUrls.push(canvas.toDataURL('image/png'));
      }

      setRenderedImages(pageUrls);
      toast.success(`Rendered ${pageUrls.length} pages as high-resolution images!`);
    } catch (err: any) {
      toast.error('Error rendering PDF: ' + err.message);
    } finally {
      setIsRendering(false);
    }
  };

  const downloadImage = (dataUrl: string, index: number) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `Page_${index + 1}.png`;
    link.click();
  };

  const downloadAll = () => {
    renderedImages.forEach((url, i) => {
      setTimeout(() => downloadImage(url, i), i * 200);
    });
  };

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.25rem' }}>
          PDF to Images (One Image per Page)
        </h3>
        <p style={{ color: '#64748B', fontSize: '0.875rem' }}>
          Export each page of your PDF as a crisp PNG image. Renders directly in your browser with pdf.js.
        </p>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleSelect}
        accept=".pdf"
        style={{ display: 'none' }}
      />

      {!file ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed #CBD5E1',
            borderRadius: '16px',
            padding: '3.5rem 2rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: '#F8FAFC',
          }}
        >
          <ImageIcon size={32} style={{ color: '#6366F1', margin: '0 auto 1rem' }} />
          <h4 style={{ fontWeight: 700, color: '#1E293B', marginBottom: '0.5rem' }}>Upload PDF to Convert to Images</h4>
          <p style={{ color: '#64748B', fontSize: '0.85rem' }}>Renders all pages into PNG files</p>
        </div>
      ) : (
        <div>
          {isRendering && (
            <div style={{ textAlign: 'center', padding: '2.5rem 0' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid #E2E8F0',
                  borderTopColor: '#6366F1',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 1rem',
                }}
              />
              <p style={{ fontWeight: 700, color: '#0F172A' }}>Rendering pages with pdf.js...</p>
            </div>
          )}

          {renderedImages.length > 0 && (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                }}
              >
                <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 600 }}>
                  Rendered <strong>{renderedImages.length}</strong> page(s)
                </span>
                <button
                  type="button"
                  onClick={downloadAll}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: '#6366F1',
                    color: '#FFF',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.85rem',
                  }}
                >
                  <Download size={15} />
                  Download All Pages
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: '14px',
                  maxHeight: '440px',
                  overflowY: 'auto',
                  padding: '12px',
                  background: '#F8FAFC',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  marginBottom: '1.5rem',
                }}
              >
                {renderedImages.map((src, i) => (
                  <div
                    key={i}
                    style={{
                      background: '#FFF',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 2px 5px rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    <img src={src} alt={`Page ${i + 1}`} style={{ width: '100%', height: 'auto', display: 'block' }} />
                    <div
                      style={{
                        padding: '6px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderTop: '1px solid #F1F5F9',
                      }}
                    >
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>Page {i + 1}</span>
                      <button
                        type="button"
                        onClick={() => downloadImage(src, i)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#6366F1',
                          cursor: 'pointer',
                        }}
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ textAlign: 'right' }}>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: '#FFF',
                    color: '#475569',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Convert Another PDF
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
