import React, { useState, useRef } from 'react';
import {
  FileArchive,
  Upload,
  ArrowRight,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sliders,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { toolsApi } from '../../services/api';

export default function Compressor() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [qualityLevel, setQualityLevel] = useState<'ebook' | 'screen' | 'prepress'>('ebook');
  const [isUploading, setIsUploading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<'pending' | 'processing' | 'done' | 'failed' | null>(null);
  const [jobData, setJobData] = useState<{
    originalSize?: number;
    compressedSize?: number;
    reductionPercent?: number;
    downloadUrl?: string;
    error?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error('File size exceeds the 25MB maximum limit.');
      return;
    }

    const validExtensions = ['.pdf', '.docx', '.pptx', '.jpg', '.jpeg', '.png', '.webp'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validExtensions.includes(ext)) {
      toast.error(`Unsupported format (${ext}). Supported: PDF, DOCX, PPTX, JPG, PNG, WEBP.`);
      return;
    }

    setSelectedFile(file);
    setJobId(null);
    setJobStatus(null);
    setJobData(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error('File size exceeds the 25MB maximum limit.');
      return;
    }

    const validExtensions = ['.pdf', '.docx', '.pptx', '.jpg', '.jpeg', '.png', '.webp'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validExtensions.includes(ext)) {
      toast.error(`Unsupported format (${ext}). Supported: PDF, DOCX, PPTX, JPG, PNG, WEBP.`);
      return;
    }

    setSelectedFile(file);
    setJobId(null);
    setJobStatus(null);
    setJobData(null);
  };

  const pollJob = (id: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await toolsApi.getJobStatus(id);
        const data = res.data?.data;
        if (!data) return;

        setJobStatus(data.status);

        if (data.status === 'done') {
          clearInterval(interval);
          setIsUploading(false);
          setJobData({
            originalSize: data.originalSize,
            compressedSize: data.compressedSize,
            reductionPercent: data.reductionPercent,
            downloadUrl: toolsApi.getDownloadUrl(id),
          });
          toast.success('Document compressed successfully!');
        } else if (data.status === 'failed') {
          clearInterval(interval);
          setIsUploading(false);
          setJobData({ error: data.error || 'Compression failed on server.' });
          toast.error(data.error || 'Compression failed.');
        }
      } catch (err: any) {
        clearInterval(interval);
        setIsUploading(false);
        setJobStatus('failed');
        toast.error('Error checking job status.');
      }
    }, 1500);
  };

  const handleStartCompression = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setJobStatus('pending');

    try {
      const res = await toolsApi.compress(selectedFile, qualityLevel);
      const newJobId = res.data?.data?.jobId;
      if (newJobId) {
        setJobId(newJobId);
        pollJob(newJobId);
      } else {
        throw new Error('No job ID returned.');
      }
    } catch (err: any) {
      setIsUploading(false);
      setJobStatus('failed');
      const msg = err.response?.data?.message || err.message || 'Failed to queue compression job.';
      toast.error(msg);
      setJobData({ error: msg });
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setJobId(null);
    setJobStatus(null);
    setJobData(null);
    setIsUploading(false);
  };

  return (
    <div style={{ maxWidth: '840px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
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
            marginBottom: '1rem',
          }}
        >
          <FileArchive size={16} />
          Multi-Format Smart Compressor
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.75rem' }}>
          Document & Media Compressor
        </h1>
        <p style={{ color: '#64748B', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto' }}>
          Shrink PDFs, Office files, and images without sacrificing legibility. Uses Ghostscript and Sharp
          background workers with automated 1-hour secure cleanup.
        </p>
      </div>

      {/* Main Container Card */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          padding: '2rem',
        }}
      >
        {!selectedFile ? (
          /* Dropzone */
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed #CBD5E1',
              borderRadius: '16px',
              padding: '3.5rem 2rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: '#F8FAFC',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#6366F1';
              e.currentTarget.style.background = '#EEF2FF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#CBD5E1';
              e.currentTarget.style.background = '#F8FAFC';
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              aria-label="Upload document or image to compress"
              onChange={handleFileChange}
              accept=".pdf,.docx,.pptx,.jpg,.jpeg,.png,.webp"
              style={{ display: 'none' }}
            />
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(99, 102, 241, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
                color: '#6366F1',
              }}
            >
              <Upload size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1E293B', marginBottom: '0.5rem' }}>
              Drop your document or image here
            </h3>
            <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Supports <strong>PDF, DOCX, PPTX, JPG, PNG, WEBP</strong> up to <strong>25MB</strong>
            </p>
            <span
              style={{
                display: 'inline-block',
                padding: '8px 18px',
                borderRadius: '8px',
                background: '#6366F1',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '0.875rem',
              }}
            >
              Browse Files
            </span>
          </div>
        ) : (
          /* File Selected / Processing / Result View */
          <div>
            {/* File info banner */}
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
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: '#6366F1',
                    color: '#FFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileText size={24} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>
                    {selectedFile.name}
                  </h4>
                  <span style={{ fontSize: '0.825rem', color: '#64748B' }}>
                    {formatBytes(selectedFile.size)} • {selectedFile.name.split('.').pop()?.toUpperCase()}
                  </span>
                </div>
              </div>
              {!isUploading && jobStatus !== 'done' && (
                <button
                  onClick={handleReset}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748B',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    textDecoration: 'underline',
                  }}
                >
                  Change file
                </button>
              )}
            </div>

            {/* Quality Settings (only shown prior to execution) */}
            {!isUploading && jobStatus !== 'done' && (
              <div style={{ marginBottom: '2rem' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: '#334155',
                    marginBottom: '0.75rem',
                  }}
                >
                  <Sliders size={15} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                  Compression Mode
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  {[
                    { id: 'screen', title: 'Maximum Shrink', desc: 'Aggressive downsampling. Best for LMS uploads.' },
                    { id: 'ebook', title: 'Balanced (Standard)', desc: 'Sharp text & optimized media. Recommended.' },
                    { id: 'prepress', title: 'High Quality', desc: 'Mild compression. Retains high resolution.' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setQualityLevel(mode.id as any)}
                      style={{
                        padding: '12px',
                        borderRadius: '10px',
                        border: qualityLevel === mode.id ? '2px solid #6366F1' : '1px solid #CBD5E1',
                        background: qualityLevel === mode.id ? '#EEF2FF' : '#FFFFFF',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: qualityLevel === mode.id ? '#4338CA' : '#1E293B', marginBottom: '4px' }}>
                        {mode.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                        {mode.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Processing State */}
            {isUploading && (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    border: '4px solid #E2E8F0',
                    borderTopColor: '#6366F1',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 1.5rem',
                  }}
                />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.5rem' }}>
                  {jobStatus === 'pending' ? 'Queuing Background Job...' : 'Compressing Document...'}
                </h3>
                <p style={{ color: '#64748B', fontSize: '0.9rem', maxWidth: '400px', margin: '0 auto' }}>
                  Processing in BullMQ worker. Ghostscript and Sharp are repacking embedded assets.
                  {jobId && <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '6px', color: '#94A3B8' }}>Job ID: {jobId}</span>}
                </p>
              </div>
            )}

            {/* Result State */}
            {jobStatus === 'done' && jobData && (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'rgba(16, 185, 129, 0.1)',
                    color: '#10B981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                  }}
                >
                  <CheckCircle2 size={32} />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
                  Compression Finished!
                </h3>
                <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '2rem' }}>
                  Your document has been optimized and is ready for download.
                </p>

                {/* Reduction metrics comparison */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px',
                    background: '#F8FAFC',
                    padding: '1.5rem',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0',
                    marginBottom: '2rem',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                      Original Size
                    </span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#64748B', marginTop: '4px' }}>
                      {formatBytes(jobData.originalSize)}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600 }}>
                      Compressed Size
                    </span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginTop: '4px' }}>
                      {formatBytes(jobData.compressedSize)}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#10B981', textTransform: 'uppercase', fontWeight: 700 }}>
                      Reduction
                    </span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>
                      -{jobData.reductionPercent || 0}%
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  {jobData.downloadUrl && (
                    <a
                      href={jobData.downloadUrl}
                      download
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 24px',
                        borderRadius: '10px',
                        background: '#10B981',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        textDecoration: 'none',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                      }}
                    >
                      <Download size={18} />
                      Download Compressed File
                    </a>
                  )}
                  <button
                    onClick={handleReset}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 20px',
                      borderRadius: '10px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#475569',
                      fontWeight: 600,
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                    }}
                  >
                    <RefreshCw size={16} />
                    Compress Another
                  </button>
                </div>
              </div>
            )}

            {/* Error State */}
            {jobStatus === 'failed' && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#EF4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1rem',
                  }}
                >
                  <AlertCircle size={32} />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
                  Compression Failed
                </h3>
                <p style={{ color: '#EF4444', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  {jobData?.error || 'An unexpected error occurred during processing.'}
                </p>
                <button
                  onClick={handleReset}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    background: '#6366F1',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Primary Action Button (Prior to start) */}
            {!isUploading && jobStatus !== 'done' && jobStatus !== 'failed' && (
              <button
                type="button"
                onClick={handleStartCompression}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '12px',
                  background: '#6366F1',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '1rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#4F46E5')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#6366F1')}
              >
                <Zap size={18} />
                Start Server-Side Compression
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Feature notice footer */}
      <div
        style={{
          marginTop: '2rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '16px',
        }}
      >
        <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1E293B', marginBottom: '4px' }}>
            Ghostscript Engine
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
            Deep PDF downsampling and stream compression for fast submissions.
          </div>
        </div>
        <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1E293B', marginBottom: '4px' }}>
            Office Unzip & Rezip
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
            Extracts heavy media inside DOCX/PPTX slides and recompresses with Sharp.
          </div>
        </div>
        <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#1E293B', marginBottom: '4px' }}>
            Auto-Purge Security
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
            Uploaded & output files are automatically wiped after 1 hour.
          </div>
        </div>
      </div>
    </div>
  );
}
