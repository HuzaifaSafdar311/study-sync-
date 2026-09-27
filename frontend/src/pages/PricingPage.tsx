import { useState, useEffect } from 'react';
import { useSEO } from '../hooks/useSEO';
import { Link } from 'react-router-dom';
import PublicHeader from '../components/PublicHeader';
import PublicFooter from '../components/PublicFooter';
import {
  Check,
  ArrowRight,
  Sparkles,
  HelpCircle,
  ShieldCheck,
  ChevronDown,
  Clock,
  Layers,
  Crown,
  MessageSquare,
} from 'lucide-react';
import { buildWhatsAppPurchaseUrl, buildWhatsAppExtraCourseUrl } from '../config/plans';
import { authApi } from '../services/api';

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: 'How does the 7-day Free Trial work?',
    a: 'The 7-day Free Trial gives you full access to StudySync AI without requiring a credit card. During your 7-day trial, you can add 1 active course, upload files up to 10MB, configure your own Gemini or Groq API key during onboarding, test limited WhatsApp alerts (up to 15/week), and receive automated daily email agendas.',
  },
  {
    q: 'What happens when my 7-day trial expires?',
    a: 'Once your 7-day trial ends, you can upgrade to StudySync Plus (up to 5 courses) or StudySync Pro (up to 10 courses) on either a monthly or discounted yearly plan. Your indexed course slides, schedules, and flashcards remain safely preserved in your private isolated tenant.',
  },
  {
    q: 'Do I connect my own API key in all plans (BYOK)?',
    a: 'Yes! In all plans (7-Day Free Trial, Plus, and Pro), you connect your own API keys (BYOK). This guarantees 100% data privacy, zero platform markups, and allows you to leverage free tiers from Google Gemini, Groq, or your own OpenAI/Claude accounts.',
  },
  {
    q: 'What is the difference between StudySync Plus and StudySync Pro?',
    a: 'StudySync Plus gives you up to 5 active courses, 50MB file uploads, and full WhatsApp/email notifications with your own Gemini/Groq/OpenAI API key. StudySync Pro expands your limit to 10 active courses, 150MB uploads, unlimited real-time WhatsApp voice note parsing, and multi-model BYOK switching (Gemini 1.5 Pro, GPT-4o, Claude) using your own API keys.',
  },
  {
    q: 'How does the 20% yearly discount work?',
    a: 'When you select Yearly Billing, you save 20% compared to paying monthly. StudySync Plus is just Rs. 800/month (Rs. 9,600 billed annually), and StudySync Pro is Rs. 1,600/month (Rs. 19,200 billed annually).',
  },
  {
    q: 'How does WhatsApp Baileys integration work?',
    a: 'Under Settings, simply scan the QR code with your WhatsApp camera just like WhatsApp Web. Once paired, StudySync AI delivers morning schedule briefings, assignment reminders, and exam countdowns directly to your phone in natural Roman Urdu or English.',
  },
];

