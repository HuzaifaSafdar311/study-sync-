import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi, setAuthToken } from '../services/api';

interface VerifyOtpProps {
  onLogin?: (user: any) => void;
}

export default function VerifyOtp({ onLogin }: VerifyOtpProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const plan = searchParams.get('plan') || 'free';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [shake, setShake] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const maxAttempts = 5;

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 400);
  };

  const handleDigitChange = (index: number, value: string) => {
    const val = value.replace(/\D/g, '');
    if (!val) {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      return;
    }

    const digit = val.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    if (index < 5 && digit) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((d) => d.length === 1)) {
      submitOtp(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);

    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();

    if (pastedData.length === 6) {
      submitOtp(pastedData);
    }
  };

  const submitOtp = async (codeToSubmit?: string) => {
    const fullCode = codeToSubmit || otp.join('');
    if (fullCode.length !== 6) {
      toast.error('Please enter the full 6-digit verification code');
      triggerShake();
      return;
    }

    if (!email) {
      toast.error('Email address missing. Please register again.');
      navigate('/register');
      return;
    }

    setLoading(true);
    try {
      const { data } = await authApi.verifyOtp({
        email,
        otpCode: fullCode,
      });

      const token = data.data?.accessToken || data.data?.token;
      if (token) {
        setAuthToken(token);
      }

      if (onLogin && data.data?.user) {
        onLogin(data.data.user);
      }

      setIsSuccess(true);
      toast.success('Email verified successfully! Welcome to StudySync.');

      // Persist chosen plan for onboarding
      if (plan) {
        try {
          localStorage.setItem('studysync_selected_plan', plan);
        } catch {}
      }

      setTimeout(() => {
        navigate(`/onboarding?plan=${encodeURIComponent(plan)}`);
      }, 700);
    } catch (err: any) {
      triggerShake();
      setFailedAttempts((prev) => prev + 1);
      const msg = err.response?.data?.message || err.message || 'Verification failed. Please check your code.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    if (!email) {
      toast.error('Email address missing. Please register again.');
      return;
    }

    setResending(true);
    try {
      await authApi.resendOtp({ email });
      toast.success('New verification code sent to your email.');
      setCountdown(60);
      setFailedAttempts(0);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to resend code.';
      toast.error(msg);
    } finally {
      setResending(false);
    }
  };

  const formattedCountdown = `0:${countdown < 10 ? '0' : ''}${countdown}`;

  return (
    <div className="ss-auth-page">
      <div className="ss-glow-mesh-1" />

      <div className="ss-auth-wrapper">
        <div className={`ss-auth-card-wrap ${shake ? 'ss-shake' : ''}`}>
          {/* Header */}
          <div className="ss-auth-brand-header">
            <Link to="/" style={{ textDecoration: 'none', display: 'inline-block' }}>
              <img
                src="/studysync-logo-transparent.png"
                alt="StudySync AI"
                className="ss-auth-brand-logo-img"
              />
            </Link>
            <h1 className="ss-auth-card-title">Verify your Email</h1>
            <p className="ss-auth-card-subtitle">We sent a 6-digit verification code to</p>
            <div style={{
              fontFamily: 'monospace',
              fontWeight: 600,
              color: 'var(--primary)',
              marginTop: '4px',
              fontSize: '0.875rem',
              background: 'var(--primary-light)',
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              display: 'inline-block'
            }}>
              {email || 'your email'}
            </div>
          </div>

          {/* Card */}
          <div className="ss-auth-card">
            {isSuccess ? (
              <div className="ss-auth-success-box">
                <div className="ss-auth-success-icon">
                  <CheckCircle2 size={32} />
                </div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                  Email Verified!
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Launching your personalized academic onboarding...
                </p>
                <div style={{ marginTop: '16px' }}>
                  <Loader2 size={20} className="animate-spin" color="var(--primary)" />
                </div>
              </div>
            ) : (
              <>
                <div className="ss-otp-grid">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-digit-${idx}`}
                      ref={(el) => { inputRefs.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      aria-label={`Digit ${idx + 1} of 6-digit verification code`}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      onPaste={handlePaste}
                      disabled={loading}
                      className={`ss-otp-box ${failedAttempts > 0 && !digit ? 'ss-input-error' : ''}`}
                    />
                  ))}
                </div>

                {/* Remaining Attempts Warning */}
                {failedAttempts > 0 && failedAttempts < maxAttempts && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.75rem',
                    color: 'var(--priority-high)',
                    marginBottom: '14px',
                    justifyContent: 'center'
                  }}>
                    <AlertCircle size={13} />
                    <span>Incorrect code. {maxAttempts - failedAttempts} attempt{maxAttempts - failedAttempts !== 1 ? 's' : ''} remaining.</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => submitOtp()}
                  disabled={loading || otp.join('').length !== 6}
                  className="ss-auth-btn-submit"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm & Continue to Setup</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                {/* Countdown / Resend Cooldown UI */}
                <div style={{ textAlign: 'center', marginTop: '18px', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  {countdown > 0 ? (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-light)',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: 'var(--text-secondary)'
                    }}>
                      <Clock size={13} color="var(--text-muted)" />
                      <span>Resend code in <strong style={{ color: 'var(--text-primary)' }}>{formattedCountdown}</strong></span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resending}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--primary)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '0.8125rem'
                      }}
                    >
                      {resending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      <span>Resend Verification Code</span>
                    </button>
                  )}
                </div>

                <div style={{
                  marginTop: '16px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-light)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)'
                }}>
                  <ShieldCheck size={14} color="var(--priority-low)" style={{ flexShrink: 0 }} />
                  <span>Codes expire after 15 minutes for tenant security.</span>
                </div>

                <div className="ss-auth-footer-link">
                  <span>Entered the wrong email?</span>
                  <Link to="/register">Change email</Link>
                </div>
              </>
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.8125rem' }}>
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
