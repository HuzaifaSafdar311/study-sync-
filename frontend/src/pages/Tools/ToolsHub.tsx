import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileArchive,
  Camera,
  FileText,
  ArrowRight,
  ShieldCheck,
  Zap,
  Cpu,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { toolsApi } from '../../services/api';

export default function ToolsHub() {
  const [healthData, setHealthData] = useState<{
    libreOffice: boolean;
    ghostscript: boolean;
  } | null>(null);

  useEffect(() => {
    toolsApi
      .getHealth()
      .then((res) => {
        if (res.data?.data) {
          setHealthData(res.data.data);
        }
      })
      .catch(() => {
        // Non-blocking diagnostic call
      });
  }, []);

  const tools = [
    {
      id: 'compressor',
      title: 'Document Compressor',
      tagline: 'Ghostscript & Sharp background worker',
      desc: 'Shrink PDFs, PowerPoint slides, Word files, and high-res images by up to 80% while retaining text crispness.',
      icon: FileArchive,
      color: '#6366F1',
      bg: 'rgba(99, 102, 241, 0.1)',
      route: '/tools/compressor',
      badge: 'BullMQ Worker',
      features: ['Ghostscript PDF compression', 'DOCX / PPTX image re-encoder', 'Before & after size comparison'],
    },
    {
      id: 'camscanner',
      title: 'Cam Scanner',
      tagline: 'Direct in-browser camera & edge quad detection',
      desc: 'Scan lecture notes or handwritten assignments via camera, straighten with perspective correction, and export to PDF.',
      icon: Camera,
      color: '#06B6D4',
      bg: 'rgba(6, 182, 212, 0.1)',
      route: '/tools/cam-scanner',
      badge: '100% Client-Side',
      features: ['Interactive corner adjustment', 'High-contrast B&W document filter', 'A4 PDF & Image export'],
    },
    {
      id: 'converter',
      title: 'PDF Converter & Suite',
      tagline: 'All-in-one PDF utilities and Office converter',
      desc: 'Merge multi-page assignments, split chapters, turn photo galleries into a single PDF, or convert DOCX & PPTX via LibreOffice.',
      icon: FileText,
      color: '#8B5CF6',
      bg: 'rgba(139, 92, 246, 0.1)',
      route: '/tools/pdf-converter',
      badge: 'Hybrid Engine',
      features: ['Multiple images to PDF', 'LibreOffice headless DOCX/PPTX', 'PDF merge, split & page-to-image'],
    },
  ];

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '2.5rem 1rem' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
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
          <Zap size={15} />
          Academic Productivity Suite
        </div>
        <h1 style={{ fontSize: '2.75rem', fontWeight: 900, color: '#0F172A', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
          StudySync Document Tools
        </h1>
        <p style={{ color: '#64748B', fontSize: '1.1rem', maxWidth: '640px', margin: '0 auto', lineHeight: 1.6 }}>
          Fast, lightweight document utilities designed for academic workflows. Pure in-browser execution where possible,
          backed by isolated BullMQ workers for heavy conversions.
        </p>
      </div>

      {/* 3 Core Tools Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
          gap: '24px',
          marginBottom: '3.5rem',
        }}
      >
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.id}
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                border: '1px solid #E2E8F0',
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.08)';
                e.currentTarget.style.borderColor = tool.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.04)';
                e.currentTarget.style.borderColor = '#E2E8F0';
              }}
            >
              <div>
                {/* Badge & Icon */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                  <div
                    style={{
                      width: '54px',
                      height: '54px',
                      borderRadius: '14px',
                      background: tool.bg,
                      color: tool.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={28} />
                  </div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '999px',
                      background: '#F1F5F9',
                      color: '#475569',
                    }}
                  >
                    {tool.badge}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.35rem' }}>
                  {tool.title}
                </h3>
                <span style={{ fontSize: '0.8rem', color: tool.color, fontWeight: 600, display: 'block', marginBottom: '0.75rem' }}>
                  {tool.tagline}
                </span>
                <p style={{ color: '#64748B', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                  {tool.desc}
                </p>

                {/* Bullet Features */}
                <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '1rem', marginBottom: '1.75rem' }}>
                  {tool.features.map((feat, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.825rem', color: '#475569', marginBottom: '6px' }}>
                      <CheckCircle2 size={14} style={{ color: '#10B981', flexShrink: 0 }} />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <Link
                to={tool.route}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  background: tool.color,
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                  boxShadow: `0 4px 12px ${tool.color}33`,
                }}
              >
                Launch Tool
                <ArrowRight size={16} />
              </Link>
            </div>
          );
        })}
      </div>

      {/* Security & System Architecture Info Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          background: '#F8FAFC',
          borderRadius: '18px',
          border: '1px solid #E2E8F0',
          padding: '1.75rem',
        }}
      >
        <div style={{ display: 'flex', gap: '12px' }}>
          <ShieldCheck size={24} style={{ color: '#6366F1', flexShrink: 0 }} />
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>
              Zero-Retention Privacy
            </h4>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748B', lineHeight: 1.4 }}>
              Client tools run entirely in-browser. Server conversion files are purged automatically after 1 hour.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Clock size={24} style={{ color: '#10B981', flexShrink: 0 }} />
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>
              BullMQ Async Queues
            </h4>
            <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748B', lineHeight: 1.4 }}>
              Long-running Office conversions and Ghostscript jobs never block web requests.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Cpu size={24} style={{ color: '#8B5CF6', flexShrink: 0 }} />
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>
              Engine Status
            </h4>
            <div style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748B', lineHeight: 1.4 }}>
              LibreOffice: {healthData ? (healthData.libreOffice ? '✅ Ready' : '⚠️ Offline') : 'Checking...'} •
              Ghostscript: {healthData ? (healthData.ghostscript ? '✅ Ready' : '⚠️ Offline') : 'Checking...'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