export default function PricingPage() {
  useSEO({
    title: 'Student Pricing Plans — 7-Day Free Trial, Plus & Pro | StudySync AI',
    description:
      'Choose the right StudySync AI plan for your semester: 7-Day Free Trial (1 course, 10MB uploads, BYOK API), Plus (5 courses, full WhatsApp), and Pro (10 courses, unlimited AI). Save 20% with yearly billing.',
    canonical: 'https://studysync.ai/pricing',
  });

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');

  useEffect(() => {
    authApi
      .me()
      .then((res) => {
        if (res.data?.data?.user?.email) {
          setCurrentUserEmail(res.data.data.user.email);
        }
      })
      .catch(() => {});
  }, []);

  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  return (
    <div className="ss-landing-page">
      <PublicHeader />

      {/* Hero Section */}
      <section className="ss-page-hero">
        <div className="ss-edu-container" style={{ textAlign: 'center' }}>
          <div className="ss-edu-hero-tag">
            <Sparkles size={14} color="#4F46E5" />
            <span>Transparent Student Pricing</span>
          </div>

          <h1 className="ss-page-hero-title">
            Invest in Your Grades, <br />
            <span className="ss-edu-highlight">Not Expensive Subscriptions</span>
          </h1>

          <p className="ss-page-hero-subtitle">
            Start with our risk-free 7-day trial. Upgrade to Plus (5 courses) or Pro (10 courses) whenever you need more capacity.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="ss-pricing-toggle-wrap" style={{ marginTop: '28px' }}>
            <div className="ss-pricing-toggle">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`ss-pricing-toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`ss-pricing-toggle-btn ${billingCycle === 'yearly' ? 'active' : ''}`}
              >
                <span>Yearly Billing</span>
                <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '9999px', background: '#DCFCE7', color: '#166534', fontWeight: 700 }}>
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards Grid */}
      <section className="ss-pricing-cards-section">
        <div className="ss-edu-container">
          <div className="ss-pricing-grid">
            
            {/* 1. Free Trial Tier */}
            <div className="ss-pricing-card">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div className="ss-pricing-plan-name">Free Trial</div>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: '#FEF3C7',
                    color: '#92400E',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <Clock size={11} /> 7 Days Access
                  </span>
                </div>

                <h3 className="ss-pricing-plan-headline">7-Day Test Drive</h3>
                <p className="ss-pricing-plan-desc">
                  Experience autonomous student scheduling and slide indexing with zero commitment.
                </p>

                <div className="ss-pricing-price-wrap">
                  <span className="ss-pricing-price">Rs. 0</span>
                  <span className="ss-pricing-period">/ 7 days trial</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: '-20px', marginBottom: '24px' }}>
                  No credit card required
                </div>

                <ul className="ss-pricing-features-list">
                  <li className="ss-pricing-feature-item">
                    <Check size={16} color="#10B981" />
                    <span><strong>1 Active Course</strong> included</span>
                  </li>
                  <li className="ss-pricing-feature-item">
                    <Check size={16} color="#10B981" />
                    <span><strong>7-Day Full Trial</strong> duration</span>
                  </li>
                  <li className="ss-pricing-feature-item">
                    <Check size={16} color="#10B981" />
                    <span><strong>10MB File Upload Limit</strong> per document</span>
                  </li>
                  <li className="ss-pricing-feature-item">
                    <Check size={16} color="#10B981" />
                    <span><strong>WhatsApp Integration</strong> (Limited to 15 alerts/wk)</span>
                  </li>
                  <li className="ss-pricing-feature-item">
                    <Check size={16} color="#10B981" />
                    <span><strong>Connect Your Own API Key</strong> on onboarding</span>
                  </li>
                  <li className="ss-pricing-feature-item">
                    <Check size={16} color="#10B981" />
                    <span><strong>Full Email Integration</strong> (Daily agenda & summaries)</span>
                  </li>
                  <li className="ss-pricing-feature-item">
                    <Check size={16} color="#10B981" />
                    <span>Natural Roman Urdu & English Task Scheduling</span>
                  </li>
                  <li className="ss-pricing-feature-item">
                    <Check size={16} color="#10B981" />
                    <span>Isolated Supabase Tenant Database</span>
                  </li>
                </ul>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Link to="/register?plan=trial" className="ss-pricing-btn ss-pricing-btn-outline">
                  <span>Start 7-Day Free Trial</span>
                  <ArrowRight size={14} />
                </Link>
                <a
                  href={buildWhatsAppPurchaseUrl('trial', 'monthly', currentUserEmail)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '0.75rem',
                    color: '#059669',
                    textAlign: 'center',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    textDecoration: 'none',
                    fontWeight: 600,
                    padding: '4px',
                  }}
                >
                  <MessageSquare size={13} />
                  <span>Or Activate Trial on WhatsApp</span>
                </a>
              </div>
            </div>

            {/* 2. Plus Tier */}
            <div className="ss-pricing-card">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div className="ss-pricing-plan-name">StudySync Plus</div>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: '#EEF2FF',
                    color: '#4338CA',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <Layers size={11} /> 5 Courses
                  </span>
                </div>

                <h3 className="ss-pricing-plan-headline">Dedicated Semester</h3>
                <p className="ss-pricing-plan-desc">
                  Ideal for students managing a full active semester syllabus and exam schedule.
                </p>

                <div className="ss-pricing-price-wrap">
                  <span className="ss-pricing-price">
                    {billingCycle === 'monthly' ? 'Rs. 1,000' : 'Rs. 800'}
                  </span>
                  <span className="ss-pricing-period">/ month</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: billingCycle === 'yearly' ? '#166534' : '#64748B', marginTop: '-20px', marginBottom: '24px', fontWeight: billingCycle === 'yearly' ? 600 : 400 }}>
                  {billingCycle === 'yearly' ? 'Rs. 9,600 billed annually (Save 20%)' : 'Billed monthly, cancel anytime'}
                </div>

                <ul className="ss-pricing-features-list">
                  <li className="ss-pricing-feature-item">
                    <Check size={16} color="#10B981" />
                    <span style={{ fontWeight: 600, color: '#0F172A' }}>Up to 5 Active Courses</span>
                  </li>
                  <li className="ss-pricing-feature-item">
                    <Check size={16} color="#10B981" />
                    <span><strong>50MB File Upload Limit</strong> per document</span>
                  </li>
                  <li className="ss-pricing-feature-item">
                    <Check size={16} color="#10B981" />
                    <span><strong>Full WhatsApp Integration</strong> (Daily alerts & quiz warnings)</span>
                  </li>
                  <li className="ss-pricing-feature-item">
                    <Check size={16} color="#10B981" />
                    <span><strong>Full Email Integration</strong> (Instant alerts & digests)</span>
                  </li>
                  <li className="ss-pricing-feature-item">
                    <Check size={16} color="#10B981" />
                    <span><strong>Connect Your Own API Key (BYOK)</strong> (Gemini, Groq, OpenAI)</span>
                  </li>
                  <li className="ss-pricing-feature-item">
                    <Check size={16} color="#10B981" />
                    <span>Multi-Slide Vector RAG with Page Citations</span>
                  </li>
                  <li className="ss-pricing-feature-item">
                    <Check size={16} color="#10B981" />
                    <span>Automated Quiz & Flashcard Extraction</span>
                  </li>
                  <li className="ss-pricing-feature-item">
                    <Check size={16} color="#10B981" />
                    <span>Standard Email & Discord Community Support</span>
                  </li>
                </ul>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <a
                  href={buildWhatsAppPurchaseUrl('plus', billingCycle, currentUserEmail)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ss-pricing-btn ss-pricing-btn-outline"
                  style={{
                    borderColor: '#25D366',
                    color: '#075E54',
                    background: '#F0FDF4',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    textDecoration: 'none',
                  }}
                >
                  <MessageSquare size={16} color="#16A34A" />
                  <span>Buy Plus via WhatsApp</span>
                  <ArrowRight size={14} />
                </a>
                <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#166534', fontWeight: 600 }}>
                  ⚡ Instant WhatsApp Activation via Muhammad Arham
                </div>
              </div>
            </div>

            {/* 3. Pro Tier (Featured / Popular) */}
            <div className="ss-pricing-card featured">
              <div className="ss-pricing-badge-popular">Most Popular for University</div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div className="ss-pricing-plan-name" style={{ color: '#6366F1' }}>StudySync Pro</div>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: '#DCFCE7',
                    color: '#166534',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <Crown size={11} /> 10 Courses
                  </span>
                </div>

                <h3 className="ss-pricing-plan-headline">Power Scholar & FYP</h3>
                <p className="ss-pricing-plan-desc">
                  Designed for heavy CS, engineering, and medical programs requiring high-volume research.
                </p>

                <div className="ss-pricing-price-wrap">
                  <span className="ss-pricing-price">
                    {billingCycle === 'monthly' ? 'Rs. 2,000' : 'Rs. 1,600'}
                  </span>
                  <span className="ss-pricing-period">/ month</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: billingCycle === 'yearly' ? '#166534' : '#64748B', marginTop: '-20px', marginBottom: '24px', fontWeight: billingCycle === 'yearly' ? 600 : 400 }}>
                  {billingCycle === 'yearly' ? 'Rs. 19,200 billed annually (Save 20%)' : 'Billed monthly, cancel anytime'}
                </div>

                <ul className="ss-pricing-features-list">
                  <li className="ss-pricing-feature-item">
                    <Check size={16} color="#10B981" />
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>Up to 10 Active Courses</span>
                  </li>
                  <li className="ss-pricing-feature-item">
                    <Check size={16} color="#10B981" />
                    <span><strong>150MB File Upload Limit</strong> (Complete book packs & decks)</span>
                  </li>
                  <li className="ss-pricing-feature-item">
                    <Check size={16} color="#10B981" />
                    <span><strong>Unlimited WhatsApp Baileys</strong> (Voice notes & instant alerts)</span>
                  </li>
                  <li className="ss-pricing-feature-item">
                    <Check size={16} color="#10B981" />
                    <span><strong>Full Email Integration</strong> (Priority agenda digests & group sync)</span>
                  </li>
                  <li className="ss-pricing-feature-item">
                    <Check size={16} color="#10B981" />
                    <span><strong>Multi-Model BYOK Switcher</strong> (Connect your own Gemini, GPT-4o, or Claude keys)</span>
                  </li>
                  <li className="ss-pricing-feature-item">
                    <Check size={16} color="#10B981" />
                    <span>Autonomous ReAct Agent & Deep Reasoning Loop</span>
                  </li>
                  <li className="ss-pricing-feature-item">
                    <Check size={16} color="#10B981" />
                    <span>Priority GPU Inference Queues (Zero latency)</span>
                  </li>
                  <li className="ss-pricing-feature-item">
                    <Check size={16} color="#10B981" />
                    <span>24/7 Priority Academic Support Desk</span>
                  </li>
                </ul>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <a
                  href={buildWhatsAppPurchaseUrl('pro', billingCycle, currentUserEmail)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ss-pricing-btn ss-pricing-btn-primary"
                  style={{
                    background: 'linear-gradient(135deg, #25D366 0%, #059669 100%)',
                    borderColor: '#059669',
                    boxShadow: '0 4px 14px rgba(37, 211, 102, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    textDecoration: 'none',
                  }}
                >
                  <MessageSquare size={16} color="#FFFFFF" />
                  <span>Buy Pro via WhatsApp</span>
                  <ArrowRight size={14} />
                </a>
                <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#166534', fontWeight: 600 }}>
                  ⚡ Instant WhatsApp Activation via Muhammad Arham
                </div>
              </div>
            </div>

          </div>

          {/* Special Top-Tier Extra Course Expansion Banner */}
          <div style={{ marginTop: '36px' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, #F0FDF4 0%, #EEF2FF 100%)',
                border: '1.5px solid #86EFAC',
                borderRadius: '20px',
                padding: '28px 36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '20px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div style={{ maxWidth: '620px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#DCFCE7', color: '#166534', padding: '3px 10px', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 800, marginBottom: '10px' }}>
                  <Sparkles size={13} />
                  <span>Heavy Plan Special Expansion Add-On</span>
                </div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
                  StudySync Pro par 10 se zyada courses chahiye?
                </h3>
                <p style={{ margin: 0, fontSize: '0.925rem', color: '#475569', lineHeight: 1.5 }}>
                  Agar aap StudySync ke sab se heavy plan (Pro) par hain aur aapki limit hit ho gayi hai, to koi expensive enterprise plan lene ki zaroorat nahi — <strong>har extra course sirf Rs. 100 (100 PKR) me milega!</strong>
                </p>
              </div>

              <a
                href={buildWhatsAppExtraCourseUrl(currentUserEmail)}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 24px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                  color: '#FFF',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                  boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
                  whiteSpace: 'nowrap',
                }}
              >
                <MessageSquare size={18} />
                <span>Rs. 100 / Course Add Karein (WhatsApp)</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Comparison Matrix Table */}
      <section style={{ padding: '64px 24px', background: '#F8FAFC', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
        <div className="ss-edu-container" style={{ maxWidth: '1000px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div className="ss-edu-section-tag">Side-by-Side Comparison</div>
            <h2 className="ss-edu-section-title" style={{ fontSize: '1.9rem', margin: '8px 0' }}>
              Compare All Plan Features
            </h2>
            <p className="ss-edu-section-subtitle" style={{ margin: 0 }}>
              Transparent breakdown of limits, integrations, and autonomous study tools.
            </p>
          </div>

          <div style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '640px' }}>
                <thead>
                  <tr style={{ background: '#F1F5F9', borderBottom: '1px solid #CBD5E1' }}>
                    <th style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>Feature</th>
                    <th style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 700, color: '#0F172A', textAlign: 'center' }}>Free Trial</th>
                    <th style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 700, color: '#4F46E5', textAlign: 'center' }}>StudySync Plus</th>
                    <th style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 700, color: '#4338CA', textAlign: 'center', background: '#EEF2FF' }}>StudySync Pro</th>
                  </tr>
                </thead>
                <tbody style={{ fontSize: '0.875rem', color: '#475569' }}>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0F172A' }}>Active Course Limit</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 600, color: '#0F172A' }}>1 Course</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 700, color: '#4F46E5' }}>5 Courses</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 800, color: '#4338CA', background: '#F8FAFF' }}>10 Courses</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0F172A' }}>Duration / Renewal</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>7 Days</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>Monthly / Annual</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', background: '#F8FAFF' }}>Monthly / Annual</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0F172A' }}>Max File Upload Size</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>10 MB</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 600 }}>50 MB</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 700, color: '#4338CA', background: '#F8FAFF' }}>150 MB</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0F172A' }}>WhatsApp Integration</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>Limited (15 alerts/wk)</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', color: '#166534', fontWeight: 600 }}>Full Baileys Alerts</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', color: '#166534', fontWeight: 700, background: '#F8FAFF' }}>Unlimited + Voice Notes</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0F172A' }}>Bring Your Own API Key (BYOK)</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', color: '#166534' }}>✓ Own Key (Gemini/Groq)</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', color: '#166534' }}>✓ Own Key (Gemini/Groq/OpenAI)</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', color: '#166534', fontWeight: 700, background: '#F8FAFF' }}>✓ Own Keys (Multi-Model Switcher)</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0F172A' }}>Email Integration</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', color: '#166534' }}>✓ Full Integration</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', color: '#166534' }}>✓ Full Integration</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', color: '#166534', fontWeight: 700, background: '#F8FAFF' }}>✓ Full Priority Integration</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0F172A' }}>Roman Urdu & English Scheduler</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', color: '#166534' }}>✓ Yes</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', color: '#166534' }}>✓ Yes</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', color: '#166534', fontWeight: 700, background: '#F8FAFF' }}>✓ Yes</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0F172A' }}>ReAct Agent Reasoning Loop</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', color: '#94A3B8' }}>—</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', color: '#166534' }}>✓ Standard</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', color: '#166534', fontWeight: 700, background: '#F8FAFF' }}>✓ Deep Thinking Loop</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: '#0F172A' }}>Support Level</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>Community Discord</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>Email Support</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center', fontWeight: 700, color: '#4338CA', background: '#F8FAFF' }}>24/7 Priority Desk</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Guarantee Banner */}
      <section className="ss-pricing-guarantee-section">
        <div className="ss-edu-container">
          <div className="ss-guarantee-card">
            <ShieldCheck size={36} color="#10B981" />
            <div>
              <h3 style={{ margin: '0 0 6px', fontSize: '1.2rem', color: '#0F172A' }}>
                100% Student Satisfaction Guarantee
              </h3>
              <p style={{ margin: 0, color: '#64748B', fontSize: '0.925rem', lineHeight: 1.5 }}>
                Start with our 7-day free trial risk-free. No credit card required to begin. If you upgrade to Plus or Pro and ever feel it hasn't boosted your academic performance, reach out within 14 days for a full refund.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="ss-faq-section">
        <div className="ss-edu-container" style={{ maxWidth: '840px' }}>
          <div className="ss-edu-section-header">
            <div className="ss-edu-section-tag">Got Questions?</div>
            <h2 className="ss-edu-section-title">Frequently Asked Questions</h2>
            <p className="ss-edu-section-subtitle">
              Everything you need to know about StudySync AI subscriptions, trial limits, and integrations.
            </p>
          </div>

          <div className="ss-faq-list">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={faq.q} className={`ss-faq-item ${isOpen ? 'open' : ''}`}>
                  <button
                    type="button"
                    onClick={() => toggleFaq(index)}
                    className="ss-faq-question-btn"
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <HelpCircle size={18} color="#4F46E5" />
                      <strong>{faq.q}</strong>
                    </span>
                    <ChevronDown
                      size={18}
                      className={`ss-faq-chevron ${isOpen ? 'rotated' : ''}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="ss-faq-answer">
                      <p style={{ margin: 0, color: '#475569', lineHeight: 1.6, fontSize: '0.925rem' }}>
                        {faq.a}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="ss-edu-container ss-edu-cta-section">
        <div className="ss-edu-cta-card">
          <div style={{ position: 'relative', zIndex: 2, maxWidth: '640px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '2.4rem', fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
              Start Your 7-Day Free Trial Today
            </h2>
            <p style={{ fontSize: '1.1rem', opacity: 0.9, lineHeight: 1.6, margin: '0 0 32px' }}>
              No credit card required. Experience 1 active course, 10MB slide uploads, BYOK API integration, and full email reminders instantly.
            </p>
            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                to="/register?plan=trial"
                style={{
                  background: '#FFFFFF',
                  color: '#4F46E5',
                  padding: '14px 28px',
                  borderRadius: '9999px',
                  fontWeight: 700,
                  fontSize: '1rem',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                }}
              >
                <span>Claim Free 7-Day Trial</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
