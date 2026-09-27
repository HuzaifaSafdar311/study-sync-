import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Cpu,
  KeyRound,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  BookOpen,
  Lock,
  Loader2,
  Check,
  Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi, apiKeyApi, coursesApi } from '../services/api';

interface OnboardingProps {
  onComplete: (user: any) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Academic Identity
  const [university, setUniversity] = useState('');
  const [major, setMajor] = useState('');
  const [semester, setSemester] = useState('');

  // Step 2: AI Engine & BYOK
  const [aiEngine, setAiEngine] = useState<'system' | 'byok'>('system');
  const [byokProvider, setByokProvider] = useState<'gemini' | 'groq' | 'openai'>('groq');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyVerified, setKeyVerified] = useState(false);
  const [maskedKey, setMaskedKey] = useState('');

  // Plan: Automatically activate 7-day Free Trial for all new registering students
  const selectedPlan: 'trial' = 'trial';

  // Step 3: First Course
  const [courseName, setCourseName] = useState('');
  const [courseColor, setCourseColor] = useState('#6366F1');

  // Live test key
  const handleTestKey = async () => {
    if (!apiKeyInput.trim()) {
      toast.error('Please paste your API key first.');
      return;
    }

    setIsTestingKey(true);
    setKeyVerified(false);
    try {
      const res = await apiKeyApi.testKey(byokProvider, apiKeyInput.trim());
      if (res.data?.success) {
        setKeyVerified(true);
        setMaskedKey(res.data.maskedKey || '••••••••');
        toast.success(`${byokProvider.toUpperCase()} key verified successfully!`);
      }
    } catch (err: any) {
      setKeyVerified(false);
      const msg = err.response?.data?.message || 'Verification failed. Please check key validity.';
      toast.error(msg);
    } finally {
      setIsTestingKey(false);
    }
  };

  // Final submission
  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      // 1. If BYOK selected and key entered, save key (encrypted)
      if (aiEngine === 'byok' && apiKeyInput.trim() && keyVerified) {
        await apiKeyApi.saveKey(byokProvider, apiKeyInput.trim(), true);
      }

      // 2. Complete onboarding profile
      const res = await authApi.completeOnboarding({
        university,
        major,
        semester,
        plan: selectedPlan,
        aiProviderPreference: aiEngine,
        activeByokProvider: aiEngine === 'byok' ? byokProvider : undefined,
      });

      // 3. Create initial course if named
      if (courseName.trim()) {
        try {
          await coursesApi.create({
            name: courseName.trim(),
            colorTag: courseColor,
          });
        } catch {
          // Non-blocking
        }
      }

      const updatedUser = res.data?.data?.user;
      toast.success('Workspace configured successfully! Welcome aboard.');
      if (onComplete) {
        onComplete(updatedUser);
      }
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error setting up workspace. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#FAFAF9',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Top Header & Minimalist Logo */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <img
          src="/studysync-logo-transparent.png"
          alt="StudySync AI"
          style={{ height: '72px', width: 'auto', objectFit: 'contain', margin: '0 auto 14px', display: 'block' }}
        />
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          borderRadius: '9999px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E7E5E4',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          marginBottom: '16px',
        }}>
          <Sparkles size={16} color="#6366F1" />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1C1917' }}>StudySync AI Workspace Setup</span>
        </div>
        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: 700,
          color: '#1C1917',
          margin: 0,
          letterSpacing: '-0.02em',
        }}>
          {step === 1 && 'Academic Profile'}
          {step === 2 && 'AI Engine Configuration'}
          {step === 3 && 'Launch Your First Course'}
        </h1>
        <p style={{
          fontSize: '0.875rem',
          color: '#78716C',
          marginTop: '6px',
          marginBottom: 0,
        }}>
          {step === 1 && 'Tailor intelligent deadline detection to your syllabus and term.'}
          {step === 2 && 'Choose whether you want to proceed without an API key (System AI) or connect your own API key.'}
          {step === 3 && 'Setup your active course to start synthesizing notes and scheduling (7-Day Trial Active).'}
        </p>
      </div>

      {/* Wizard Card */}
      <div style={{
        width: '100%',
        maxWidth: '560px',
        backgroundColor: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E7E5E4',
        boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
        padding: '32px',
        position: 'relative',
      }}>
        {/* Step Progress Bar (3 Steps: Profile -> AI Engine -> First Course) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '28px',
          position: 'relative',
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '12px',
            right: '12px',
            height: '2px',
            backgroundColor: '#E7E5E4',
            transform: 'translateY(-50%)',
            zIndex: 1,
          }} />
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '12px',
            width: `${((step - 1) / 2) * 100}%`,
            height: '2px',
            backgroundColor: '#6366F1',
            transform: 'translateY(-50%)',
            transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            zIndex: 2,
          }} />

          {[1, 2, 3].map((s) => (
            <div
              key={s}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '9999px',
                backgroundColor: s < step ? '#6366F1' : s === step ? '#FFFFFF' : '#F5F5F4',
                border: s === step ? '2px solid #6366F1' : s < step ? 'none' : '1px solid #D6D3D1',
                color: s < step ? '#FFFFFF' : s === step ? '#6366F1' : '#A8A29E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8125rem',
                fontWeight: 700,
                zIndex: 3,
                transition: 'all 0.3s ease',
              }}
            >
              {s < step ? <Check size={14} strokeWidth={3} /> : s}
            </div>
          ))}
        </div>

        {/* ─── STEP 1: Academic Identity ────────────────────────────────── */}
        {step === 1 && (
          <div className="ob-step-container">
            <div style={{ marginBottom: '18px' }}>
              <label htmlFor="obUniversity" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#44403C', marginBottom: '6px', cursor: 'pointer' }}>
                University / Institution
              </label>
              <div style={{ position: 'relative' }}>
                <GraduationCap size={16} color="#78716C" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  id="obUniversity"
                  type="text"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  placeholder="e.g. FAST NUCES, NUST, UMT, Stanford"
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: '8px',
                    border: '1px solid #D6D3D1',
                    fontSize: '0.875rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label htmlFor="obMajor" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#44403C', marginBottom: '6px', cursor: 'pointer' }}>
                Field of Study / Major
              </label>
              <div style={{ position: 'relative' }}>
                <BookOpen size={16} color="#78716C" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  id="obMajor"
                  type="text"
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  placeholder="e.g. Computer Science, Artificial Intelligence, Medicine"
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: '8px',
                    border: '1px solid #D6D3D1',
                    fontSize: '0.875rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label htmlFor="obSemester" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#44403C', marginBottom: '6px', cursor: 'pointer' }}>
                Current Semester / Level
              </label>
              <div style={{ position: 'relative' }}>
                <Layers size={16} color="#78716C" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                <input
                  id="obSemester"
                  type="text"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  placeholder="e.g. 5th Semester, Senior Year"
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 38px',
                    borderRadius: '8px',
                    border: '1px solid #D6D3D1',
                    fontSize: '0.875rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── STEP 2: AI Engine & BYOK ─────────────────────────────────── */}
        {step === 2 && (
          <div className="ob-step-container">
            {/* Encryption Pill */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '18px' }}>
              <div className="ob-enc-badge">
                <ShieldCheck size={14} color="#059669" />
                <span>AES-256-GCM Military Encryption at Rest</span>
              </div>
            </div>

            {/* Selection Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              {/* Option A: Managed System */}
              <div
                onClick={() => setAiEngine('system')}
                className={`ob-card-selectable ${aiEngine === 'system' ? 'active' : ''}`}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#EEF2FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <Cpu size={18} color="#6366F1" />
                  </div>
                  {aiEngine === 'system' && (
                    <div className="ob-check-bloom">
                      <CheckCircle2 size={18} color="#6366F1" />
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1C1917' }}>Without API Key (System AI)</div>
                <div style={{ fontSize: '0.75rem', color: '#78716C', marginTop: '3px', lineHeight: 1.4 }}>
                  Operate seamlessly with StudySync System AI. No external API key required.
                </div>
              </div>

              {/* Option B: BYOK */}
              <div
                onClick={() => setAiEngine('byok')}
                className={`ob-card-selectable ${aiEngine === 'byok' ? 'active' : ''}`}
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#ECFDF5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <KeyRound size={18} color="#059669" />
                  </div>
                  {aiEngine === 'byok' && (
                    <div className="ob-check-bloom">
                       <CheckCircle2 size={18} color="#059669" />
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1C1917' }}>With API Key (Bring Your Own Key)</div>
                <div style={{ fontSize: '0.75rem', color: '#78716C', marginTop: '3px', lineHeight: 1.4 }}>
                  Connect your personal Gemini, Groq, or OpenAI API key with private rate limits.
                </div>
              </div>
            </div>

            {/* BYOK Input Form */}
            {aiEngine === 'byok' && (
              <div style={{
                padding: '16px',
                backgroundColor: '#F5F5F4',
                borderRadius: '12px',
                border: '1px solid #E7E5E4',
                marginBottom: '16px',
              }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#44403C', marginBottom: '6px' }}>
                  Select AI Provider
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  {(['groq', 'gemini', 'openai'] as const).map((prov) => (
                    <button
                      key={prov}
                      type="button"
                      onClick={() => {
                        setByokProvider(prov);
                        setKeyVerified(false);
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: byokProvider === prov ? '1.5px solid #6366F1' : '1px solid #D6D3D1',
                        backgroundColor: byokProvider === prov ? '#EEF2FF' : '#FFFFFF',
                        color: byokProvider === prov ? '#4338CA' : '#57534E',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {prov}
                    </button>
                  ))}
                </div>

                <label htmlFor="obApiKey" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#44403C', marginBottom: '6px', cursor: 'pointer' }}>
                  {byokProvider.toUpperCase()} API Key
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Lock size={14} color="#A8A29E" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                    <input
                      id="obApiKey"
                      aria-label={`${byokProvider.toUpperCase()} API Key`}
                      type="password"
                      value={apiKeyInput}
                      onChange={(e) => {
                        setApiKeyInput(e.target.value);
                        setKeyVerified(false);
                      }}
                      placeholder={`Enter ${byokProvider} key (e.g. ${byokProvider === 'groq' ? 'gsk_...' : byokProvider === 'openai' ? 'sk-...' : 'AIzaSy...'})`}
                      style={{
                        width: '100%',
                        padding: '8px 10px 8px 30px',
                        borderRadius: '6px',
                        border: '1px solid #D6D3D1',
                        fontSize: '0.8125rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleTestKey}
                    disabled={isTestingKey || !apiKeyInput.trim()}
                    className={`ob-btn-ripple ${isTestingKey ? 'ob-btn-testing' : ''}`}
                    style={{
                      padding: '8px 14px',
                      backgroundColor: keyVerified ? '#10B981' : '#6366F1',
                      color: '#FFFFFF',
                      borderRadius: '6px',
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: isTestingKey || !apiKeyInput.trim() ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isTestingKey ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : keyVerified ? (
                      <>
                        <Check size={13} strokeWidth={3} />
                        <span>Verified!</span>
                      </>
                    ) : (
                      <span>Test & Connect</span>
                    )}
                  </button>
                </div>

                {keyVerified && (
                  <div style={{
                    marginTop: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.725rem',
                    color: '#065F46',
                  }}>
                    <CheckCircle2 size={13} color="#10B981" />
                    <span>Key verified: <strong>{maskedKey}</strong> (Will be encrypted with AES-256-GCM)</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 3: First Course ─────────────────────────────────────── */}
        {step === 3 && (
          <div className="ob-step-container">
            <div style={{ marginBottom: '18px' }}>
              <label htmlFor="obCourseName" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#44403C', marginBottom: '6px', cursor: 'pointer' }}>
                Course / Subject Title
              </label>
              <input
                id="obCourseName"
                type="text"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="e.g. Machine Learning, Computer Networks"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #D6D3D1',
                  fontSize: '0.875rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#44403C', marginBottom: '8px' }}>
                Course Color Accent
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {['#6366F1', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map((c) => (
                  <div
                    key={c}
                    onClick={() => setCourseColor(c)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '9999px',
                      backgroundColor: c,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: courseColor === c ? '2px solid #FFFFFF' : 'none',
                      boxShadow: courseColor === c ? `0 0 0 2px ${c}` : 'none',
                      transition: 'transform 0.15s ease',
                      transform: courseColor === c ? 'scale(1.15)' : 'scale(1)',
                    }}
                  >
                    {courseColor === c && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: '1px solid #F5F5F4',
        }}>
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #D6D3D1',
                backgroundColor: '#FFFFFF',
                color: '#57534E',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={14} /> Back
            </button>
          ) : <div />}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="ob-btn-ripple"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 18px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#6366F1',
                color: '#FFFFFF',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Next Step <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="ob-btn-ripple"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#10B981',
                color: '#FFFFFF',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Launching Workspace...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Launch StudySync AI</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
