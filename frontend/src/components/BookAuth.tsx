import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Check,
  BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi, setAuthToken } from '../services/api';

interface BookAuthProps {
  initialMode: 'login' | 'register';
  onLogin?: (user: any) => void;
}

function getPasswordStrength(pwd: string): { score: number; label: string; colorClass: 'weak' | 'medium' | 'strong' } {
  if (!pwd) return { score: 0, label: '', colorClass: 'weak' };

  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 1) {
    return { score: 1, label: 'Weak password (8+ chars & numbers)', colorClass: 'weak' };
  } else if (score <= 3) {
    return { score: 2, label: 'Medium strength (add symbols for strong)', colorClass: 'medium' };
  } else {
    return { score: 3, label: 'Strong academic password', colorClass: 'strong' };
  }
}

export default function BookAuth({ initialMode, onLogin }: BookAuthProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Book cover open state: start closed with signature tap-to-open interaction, or auto-open
  const [isOpen, setIsOpen] = useState(false);
  const [folding, setFolding] = useState(initialMode === 'register');

  // Plan persistence
  const initialPlan = searchParams.get('plan') || 'free';
  useEffect(() => {
    if (initialPlan) {
      try {
        localStorage.setItem('studysync_selected_plan', initialPlan);
      } catch {}
    }
  }, [initialPlan]);

  // Keep folding in sync if prop changes
  useEffect(() => {
    setFolding(initialMode === 'register');
  }, [initialMode]);

  // Auto-open book after slight delay on first load for smooth experience
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 450);
    return () => clearTimeout(timer);
  }, []);

  const openBook = () => {
    if (!isOpen) setIsOpen(true);
  };

  const togglePage = (target: 'login' | 'register') => {
    const shouldFold = target === 'register';
    setFolding(shouldFold);
    navigate(shouldFold ? `/register${initialPlan !== 'free' ? `?plan=${initialPlan}` : ''}` : '/login', { replace: true });
  };

  /* ──────────────────────────────────────────────────────────────────────────
     LOGIN STATE & LOGIC
     ────────────────────────────────────────────────────────────────────────── */
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginTouched, setLoginTouched] = useState({ email: false, password: false });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [loginShake, setLoginShake] = useState(false);

  // Check for Google OAuth callback parameters on page load
  useEffect(() => {
    const googleAuth = searchParams.get('google_auth');
    const token = searchParams.get('token');
    const userParam = searchParams.get('user');
    const googleError = searchParams.get('google_error');

    if (googleError) {
      toast.error(decodeURIComponent(googleError));
      return;
    }

    if (googleAuth === 'success' && token) {
      setAuthToken(token);
      let parsedUser: any = null;
      if (userParam) {
        try {
          parsedUser = JSON.parse(decodeURIComponent(userParam));
          if (onLogin) onLogin(parsedUser);
        } catch {}
      }
      setLoginSuccess(true);
      toast.success('Successfully signed in with Google!');
      setTimeout(() => {
        navigate(parsedUser?.isOnboarded === false ? '/onboarding' : '/dashboard', { replace: true });
      }, 700);
    }
  }, [searchParams]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isLoginEmailValid = loginEmail.trim().length > 0 && emailRegex.test(loginEmail.trim());
  const isLoginFormValid = isLoginEmailValid && loginPassword.length > 0;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginTouched({ email: true, password: true });

    if (!isLoginFormValid) {
      setLoginShake(true);
      setTimeout(() => setLoginShake(false), 400);
      return;
    }

    setLoginLoading(true);
    try {
      const { data } = await authApi.login({
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword,
      });

      if (data.requiresVerification || data.data?.requiresVerification) {
        const targetEmail = data.email || data.data?.email || loginEmail.trim();
        toast('Please verify your email. A fresh verification code was sent!', { icon: '✉️' });
        navigate(`/verify-otp?email=${encodeURIComponent(targetEmail)}`);
        return;
      }

      const token = data.data?.accessToken || data.data?.token;
      if (token) setAuthToken(token);

      const loggedUser = data.data?.user;
      if (onLogin && loggedUser) onLogin(loggedUser);

      setLoginSuccess(true);
      toast.success(`Welcome back, ${loggedUser?.fullName || 'Scholar'}!`);

      setTimeout(() => {
        if (loggedUser && loggedUser.isOnboarded === false) {
          navigate('/onboarding');
        } else {
          navigate('/dashboard');
        }
      }, 700);
    } catch (err: any) {
      setLoginShake(true);
      setTimeout(() => setLoginShake(false), 400);

      if (err.response?.data?.requiresVerification) {
        const targetEmail = err.response?.data?.email || loginEmail.trim();
        toast('Account unverified. A verification OTP was sent to your email.', { icon: '✉️' });
        navigate(`/verify-otp?email=${encodeURIComponent(targetEmail)}`);
        return;
      }

      const status = err.response?.status;
      if (status === 401 || status === 400) {
        toast.error('Invalid email or password. Please verify your credentials.');
      } else {
        toast.error(err.response?.data?.message || 'Unable to sign in. Please try again.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoginEmail('devnexes.support@gmail.com');
    setLoginPassword('Password123');
    setLoginLoading(true);
    try {
      const { data } = await authApi.login({
        email: 'devnexes.support@gmail.com',
        password: 'Password123',
      });
      const token = data.data?.accessToken || data.data?.token;
      if (token) setAuthToken(token);
      const loggedUser = data.data?.user;
      if (onLogin && loggedUser) onLogin(loggedUser);

      setLoginSuccess(true);
      toast.success('Signed in as Verified Demo Scholar!');
      setTimeout(() => {
        if (loggedUser && loggedUser.isOnboarded === false) {
          navigate('/onboarding');
        } else {
          navigate('/dashboard');
        }
      }, 700);
    } catch {
      toast.error('Demo login failed. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  /* ──────────────────────────────────────────────────────────────────────────
     REGISTER STATE & LOGIC
     ────────────────────────────────────────────────────────────────────────── */
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regTerms, setRegTerms] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [regTouched, setRegTouched] = useState({ name: false, email: false, password: false, confirm: false });
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [regShake, setRegShake] = useState(false);

  const isRegNameValid = regName.trim().length >= 2;
  const isRegEmailValid = regEmail.trim().length > 0 && emailRegex.test(regEmail.trim());
  const isRegPasswordValid = regPassword.length >= 8;
  const isRegConfirmValid = regConfirmPassword.length > 0 && regConfirmPassword === regPassword;
  const isRegFormValid = isRegNameValid && isRegEmailValid && isRegPasswordValid && isRegConfirmValid && regTerms;

  const strength = getPasswordStrength(regPassword);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegTouched({ name: true, email: true, password: true, confirm: true });

    if (!isRegFormValid) {
      setRegShake(true);
      setTimeout(() => setRegShake(false), 400);
      if (!regTerms) toast.error('Please accept the Terms & Privacy Policy.');
      return;
    }

    setRegLoading(true);
    try {
      await authApi.register({
        fullName: regName.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        plan: initialPlan,
      });

      setRegSuccess(true);
      toast.success('Account created! Verification code sent to your email.');

      setTimeout(() => {
        navigate(`/verify-otp?email=${encodeURIComponent(regEmail.trim().toLowerCase())}&name=${encodeURIComponent(regName.trim())}&plan=${initialPlan}`);
      }, 700);
    } catch (err: any) {
      setRegShake(true);
      setTimeout(() => setRegShake(false), 400);
      const status = err.response?.status;
      if (status === 409 || err.response?.data?.message?.toLowerCase().includes('already')) {
        toast.error('An account with this email already exists. Please sign in instead.');
      } else {
        toast.error(err.response?.data?.message || 'Registration failed. Please check your details.');
      }
    } finally {
      setRegLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    window.location.href = `${apiUrl}/auth/google`;
  };

  return (
    <div className="ss-book-stage-wrap">
      <div className="ss-book-stage">
        <div className={`ss-book ${isOpen ? 'open' : ''}`} id="book">

          {/* ─── UNDERNEATH PAGES ────────────────────────────────────── */}
          <div className="ss-book-pages">
            {/* Left Page (Chapter One / Welcome Back Brand Leaf) */}
            <div className="ss-book-leaf left">
              <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                <img
                  src="/studysync-logo-transparent.png"
                  alt="StudySync AI"
                  style={{ height: '62px', width: 'auto', objectFit: 'contain', margin: '0 auto 8px', display: 'block' }}
                />
                <p className="ss-book-eyebrow">CHAPTER ONE</p>
                <h2 className="ss-book-h2">The Academic Ledger</h2>
                <p className="ss-book-sub">
                  "Every lecture slide synthesized. Every deadline calculated. Pick up right where you left off."
                </p>
              </div>

              {/* Trust Badges */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11.5px', color: '#5C4F45', margin: '10px 0 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={14} color="#10B981" />
                  <span>100% Isolated Supabase Database Cloud</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={14} color="#6366F1" />
                  <span>Military-Grade AES-256-GCM BYOK Engine</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={14} color="#2563EB" />
                  <span>Multi-Course Roman Urdu Deadline Detection</span>
                </div>
              </div>

              {/* 1-Click Demo Login */}
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={loginLoading}
                className="ss-book-demo-btn"
              >
                <Sparkles size={13} color="var(--book-accent)" />
                <span>Explore as Verified Demo Student</span>
              </button>

              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <Link to="/" style={{ color: '#78716C', fontSize: '11px', textDecoration: 'none' }}>
                  ← Return to Campus Home
                </Link>
              </div>
            </div>

            {/* Right Page Underneath (Revealed when Leaf is Turned to Register) */}
            <div className="ss-book-leaf right" id="staticRight">
              <p className="ss-book-eyebrow">CHAPTER TWO</p>
              <h2 className="ss-book-h2">Academic Superpowers</h2>
              <p className="ss-book-sub">
                Designed for ambitious scholars mastering engineering, medicine, and business.
              </p>

              {initialPlan !== 'free' && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  color: '#4F46E5',
                  fontSize: '11px',
                  fontWeight: 600,
                  marginBottom: '14px',
                  width: 'fit-content'
                }}>
                  <Sparkles size={12} />
                  <span>Selected Tier: <strong style={{ textTransform: 'uppercase' }}>{initialPlan}</strong></span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px', color: '#5C4F45', textAlign: 'left', lineHeight: 1.5 }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ color: 'var(--book-accent)', fontWeight: 700 }}>•</span>
                  <span><strong>Slide RAG Companion:</strong> Question your lecture slides with zero hallucination.</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ color: 'var(--book-accent)', fontWeight: 700 }}>•</span>
                  <span><strong>Roman Urdu Parser:</strong> Say <i>"assignment aglay hafte tak submit karni hai"</i> to schedule instantly.</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={{ color: 'var(--book-accent)', fontWeight: 700 }}>•</span>
                  <span><strong>WhatsApp & Gmail Alerts:</strong> Automated reminders right before crucial exam dates.</span>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '22px' }}>
                <Link to="/" style={{ color: '#78716C', fontSize: '11px', textDecoration: 'none' }}>
                  ← Return to Campus Home
                </Link>
              </div>
            </div>
          </div>

          {/* ─── 3D FLIPPING LEAF (Login Front, Register Back) ───────── */}
          <div className={`ss-book-flip-leaf ${folding ? 'folding' : ''}`} id="flipLeaf">
            
            {/* FRONT FACE: SIGN IN ───────────────────────────────────── */}
            <div className={`ss-book-face front ${loginShake ? 'ss-shake' : ''}`}>
              <p className="ss-book-eyebrow">SCHOLAR ACCESS</p>
              <h2 className="ss-book-h2">Sign in</h2>
              <p className="ss-book-sub">Enter your university credentials to continue reading.</p>

              {loginSuccess ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <CheckCircle2 size={40} color="#10B981" style={{ margin: '0 auto 10px' }} />
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--book-ink)', margin: '0 0 4px' }}>
                    Authenticated!
                  </h3>
                  <p style={{ fontSize: '12px', color: '#5C4F45', margin: 0 }}>
                    Opening your study workspace...
                  </p>
                  <Loader2 size={18} className="animate-spin" style={{ margin: '14px auto 0', color: 'var(--book-accent)' }} />
                </div>
              ) : (
                <form className="ss-book-form" onSubmit={handleLoginSubmit} noValidate>
                  {/* Email */}
                  <div className="ss-book-form-group">
                    <label className="ss-book-label" htmlFor="bookLoginEmail">University Email</label>
                    <div className="ss-book-input-wrap">
                      <input
                        id="bookLoginEmail"
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        onBlur={() => setLoginTouched((p) => ({ ...p, email: true }))}
                        placeholder="scholar@university.edu"
                        className={`ss-book-input ${loginTouched.email && !isLoginEmailValid ? 'ss-input-error' : ''}`}
                        autoComplete="email"
                      />
                      <Mail size={14} color="#94A3B8" style={{ position: 'absolute', right: '4px' }} />
                    </div>
                    {loginTouched.email && !isLoginEmailValid && (
                      <span style={{ fontSize: '10.5px', color: 'var(--priority-high)' }}>Enter a valid university email</span>
                    )}
                  </div>

                  {/* Password */}
                  <div className="ss-book-form-group">
                    <div className="ss-book-label">
                      <label htmlFor="bookLoginPassword" style={{ cursor: 'pointer' }}>Password</label>
                      <Link to="/forgot-password" style={{ color: 'var(--book-accent)', fontSize: '10.5px', textDecoration: 'none' }}>
                        Forgot?
                      </Link>
                    </div>
                    <div className="ss-book-input-wrap">
                      <input
                        id="bookLoginPassword"
                        type={showLoginPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        onBlur={() => setLoginTouched((p) => ({ ...p, password: true }))}
                        placeholder="••••••••"
                        className={`ss-book-input ${loginTouched.password && !loginPassword ? 'ss-input-error' : ''}`}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        style={{ position: 'absolute', right: '2px', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: '#94A3B8' }}
                        aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                      >
                        {showLoginPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#6B5C4F' }}>
                    <input
                      type="checkbox"
                      id="bookRememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      style={{ accentColor: 'var(--book-accent)', cursor: 'pointer' }}
                    />
                    <label htmlFor="bookRememberMe" style={{ cursor: 'pointer' }}>Remember this device</label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loginLoading || !isLoginFormValid}
                    className="ss-book-submit-btn"
                  >
                    {loginLoading ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Opening Ledger...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>

                  {/* Google OAuth Button */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="ss-book-google-btn"
                    aria-label="Continue with Google"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.15C3.33 21.46 7.38 24 12 24z" />
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.27C.46 8.19 0 10.03 0 12s.46 3.81 1.27 5.42l4.01-3.15z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.38 0 3.33 2.54 1.27 6.58l4.01 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                    </svg>
                    <span>Continue with Google</span>
                  </button>
                </form>
              )}

              <p className="ss-book-switch">
                New here? <a onClick={() => togglePage('register')}>Turn to registration page →</a>
              </p>
            </div>

            {/* BACK FACE: CREATE ACCOUNT ─────────────────────────────── */}
            <div className={`ss-book-face back ${regShake ? 'ss-shake' : ''}`}>
              <p className="ss-book-eyebrow">NEW SCHOLAR</p>
              <h2 className="ss-book-h2">Create account</h2>
              <p className="ss-book-sub">Start your own chapter. It only takes a minute.</p>

              {regSuccess ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <CheckCircle2 size={40} color="#10B981" style={{ margin: '0 auto 10px' }} />
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--book-ink)', margin: '0 0 4px' }}>
                    Account Inscribed!
                  </h3>
                  <p style={{ fontSize: '12px', color: '#5C4F45', margin: 0 }}>
                    Sending 6-digit verification code to {regEmail}...
                  </p>
                  <Loader2 size={18} className="animate-spin" style={{ margin: '14px auto 0', color: 'var(--book-accent)' }} />
                </div>
              ) : (
                <form className="ss-book-form" onSubmit={handleRegisterSubmit} noValidate>
                  {/* Name */}
                  <div className="ss-book-form-group">
                    <label className="ss-book-label" htmlFor="bookRegName">Full Name</label>
                    <div className="ss-book-input-wrap">
                      <input
                        id="bookRegName"
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        onBlur={() => setRegTouched((p) => ({ ...p, name: true }))}
                        placeholder="Ali Ahmed"
                        className={`ss-book-input ${regTouched.name && !isRegNameValid ? 'ss-input-error' : ''}`}
                        autoComplete="name"
                      />
                      <User size={14} color="#94A3B8" style={{ position: 'absolute', right: '4px' }} />
                    </div>
                  </div>

                  {/* Email */}
                  <div className="ss-book-form-group">
                    <label className="ss-book-label" htmlFor="bookRegEmail">University Email</label>
                    <div className="ss-book-input-wrap">
                      <input
                        id="bookRegEmail"
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        onBlur={() => setRegTouched((p) => ({ ...p, email: true }))}
                        placeholder="scholar@university.edu"
                        className={`ss-book-input ${regTouched.email && !isRegEmailValid ? 'ss-input-error' : ''}`}
                        autoComplete="email"
                      />
                      <Mail size={14} color="#94A3B8" style={{ position: 'absolute', right: '4px' }} />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="ss-book-form-group">
                    <label className="ss-book-label" htmlFor="bookRegPassword">Password</label>
                    <div className="ss-book-input-wrap">
                      <input
                        id="bookRegPassword"
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        onBlur={() => setRegTouched((p) => ({ ...p, password: true }))}
                        placeholder="••••••••"
                        className={`ss-book-input ${regTouched.password && !isRegPasswordValid ? 'ss-input-error' : ''}`}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        style={{ position: 'absolute', right: '2px', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: '#94A3B8' }}
                        aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                      >
                        {showRegPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>

                    {/* Password Strength */}
                    {regPassword && (
                      <div style={{ display: 'flex', gap: '3px', marginTop: '3px' }}>
                        <div style={{ height: '3px', flex: 1, borderRadius: '2px', background: strength.score >= 1 ? (strength.colorClass === 'weak' ? 'var(--priority-high)' : strength.colorClass === 'medium' ? 'var(--priority-medium)' : 'var(--priority-low)') : '#E2E8F0' }} />
                        <div style={{ height: '3px', flex: 1, borderRadius: '2px', background: strength.score >= 2 ? (strength.colorClass === 'medium' ? 'var(--priority-medium)' : 'var(--priority-low)') : '#E2E8F0' }} />
                        <div style={{ height: '3px', flex: 1, borderRadius: '2px', background: strength.score >= 3 ? 'var(--priority-low)' : '#E2E8F0' }} />
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="ss-book-form-group">
                    <label className="ss-book-label" htmlFor="bookRegConfirm">Confirm Password</label>
                    <div className="ss-book-input-wrap">
                      <input
                        id="bookRegConfirm"
                        type={showRegConfirm ? 'text' : 'password'}
                        required
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        onBlur={() => setRegTouched((p) => ({ ...p, confirm: true }))}
                        placeholder="Repeat password"
                        className={`ss-book-input ${regTouched.confirm && !isRegConfirmValid ? 'ss-input-error' : ''}`}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegConfirm(!showRegConfirm)}
                        style={{ position: 'absolute', right: '2px', background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: '#94A3B8' }}
                        aria-label={showRegConfirm ? 'Hide password' : 'Show password'}
                      >
                        {showRegConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                    {regConfirmPassword && regConfirmPassword === regPassword && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', color: 'var(--priority-low)', marginTop: '2px' }}>
                        <Check size={11} />
                        <span>Passwords match</span>
                      </div>
                    )}
                  </div>

                  {/* Terms */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '11px', color: '#6B5C4F' }}>
                    <input
                      type="checkbox"
                      id="bookRegTerms"
                      checked={regTerms}
                      onChange={(e) => setRegTerms(e.target.checked)}
                      style={{ accentColor: 'var(--book-accent)', cursor: 'pointer', marginTop: '2px' }}
                    />
                    <label htmlFor="bookRegTerms" style={{ cursor: 'pointer', lineHeight: 1.3 }}>
                      I agree to the <Link to="/about" style={{ color: 'var(--book-accent)', textDecoration: 'none' }}>Terms & Privacy Policy</Link>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={regLoading || !isRegFormValid}
                    className="ss-book-submit-btn"
                  >
                    {regLoading ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <>
                        <span>Create Account</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>

                  {/* Google OAuth */}
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="ss-book-google-btn"
                    aria-label="Sign up with Google"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.27v3.15C3.33 21.46 7.38 24 12 24z" />
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.27C.46 8.19 0 10.03 0 12s.46 3.81 1.27 5.42l4.01-3.15z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.38 0 3.33 2.54 1.27 6.58l4.01 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                    </svg>
                    <span>Sign up with Google</span>
                  </button>
                </form>
              )}

              <p className="ss-book-switch">
                Already registered? <a onClick={() => togglePage('login')}>← Return to sign in</a>
              </p>
            </div>
          </div>

          {/* ─── 3D BOOK COVER (Hinged on Left Edge) ─────────────────── */}
          <div className="ss-book-cover" id="cover" onClick={openBook} title="Click to open book">
            <div className="ss-book-cover-title">
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '18px',
                background: 'rgba(232, 241, 251, 0.12)',
                border: '1.5px solid rgba(232, 241, 251, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                padding: '5px',
              }}>
                <img
                  src="/studysync-icon.png"
                  alt="StudySync AI"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px' }}
                />
              </div>
              <h1>StudySync AI</h1>
              <p>The Academic Ledger • Tap to Open</p>
            </div>
          </div>

        </div>

        {/* Floating helper hint */}
        <div className="ss-book-hint">
          {isOpen ? 'Use the page edges or links to turn chapters' : 'Click the book cover to open your ledger'}
        </div>
      </div>
    </div>
  );
}
