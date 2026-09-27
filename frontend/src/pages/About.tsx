import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import PublicFooter from '../components/PublicFooter';
import { useSEO } from '../hooks/useSEO';
import {
  Sparkles,
  ShieldCheck,
  Layers,
  Bell,
  Lock,
  ArrowRight,
  CheckCircle2,
  Cpu,
  BookOpen,
  Zap,
  Award,
  Terminal,
  FileText,
  Search,
} from 'lucide-react';

export default function About() {
  useSEO({
    title: 'About StudySync AI - Autonomous Academic Platform for University Students',
    description:
      'Learn about StudySync AI: the autonomous academic operating system that indexes lecture slides via vector search, provides deterministic slide citations, and dispatches proactive deadline alerts via WhatsApp and email.',
    canonical: 'https://studysync.ai/about',
  });

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

  const corePillars = [
    {
      icon: <ShieldCheck size={28} color="#10B981" />,
      bg: '#ECFDF5',
      title: 'Zero-Knowledge Isolation & Sovereignty',
      desc: 'All uploaded coursework, lecture decks, assignment briefs, and academic calendar dates are strictly isolated within your private database schema via Supabase Row-Level Security. We enforce an uncompromising zero-retention policy on third-party model training, ensuring your academic records and intellectual property remain entirely private.',
    },
    {
      icon: <Layers size={28} color="#6366F1" />,
      bg: '#EEF2FF',
      title: 'Deterministic Slide & Page Citations',
      desc: "Unlike generalized chatbots that fabricate plausible answers, StudySync AI anchors every response directly to your professor's lecture material. Each generated explanation includes verifiable slide numbers and verbatim excerpts, allowing students to verify factual correctness before examinations.",
    },
    {
      icon: <Bell size={28} color="#0284C7" />,
      bg: '#F0F9FF',
      title: 'Autonomous Background Agency',
      desc: 'Productivity should not demand perpetual screen time. StudySync operates continuously in the background, analyzing course milestones to dispatch timely alerts to your WhatsApp and Gmail inbox so that impending quizzes, project submissions, and examination dates are never overlooked.',
    },
    {
      icon: <Lock size={28} color="#F59E0B" />,
      bg: '#FFFBEB',
      title: 'Client-Side BYOK Sovereignty',
      desc: 'Empowering students with complete autonomy, StudySync supports Bring-Your-Own-Key (BYOK) architecture for Google Gemini and Groq models. Keys are encrypted client-side using authenticated AES-256-GCM prior to storage, granting students full control over compute resources at zero additional cost.',
    },
  ];

  const manifestoPoints = [
    {
      num: '01 / Rigor',
      title: 'Academic Rigor Over Shortcuts',
      text: "We do not believe in replacing the student's intellect. StudySync AI is designed as a cognitive amplifier that accelerates comprehension, organizes complex syllabi, and verifies references - ensuring students develop authentic mastery over their coursework rather than a superficial familiarity.",
    },
    {
      num: '02 / Velocity',
      title: 'Frictionless Student Experience',
      text: 'A tool that requires hours of configuration will inevitably be abandoned during exam week. Every workflow within StudySync is engineered for zero friction: instantaneous document uploads, automated parsing, and no complex setup required to begin querying your lecture material immediately.',
    },
    {
      num: '03 / Trust',
      title: 'Student Sovereignty & Transparent Design',
      text: 'University students deserve tools that honor their privacy and respect their academic boundaries. We reject opaque data surveillance, invasive behavioral tracking, and predatory subscription lock-in - prioritizing transparent, auditable software architecture and clear data ownership.',
    },
  ];

  const architectureSteps = [
    {
      icon: <FileText size={18} color="#4F46E5" />,
      title: 'Curriculum Ingestion Pipeline',
      desc: 'Parses complex multi-page lecture decks, syllabi, and PDFs into semantically indexed vectors.',
    },
    {
      icon: <Cpu size={18} color="#4F46E5" />,
      title: 'Deterministic Vector Clustering',
      desc: 'High-speed FAISS similarity indexing with exact slide, chapter, and line anchoring.',
    },
    {
      icon: <Terminal size={18} color="#4F46E5" />,
      title: 'ReAct Grounded Reasoning Agent',
      desc: 'Multi-turn reasoning loop cross-referencing lecture excerpts to prevent hallucinations.',
    },
    {
      icon: <Search size={18} color="#4F46E5" />,
      title: 'Omnichannel Proactive Dispatcher',
      desc: 'Background cron dispatcher delivering scheduled alerts to WhatsApp and Gmail.',
    },
  ];

  return (
    <div className="ss-landing-page ss-light-landing">
      {/* Soft Ambient Glows */}
      <div className="ss-glow-mesh-1" />
      <div className="ss-glow-mesh-2" />

      {/* Floating Modern Header */}
      <PublicHeader />

      {/* ─── Hero Section ────────────────────────────────────────────── */}
      <section className="ss-about-hero ss-reveal">
        <div className="ss-edu-container">
          <div className="ss-about-hero-tag">
            <Sparkles size={14} color="#4F46E5" />
            <span>About StudySync AI &bull; The Intelligent Academic Platform</span>
          </div>

          <h1 className="ss-about-hero-title">
            Engineering Autonomous Clarity for <br />
            <span className="ss-edu-highlight">Higher Education</span>
          </h1>

          <p className="ss-about-hero-subtitle">
            StudySync AI is the autonomous academic operating system designed for modern university students. By synthesizing sub-second vector search across raw course slides, deterministic page citations, and proactive background agents, we eliminate the stress and fragmentation of chaotic academic semesters.
          </p>

          <div className="ss-about-hero-pills">
            <div className="ss-about-hero-pill-item">
              <ShieldCheck size={16} color="#10B981" />
              <span>Zero-Knowledge RLS Privacy</span>
            </div>
            <div className="ss-about-hero-pill-item">
              <Layers size={16} color="#6366F1" />
              <span>Slide-Grounded Verified Citations</span>
            </div>
            <div className="ss-about-hero-pill-item">
              <Zap size={16} color="#0284C7" />
              <span>Sub-Second Vector Query Latency</span>
            </div>
            <div className="ss-about-hero-pill-item">
              <Bell size={16} color="#F59E0B" />
              <span>Proactive WhatsApp &amp; Email Alerts</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Story & Mission Split Section ───────────────────────────── */}
      <section className="ss-about-story-section">
        <div className="ss-edu-container">
          <div className="ss-about-story-grid">
            {/* Left Narrative Column */}
            <div className="ss-about-story-content ss-reveal">
              <span className="ss-about-story-tag">Our Foundational Mission</span>
              <h2 className="ss-about-story-heading">
                Resolving the Cognitive Overload of Modern University Life
              </h2>

              <p className="ss-about-paragraph">
                Every academic semester, higher education students confront an unsustainable cognitive load: multiple intensive subjects, dozens of sprawling slide decks per module, abrupt examination announcements buried inside disorganized group chats, and fragmented submission portals across incompatible platforms. The administrative overhead of manually tracking deadlines frequently eclipses the actual learning process.
              </p>

              <p className="ss-about-paragraph">
                Conventional productivity platforms require exhausting manual data entry and continuous maintenance to remain current. Simultaneously, generic generative AI tools operate without the contextual grounding of a professor's specific lecture curriculum - frequently synthesizing inaccurate terminology, non-standard derivations, and hallucinated concepts that directly penalize students on examinations and assessments.
              </p>

              <p className="ss-about-paragraph">
                StudySync AI was engineered to bridge this gap. By indexing raw lecture presentations, syllabi, and assignment briefs into an isolated, sub-second vector pipeline, our autonomous agent answers academic queries with verifiable slide and page citations - while background workers proactively dispatch deadline alerts directly to your preferred messaging channels before critical submission windows close.
              </p>

              <div className="ss-about-checklist">
                <div className="ss-about-check-item">
                  <CheckCircle2 size={18} className="ss-about-check-icon" />
                  <span>Sub-second vector indexing across heavy multi-page lecture decks.</span>
                </div>
                <div className="ss-about-check-item">
                  <CheckCircle2 size={18} className="ss-about-check-icon" />
                  <span>Deterministic slide citations that eliminate AI hallucinations entirely.</span>
                </div>
                <div className="ss-about-check-item">
                  <CheckCircle2 size={18} className="ss-about-check-icon" />
                  <span>Proactive omnichannel alerts dispatched automatically before deadline cut-offs.</span>
                </div>
                <div className="ss-about-check-item">
                  <CheckCircle2 size={18} className="ss-about-check-icon" />
                  <span>Client-side cryptographic AES-256-GCM protection for custom AI credentials.</span>
                </div>
              </div>
            </div>

            {/* Right Architectural Blueprint Card */}
            <div className="ss-about-story-visual ss-reveal ss-delay-1">
              <div className="ss-about-arch-card">
                <div className="ss-about-arch-header">
                  <div className="ss-about-arch-title">
                    <Award size={20} color="#4F46E5" />
                    <span>StudySync Engine Blueprint</span>
                  </div>
                  <span className="ss-about-arch-badge">v2.4 Stack</span>
                </div>

                <div className="ss-about-arch-pipeline">
                  {architectureSteps.map((step, idx) => (
                    <div key={step.title} className="ss-about-arch-step">
                      <div className="ss-about-arch-step-num">0{idx + 1}</div>
                      <div className="ss-about-arch-step-content">
                        <div className="ss-about-arch-step-title">{step.title}</div>
                        <p className="ss-about-arch-step-desc">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Core Architectural Pillars ──────────────────────────────── */}
      <section className="ss-about-pillars-section">
        <div className="ss-edu-container">
          <div className="ss-edu-section-header ss-reveal" style={{ textAlign: 'center' }}>
            <div className="ss-edu-section-tag">Core Architectural Pillars</div>
            <h2 className="ss-edu-section-title">Principles Anchored in Verifiable Truth and Privacy</h2>
            <p className="ss-edu-section-subtitle" style={{ maxWidth: '780px', margin: '0 auto', textAlign: 'center' }}>
              Every layer of StudySync AI is designed to guarantee academic rigor, user sovereignty, and verifiable factual correctness across every interaction.
            </p>
          </div>

          <div className="ss-about-pillars-grid">
            {corePillars.map((pillar, idx) => (
              <div
                key={pillar.title}
                className={`ss-about-pillar-card ss-reveal ss-delay-${(idx % 2) + 1}`}
              >
                <div className="ss-about-pillar-icon-box" style={{ background: pillar.bg }}>
                  {pillar.icon}
                </div>
                <h3 className="ss-about-pillar-title">{pillar.title}</h3>
                <p className="ss-about-pillar-desc">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── The Academic Manifesto ──────────────────────────────────── */}
      <section className="ss-about-manifesto-section">
        <div className="ss-edu-container">
          <div className="ss-edu-section-header ss-reveal" style={{ textAlign: 'center' }}>
            <div className="ss-edu-section-tag">The Academic Manifesto</div>
            <h2 className="ss-edu-section-title">Our Guiding Commitments to Higher Education</h2>
            <p className="ss-edu-section-subtitle" style={{ maxWidth: '780px', margin: '0 auto', textAlign: 'center' }}>
              A transparent framework defining how our engineering decisions respect students, educators, and the integrity of the academic process.
            </p>
          </div>

          <div className="ss-about-manifesto-grid">
            {manifestoPoints.map((point, idx) => (
              <div
                key={point.title}
                className={`ss-about-manifesto-col ss-reveal ss-delay-${idx + 1}`}
              >
                <div className="ss-about-manifesto-col-num">{point.num}</div>
                <h3 className="ss-about-manifesto-col-title">{point.title}</h3>
                <p className="ss-about-manifesto-col-text">{point.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Call to Action Banner ───────────────────────────────────── */}
      <section className="ss-edu-container ss-edu-cta-section ss-reveal">
        <div className="ss-edu-cta-card">
          <div style={{ position: 'relative', zIndex: 2, maxWidth: '680px', margin: '0 auto' }}>
            <h2 className="ss-edu-cta-title">
              Elevate Your Academic Performance Today
            </h2>
            <p className="ss-edu-cta-subtitle">
              Experience the advantage of an intelligent workspace engineered exclusively for university coursework, verifiable slide citations, and autonomous deadline management - at zero subscription cost.
            </p>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/register" className="ss-edu-cta-btn">
                <span>Create Free Student Account</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/features"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  padding: '14px 26px',
                  borderRadius: '9999px',
                  fontWeight: 600,
                  fontSize: '1rem',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease',
                }}
              >
                <BookOpen size={16} />
                <span>Explore Platform Capabilities</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <PublicFooter />
    </div>
  );
}
