import { useState, useEffect } from 'react';
import { useSEO } from '../hooks/useSEO';
import { Link } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import PublicFooter from '../components/PublicFooter';
import {
  ArrowRight,
  Play,
  Check,
  Search,
  BookOpen,
  FileText,
  GraduationCap,
  Settings,
  Clock,
  Sparkles,
  Bot,
  Video,
  Bell,
  CheckSquare,
  Camera,
  Minimize2,
  X,
  FileCheck,
} from 'lucide-react';

export default function Landing() {
  useSEO({
    title: 'StudySync AI — Intelligent Academic Platform for University Students',
    description:
      'StudySync AI is the autonomous academic operating system. Upload lecture slides, get verified slide citations, and receive proactive WhatsApp and email deadline alerts. Zero subscriptions required.',
    canonical: 'https://studysync.ai/',
  });

  const [demoModalOpen, setDemoModalOpen] = useState(false);

  // Scroll reveal observer for smooth scroll-triggered animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      {
        root: null,
        rootMargin: '0px 0px -40px 0px',
        threshold: 0.08,
      }
    );

    const revealElements = document.querySelectorAll('.ss-reveal');
    revealElements.forEach((el) => observer.observe(el));

    return () => {
      revealElements.forEach((el) => observer.unobserve(el));
      observer.disconnect();
    };
  }, []);

  return (
    <div className="ss-landing-page ss-light-landing">
      {/* Background Soft Meshes for luminous modern feel */}
      <div className="ss-glow-mesh-1" />
      <div className="ss-glow-mesh-2" />

      {/* ─── Fixed Top Navbar (Pure White Header) ────────────────────────── */}
      <PublicHeader />

      {/* ─── Hero 2-Column Section (Exact User Reference Design) ─────────── */}
      <section id="hero" className="ss-ref-hero-section">
        <div className="ss-ref-hero-grid">
          {/* Left Column: Heading, Subtitle, CTAs, Checks */}
          <div className="ss-ref-hero-left ss-reveal">


            <h1 className="ss-ref-hero-title">
              Your Study Life, <br />
              <span className="ss-ref-synced-word">Synced</span> in One Place.
            </h1>

            <p className="ss-ref-hero-subtitle">
              Upload your notes, PDFs, lectures and assignments. Let StudySync organize, understand and help you learn better — with AI.
            </p>

            {/* CTAs */}
            <div className="ss-ref-cta-group">
              <Link to="/register" className="ss-ref-btn-primary">
                <span>Get Started Free</span>
                <ArrowRight size={16} />
              </Link>
              <button
                type="button"
                onClick={() => setDemoModalOpen(true)}
                className="ss-ref-btn-demo"
              >
                <span className="ss-ref-play-bubble">
                  <Play size={11} fill="#2563EB" color="#2563EB" />
                </span>
                <span>Watch Demo</span>
              </button>
            </div>

            {/* 3 Checkmarks */}
            <div className="ss-ref-checks">
              <div className="ss-ref-check-item">
                <Check size={16} color="#2563EB" strokeWidth={2.5} />
                <span>Easy to use</span>
              </div>
              <div className="ss-ref-check-item">
                <Check size={16} color="#2563EB" strokeWidth={2.5} />
                <span>Secure & Private</span>
              </div>
              <div className="ss-ref-check-item">
                <Check size={16} color="#2563EB" strokeWidth={2.5} />
                <span>Built for Students</span>
              </div>
            </div>
          </div>

          {/* Right Column: Realistic Floating Dashboard Mockup */}
          <div className="ss-ref-mockup-wrap ss-reveal ss-delay-1">
            {/* Playful Top-Right Sparkle Rays SVG */}
            <svg
              className="ss-ref-sparkle-rays"
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <line x1="12" y1="2" x2="12" y2="7" />
              <line x1="19.07" y1="4.93" x2="15.54" y2="8.46" />
              <line x1="22" y1="12" x2="17" y2="12" />
            </svg>

            <div className="ss-ref-window-card">
              {/* Top Header inside Mockup */}
              <div className="ss-ref-window-header">
                <div className="ss-ref-window-brand">
                  <BookOpen size={16} color="#2563EB" />
                  <span>StudySync</span>
                </div>

                <div className="ss-ref-window-search">
                  <div className="ss-ref-mini-search">
                    <Search size={13} color="#94A3B8" />
                    <span>Search anything...</span>
                  </div>
                  <div className="ss-ref-avatar-badge">
                    <span>A</span>
                  </div>
                </div>
              </div>

              {/* Interior Mockup Layout (Sidebar + Main Dashboard) */}
              <div className="ss-ref-window-body">
                {/* Mini Sidebar */}
                <div className="ss-ref-sidebar">
                  <div className="ss-ref-sidebar-item active">
                    <BookOpen size={13} color="#2563EB" />
                    <span>Home</span>
                  </div>
                  <div className="ss-ref-sidebar-item">
                    <FileText size={13} />
                    <span>Notes</span>
                  </div>
                  <div className="ss-ref-sidebar-item">
                    <GraduationCap size={13} />
                    <span>Lectures</span>
                  </div>
                  <div className="ss-ref-sidebar-item">
                    <CheckSquare size={13} />
                    <span>Assignments</span>
                  </div>
                  <div className="ss-ref-sidebar-item">
                    <Clock size={13} />
                    <span>Reminders</span>
                  </div>
                  <div className="ss-ref-sidebar-item">
                    <Settings size={13} />
                    <span>Settings</span>
                  </div>
                </div>

                {/* Main Dashboard Area */}
                <div className="ss-ref-main-dash">
                  <div>
                    <h3 className="ss-ref-dash-greeting">Good Morning,User 👋</h3>
                    <p className="ss-ref-dash-subgreeting">Keep going, your goals are within reach.</p>
                  </div>

                  {/* 4 Colorful KPI Cards */}
                  <div className="ss-ref-kpi-grid">
                    {/* Card 1: Notes (Blue) */}
                    <div className="ss-ref-kpi-card" style={{ background: '#EFF6FF', border: '1px solid #DBEAFE', color: '#1E40AF' }}>
                      <div className="ss-ref-kpi-top">
                        <FileText size={13} />
                        <span>Notes</span>
                      </div>
                      <div className="ss-ref-kpi-num">12</div>
                      <div className="ss-ref-kpi-meta">Updated recently</div>
                    </div>

                    {/* Card 2: Assignments (Purple) */}
                    <div className="ss-ref-kpi-card" style={{ background: '#FAF5FF', border: '1px solid #F3E8FF', color: '#6B21A8' }}>
                      <div className="ss-ref-kpi-top">
                        <CheckSquare size={13} />
                        <span>Assignments</span>
                      </div>
                      <div className="ss-ref-kpi-num">3</div>
                      <div className="ss-ref-kpi-meta">2 due soon</div>
                    </div>

                    {/* Card 3: Quizzes (Cyan) */}
                    <div className="ss-ref-kpi-card" style={{ background: '#F0FDF4', border: '1px solid #DCFCE7', color: '#15803D' }}>
                      <div className="ss-ref-kpi-top">
                        <GraduationCap size={13} />
                        <span>Quizzes</span>
                      </div>
                      <div className="ss-ref-kpi-num">5</div>
                      <div className="ss-ref-kpi-meta">Next in 2 days</div>
                    </div>

                    {/* Card 4: Reminders (Green) */}
                    <div className="ss-ref-kpi-card" style={{ background: '#F0FDF4', border: '1px solid #DCFCE7', color: '#047857' }}>
                      <div className="ss-ref-kpi-top">
                        <Bell size={13} />
                        <span>Reminders</span>
                      </div>
                      <div className="ss-ref-kpi-num">4</div>
                      <div className="ss-ref-kpi-meta">Upcoming</div>
                    </div>
                  </div>

                  {/* Two-column bottom section inside mockup */}
                  <div className="ss-ref-dash-bottom">
                    {/* Left: Recent Activity */}
                    <div className="ss-ref-subcard">
                      <h4 className="ss-ref-subcard-title">Recent Activity</h4>
                      <div className="ss-ref-activity-list">
                        <div className="ss-ref-activity-row">
                          <div className="ss-ref-activity-info">
                            <FileText size={12} color="#2563EB" />
                            <span>Lecture Summary - Database Systems • 12m ago</span>
                          </div>
                          <span className="ss-ref-view-badge">View</span>
                        </div>
                        <div className="ss-ref-activity-row">
                          <div className="ss-ref-activity-info">
                            <CheckSquare size={12} color="#DC2626" />
                            <span>Assignment Due - Web Dev • Due tomorrow</span>
                          </div>
                          <span className="ss-ref-view-badge">View</span>
                        </div>
                        <div className="ss-ref-activity-row">
                          <div className="ss-ref-activity-info">
                            <Clock size={12} color="#D97706" />
                            <span>Quiz Reminder - Machine Learning • In 5 days</span>
                          </div>
                          <span className="ss-ref-view-badge">View</span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Upcoming */}
                    <div className="ss-ref-subcard">
                      <h4 className="ss-ref-subcard-title">Upcoming</h4>
                      <div className="ss-ref-activity-list">
                        <div className="ss-ref-activity-row">
                          <div className="ss-ref-activity-info">
                            <CheckSquare size={12} color="#4F46E5" />
                            <span>Assignment: Web Dev • Tomorrow</span>
                          </div>
                        </div>
                        <div className="ss-ref-activity-row">
                          <div className="ss-ref-activity-info">
                            <GraduationCap size={12} color="#059669" />
                            <span>Quiz: Machine Learning • In 3 days</span>
                          </div>
                        </div>
                        <div className="ss-ref-activity-row">
                          <div className="ss-ref-activity-info">
                            <BookOpen size={12} color="#2563EB" />
                            <span>Class Lecture: Computer Networks</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Powerful Features (Exact 5 Cards Matching Reference) ────────── */}
      <section id="features" className="ss-ref-features-section ss-reveal">
        <div className="ss-edu-container">
          <div className="ss-ref-section-tag">Powerful Features</div>
          <h2 className="ss-ref-section-title">Everything You Need to Stay Ahead</h2>
          <p className="ss-ref-section-subtitle">
            All your study tools, powered by AI in one simple platform.
          </p>

          <div className="ss-ref-5cards-grid">
            {/* Card 1: Notes & PDFs */}
            <div className="ss-ref-card-item ss-reveal ss-delay-1">
              <div className="ss-ref-card-icon" style={{ background: '#EFF6FF', color: '#2563EB' }}>
                <FileText size={24} />
              </div>
              <h3 className="ss-ref-card-title">Notes & PDFs</h3>
              <p className="ss-ref-card-desc">
                Upload and organize your notes, lecture slides and handouts in one centralized space.
              </p>
            </div>

            {/* Card 2: AI Chatbot */}
            <div className="ss-ref-card-item ss-reveal ss-delay-2">
              <div className="ss-ref-card-icon" style={{ background: '#E0F2FE', color: '#0284C7' }}>
                <Bot size={24} />
              </div>
              <h3 className="ss-ref-card-title">AI Chatbot</h3>
              <p className="ss-ref-card-desc">
                Ask questions, get instant answers from your uploaded course slides with exact citations.
              </p>
            </div>

            {/* Card 3: Lecture Understanding */}
            <div className="ss-ref-card-item ss-reveal ss-delay-3">
              <div className="ss-ref-card-icon" style={{ background: '#F3E8FF', color: '#7C3AED' }}>
                <Video size={24} />
              </div>
              <h3 className="ss-ref-card-title">Lecture Understanding</h3>
              <p className="ss-ref-card-desc">
                Break down complex 100-slide presentations and lecture recordings into clear summaries.
              </p>
            </div>

            {/* Card 4: Smart Reminders */}
            <div className="ss-ref-card-item ss-reveal ss-delay-4">
              <div className="ss-ref-card-icon" style={{ background: '#FCE7F3', color: '#DB2777' }}>
                <Bell size={24} />
              </div>
              <h3 className="ss-ref-card-title">Smart Reminders</h3>
              <p className="ss-ref-card-desc">
                Never miss a deadline. Get automated alerts and agendas via WhatsApp in English & Roman Urdu.
              </p>
            </div>

            {/* Card 5: Quiz & Assignment */}
            <div className="ss-ref-card-item ss-reveal ss-delay-5">
              <div className="ss-ref-card-icon" style={{ background: '#E0F2FE', color: '#0284C7' }}>
                <CheckSquare size={24} />
              </div>
              <h3 className="ss-ref-card-title">Quiz & Assignment</h3>
              <p className="ss-ref-card-desc">
                Track upcoming deadlines, test yourself with auto-generated flashcards and practice quizzes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Subscription Document Utility Suite Spotlight ──────────────────────── */}
      <section className="ss-tools-spotlight-section ss-reveal">
        <div className="ss-edu-container">
          <div className="ss-edu-section-header ss-reveal">
            <div className="ss-edu-section-tag">INCLUDED IN YOUR SUBSCRIPTION</div>
            <h2 className="ss-edu-section-title">All Your Academic Document Tools. One Unified Subscription.</h2>
            <p className="ss-edu-section-subtitle">
              Replace costly individual software licenses. HD paper scanning, universal file conversion, and lossless PDF compression are bundled directly into your StudySync subscription plan.
            </p>
          </div>

          <div className="ss-tools-spotlight-grid">
            {/* Spotlight 1: CamScanner */}
            <div className="ss-spotlight-card ss-reveal ss-delay-1">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
                  <div className="ss-spotlight-icon" style={{ background: '#EFF6FF', color: '#2563EB', marginBottom: 0 }}>
                    <Camera size={28} />
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2563EB', background: '#EFF6FF', padding: '4px 10px', borderRadius: '9999px', border: '1px solid #DBEAFE', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Plan Feature
                  </span>
                </div>
                <h3 className="ss-spotlight-title">HD CamScanner Studio</h3>
                <p className="ss-spotlight-desc">
                  Capture physical paper handouts, whiteboard slides, and handwritten assignments with your phone or webcam. Features auto-edge detection and contrast enhancement.
                </p>
              </div>
              <Link to="/tools/camscanner" className="ss-spotlight-btn">
                <span>Launch CamScanner</span>
                <ArrowRight size={16} />
              </Link>
            </div>

            {/* Spotlight 2: Universal Converter */}
            <div className="ss-spotlight-card ss-reveal ss-delay-2">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
                  <div className="ss-spotlight-icon" style={{ background: '#ECFDF5', color: '#059669', marginBottom: 0 }}>
                    <FileCheck size={28} />
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669', background: '#ECFDF5', padding: '4px 10px', borderRadius: '9999px', border: '1px solid #A7F3D0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Plan Feature
                  </span>
                </div>
                <h3 className="ss-spotlight-title">Universal Document Converter</h3>
                <p className="ss-spotlight-desc">
                  Easily convert lecture notes and assignments between PDF, Microsoft Word (.docx), PowerPoint (.pptx), Excel (.xlsx), and JPG with complete formatting integrity.
                </p>
              </div>
              <Link to="/tools/pdf-converter" className="ss-spotlight-btn">
                <span>Launch PDF Converter</span>
                <ArrowRight size={16} />
              </Link>
            </div>

            {/* Spotlight 3: PDF Compressor */}
            <div className="ss-spotlight-card ss-reveal ss-delay-3">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
                  <div className="ss-spotlight-icon" style={{ background: '#FEF3C7', color: '#D97706', marginBottom: 0 }}>
                    <Minimize2 size={28} />
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#D97706', background: '#FEF3C7', padding: '4px 10px', borderRadius: '9999px', border: '1px solid #FDE68A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Plan Feature
                  </span>
                </div>
                <h3 className="ss-spotlight-title">Smart PDF Compressor</h3>
                <p className="ss-spotlight-desc">
                  University LMS portals often cap uploads at 5MB or 10MB. Shrink 50MB slide decks and high-res lab reports down to compliant sizes while keeping text crisp.
                </p>
              </div>
              <Link to="/tools/pdf-compressor" className="ss-spotlight-btn">
                <span>Launch PDF Compressor</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <div style={{ marginTop: '36px', textAlign: 'center' }}>
            <Link
              to="/pricing"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.92rem',
                fontWeight: 600,
                color: '#2563EB',
                textDecoration: 'none',
              }}
            >
              <span>Explore all subscription plans & included features</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 3-Step Student Workflow ────────────────────────────────────── */}
      <section className="ss-workflow-section ss-reveal">
        <div className="ss-edu-container">
          <div className="ss-edu-section-header ss-reveal">
            <div className="ss-edu-section-tag">HOW IT WORKS</div>
            <h2 className="ss-edu-section-title">Effortless Academic Mastery in 3 Steps</h2>
            <p className="ss-edu-section-subtitle">
              Get set up in under two minutes and experience true academic autonomy.
            </p>
          </div>

          <div className="ss-workflow-steps">
            <div className="ss-step-card ss-reveal ss-delay-1">
              <span className="ss-step-number">STEP 01</span>
              <h3 className="ss-step-title">Upload Course Materials</h3>
              <p className="ss-step-desc">
                Drag and drop your professor's lecture slides, syllabus, and assignment sheets. StudySync automatically vectorizes formulas, tables, and notes into an isolated workspace.
              </p>
            </div>

            <div className="ss-step-card ss-reveal ss-delay-2">
              <span className="ss-step-number">STEP 02</span>
              <h3 className="ss-step-title">Connect WhatsApp & Calendar</h3>
              <p className="ss-step-desc">
                Link your WhatsApp with one click. Your calendar immediately syncs all course deadlines, exam dates, and morning agendas in English or Roman Urdu.
              </p>
            </div>

            <div className="ss-step-card ss-reveal ss-delay-3">
              <span className="ss-step-number">STEP 03</span>
              <h3 className="ss-step-title">Ace Your Exams with Clarity</h3>
              <p className="ss-step-desc">
                Ask tough conceptual questions, generate active recall flashcards, and compress your final lab reports for instant submission.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Final High-Converting CTA Banner ──────────────────────────── */}
      <section className="ss-final-cta-section ss-reveal">
        <div className="ss-edu-container">
          <div className="ss-final-cta-card">
            <h2 className="ss-final-cta-title">Ready to Elevate Your Academic Journey?</h2>
            <p className="ss-final-cta-subtitle">
              Join over 15,000+ university students studying smarter with autonomous AI assistance. Free forever plan available.
            </p>
            <div className="ss-final-cta-buttons">
              <Link to="/register" className="ss-cta-btn-white">
                <span>Start Studying Free</span>
                <ArrowRight size={18} />
              </Link>
              <Link to="/tools" className="ss-cta-btn-outline">
                <FileText size={18} />
                <span>Explore Document Tools</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Watch Demo Modal ──────────────────────────────────────────── */}
      {demoModalOpen && (
        <div className="ss-ref-modal-overlay" onClick={() => setDemoModalOpen(false)}>
          <div className="ss-ref-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="ss-ref-modal-close"
              onClick={() => setDemoModalOpen(false)}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '5px 12px', borderRadius: '9999px', background: '#EFF6FF', color: '#2563EB', fontSize: '0.78rem', fontWeight: 700, marginBottom: '16px' }}>
              <Sparkles size={14} />
              <span>Interactive Platform Tour</span>
            </div>

            <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', margin: '0 0 10px' }}>
              See StudySync in Action
            </h3>

            <p style={{ fontSize: '0.925rem', color: '#64748B', lineHeight: 1.6, margin: '0 0 24px' }}>
              StudySync connects your university lecture slides directly with a personalized AI Copilot and your WhatsApp number. Here is what you can do right now:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A', margin: '0 0 2px' }}>Grounded Lecture Slide Q&A</h4>
                  <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>Ask questions in English or Roman Urdu and get answers with exact slide citations.</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bell size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A', margin: '0 0 2px' }}>WhatsApp Autonomous Deadlines</h4>
                  <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>Never miss quizzes or assignments. Proactive reminders sent straight to your phone.</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', background: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Camera size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A', margin: '0 0 2px' }}>Free Document Studio</h4>
                  <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>Scan paper notes with CamScanner, convert formats, and compress PDFs for LMS.</p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setDemoModalOpen(false)}
                style={{ padding: '10px 20px', borderRadius: '9999px', border: '1px solid #CBD5E1', background: '#FFFFFF', color: '#475569', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
              >
                Close
              </button>
              <Link
                to="/register"
                className="ss-ref-btn-primary"
                style={{ padding: '10px 24px', fontSize: '0.875rem' }}
                onClick={() => setDemoModalOpen(false)}
              >
                <span>Get Started Free</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ─── Footer (Shared PublicFooter) ──────────────────────────────── */}
      <PublicFooter />
    </div>
  );
}
