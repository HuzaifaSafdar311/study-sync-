import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Mail,
  User,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi, setAuthToken, setAdminToken } from '../services/api';
import AttractedDotsBackground from './AttractedDotsBackground';

interface BookAuthProps {
  initialMode: 'login' | 'register';
  onLogin?: (user: any) => void;
}

function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: '', color: '#E2E8F0' };

  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 1) return { score: 1, label: 'Weak', color: '#EF4444' };
  if (score <= 3) return { score: 2, label: 'Good', color: '#F59E0B' };
  return { score: 3, label: 'Strong', color: '#10B981' };
}

export default function BookAuth({ initialMode, onLogin }: BookAuthProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Mode state for 3D page folding ('login' = unfolded on right, 'register' = folded to left)
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  const initialPlan = searchParams.get('plan') || 'free';

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    const handlePopState = () => {
      const isReg = window.location.pathname.includes('/register');
      setMode(isReg ? 'register' : 'login');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const switchMode = (target: 'login' | 'register') => {
    if (target === mode) return;
    setMode(target);
    const targetUrl = target === 'register'
      ? `/register${initialPlan !== 'free' ? `?plan=${initialPlan}` : ''}`
      : '/login';
    window.history.pushState(null, '', targetUrl);
  };

  /* ──────────────────────────────────────────────────────────────────────────
     LOGIN STATE & SUBMIT
     ────────────────────────────────────────────────────────────────────────── */
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginTouched, setLoginTouched] = useState({ email: false, password: false });
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [loginShake, setLoginShake] = useState(false);

  // Check for Google OAuth callback
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
      }, 600);
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
        toast('Please verify your email. Code sent!', { icon: '✉️' });
        navigate(`/verify-otp?email=${encodeURIComponent(targetEmail)}`);
        return;
      }

      const token = data.data?.accessToken || data.data?.token;
      if (token) setAuthToken(token);

      const loggedUser = data.data?.user;
      const isAdminLogin = Boolean(
        data.data?.isAdmin ||
        data.data?.adminToken ||
        loggedUser?.role === 'admin' ||
        loginEmail.trim().toLowerCase() === 'admin@studysync.com'
      );

      if (isAdminLogin && data.data?.adminToken) {
        setAdminToken(data.data.adminToken);
      }

      if (onLogin && loggedUser) onLogin(loggedUser);

      setLoginSuccess(true);

      if (isAdminLogin) {
        toast.success('Welcome, Administrator!');
        setTimeout(() => {
          navigate('/admin', { replace: true });
        }, 500);
        return;
      }

      toast.success(`Welcome back, ${loggedUser?.fullName || 'Student'}!`);

      setTimeout(() => {
        if (loggedUser && loggedUser.isOnboarded === false) {
          navigate('/onboarding');
        } else {
          navigate('/dashboard');
        }
      }, 600);
    } catch (err: any) {
      setLoginShake(true);
      setTimeout(() => setLoginShake(false), 400);
      const status = err.response?.status;
      if (status === 401 || status === 400) {
        toast.error('Invalid email or password.');
      } else {
        toast.error(err.response?.data?.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoginLoading(false);
    }
  };



  /* ──────────────────────────────────────────────────────────────────────────
     REGISTER STATE & SUBMIT
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
      toast.success('Verification code sent to your email!');

      setTimeout(() => {
        navigate(`/verify-otp?email=${encodeURIComponent(regEmail.trim().toLowerCase())}&name=${encodeURIComponent(regName.trim())}&plan=${initialPlan}`);
      }, 600);
    } catch (err: any) {
      setRegShake(true);
      setTimeout(() => setRegShake(false), 400);
      const status = err.response?.status;
      if (status === 409 || err.response?.data?.message?.toLowerCase().includes('already')) {
        toast.error('Account already exists. Please sign in.');
      } else {
        toast.error(err.response?.data?.message || 'Registration failed.');
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
    <div className="ss-pagefold-stage-wrap">
      {/* Animated dots attracted toward the central book */}
      <AttractedDotsBackground />

      {/* Subtle gravitational ambient glow behind book */}
      <div className="ss-book-gravity-glow" />

      <div className="ss-pagefold-stage">
        <div className="ss-pagefold-book" data-mode={mode}>
          
          {/* Center Valley Spine Crease */}
          <div className="ss-pagefold-spine" />

          {/* ─── UNDERNEATH BASE SPREAD (Left Base + Right Base) ─────────── */}
          <div className="ss-pagefold-base">
            
            {/* BASE PAGE LEFT (Visible when on Sign In mode) */}
            <div
              className="ss-page-leaf left-base"
              style={{ pointerEvents: mode === 'login' ? 'auto' : 'none' }}
            >
              <div className="ss-book-left-content">
                <div className="ss-book-logo-box">
                  <img
                    src="/studysync-logo-horizontal.png"
                    alt="StudySync AI"
                    className="ss-book-logo-img"
                  />
                </div>

                <div className="ss-book-ticks-group">
                  <div className="ss-book-tick-row">
                    <span className="ss-book-tick-circle">
                      <Check size={14} strokeWidth={3} />
                    </span>
                    <span className="ss-book-tick-text">Slide Grounded Q&A</span>
                  </div>

                  <div className="ss-book-tick-row">
                    <span className="ss-book-tick-circle">
                      <Check size={14} strokeWidth={3} />
                    </span>
                    <span className="ss-book-tick-text">Roman Urdu WhatsApp Alerts</span>
                  </div>

                  <div className="ss-book-tick-row">
                    <span className="ss-book-tick-circle">
                      <Check size={14} strokeWidth={3} />
                    </span>
                    <span className="ss-book-tick-text">Course-Isolated Workspaces</span>
                  </div>

                  <div className="ss-book-tick-row">
                    <span className="ss-book-tick-circle">
                      <Check size={14} strokeWidth={3} />
                    </span>
                    <span className="ss-book-tick-text">Autonomous Study Assistant</span>
                  </div>
                </div>
              </div>
            </div>

            {/* BASE PAGE RIGHT (Revealed when Leaf folds over to Left - Register Form) */}
            <div
              className="ss-page-leaf right-base"
              style={{ pointerEvents: mode === 'register' ? 'auto' : 'none' }}
            >
              <div className={`ss-auth-card-inner ${regShake ? 'ss-shake' : ''}`}>
                <h1 className="ss-auth-h1">Create Account</h1>
                <p className="ss-auth-desc">Join StudySync workspace</p>

                {regSuccess ? (
                  <div style={{ textAlign: 'center', padding: '36px 0' }}>
                    <CheckCircle2 size={40} color="#10B981" style={{ margin: '0 auto 10px' }} />
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>
                      Account Created!
                    </h3>
                    <p style={{ fontSize: '0.825rem', color: '#64748B', margin: 0 }}>
                      Sending verification OTP...
                    </p>
                    <Loader2 size={18} className="animate-spin" style={{ margin: '12px auto 0', color: '#2563EB' }} />
                  </div>
                ) : (
                  <form onSubmit={handleRegisterSubmit} className="ss-auth-form" noValidate>
                    {/* Full Name */}
                    <div className="ss-auth-form-group">
                      <label className="ss-auth-label" htmlFor="regName">Full Name</label>
                      <div className="ss-auth-input-wrap">
                        <input
                          id="regName"
                          type="text"
                          required
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          onBlur={() => setRegTouched((p) => ({ ...p, name: true }))}
                          placeholder="Enter your name"
                          className={`ss-auth-input ${regTouched.name && !isRegNameValid ? 'ss-input-error' : ''}`}
                          autoComplete="name"
                        />
                        <User size={15} className="ss-auth-input-icon" />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="ss-auth-form-group">
                      <label className="ss-auth-label" htmlFor="regEmail">Email</label>
                      <div className="ss-auth-input-wrap">
                        <input
                          id="regEmail"
                          type="email"
                          required
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          onBlur={() => setRegTouched((p) => ({ ...p, email: true }))}
                          placeholder="Enter your email"
                          className={`ss-auth-input ${regTouched.email && !isRegEmailValid ? 'ss-input-error' : ''}`}
                          autoComplete="email"
                        />
                        <Mail size={15} className="ss-auth-input-icon" />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="ss-auth-form-group">
                      <div className="ss-auth-label">
                        <label htmlFor="regPassword">Password</label>
                        {regPassword && (
                          <span style={{ fontSize: '0.72rem', color: strength.color, fontWeight: 700 }}>
                            {strength.label}
                          </span>
                        )}
                      </div>
                      <div className="ss-auth-input-wrap">
                        <input
                          id="regPassword"
                          type={showRegPassword ? 'text' : 'password'}
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          onBlur={() => setRegTouched((p) => ({ ...p, password: true }))}
                          placeholder="Enter your password"
                          className={`ss-auth-input ${regTouched.password && !isRegPasswordValid ? 'ss-input-error' : ''}`}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="ss-auth-pw-toggle"
                          aria-label={showRegPassword ? 'Hide password' : 'Show password'}
                        >
                          {showRegPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="ss-auth-form-group">
                      <label className="ss-auth-label" htmlFor="regConfirm">Confirm Password</label>
                      <div className="ss-auth-input-wrap">
                        <input
                          id="regConfirm"
                          type={showRegConfirm ? 'text' : 'password'}
                          required
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          onBlur={() => setRegTouched((p) => ({ ...p, confirm: true }))}
                          placeholder="Confirm your password"
                          className={`ss-auth-input ${regTouched.confirm && !isRegConfirmValid ? 'ss-input-error' : ''}`}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegConfirm(!showRegConfirm)}
                          className="ss-auth-pw-toggle"
                          aria-label={showRegConfirm ? 'Hide password' : 'Show password'}
                        >
                          {showRegConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    {/* Terms */}
                    <div className="ss-auth-row">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={regTerms}
                          onChange={(e) => setRegTerms(e.target.checked)}
                          style={{ accentColor: '#2563EB', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.78rem' }}>I agree to Terms & Privacy</span>
                      </label>
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={regLoading || !isRegFormValid}
                      className="ss-auth-submit-btn"
                    >
                      {regLoading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Creating Account...</span>
                        </>
                      ) : (
                        <>
                          <span>Create Account</span>
                        </>
                      )}
                    </button>

                    {/* Google OAuth */}
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      className="ss-auth-google-btn"
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

                <p className="ss-auth-flip-hint">
                  Already registered?
                  <span onClick={() => switchMode('login')} className="ss-auth-flip-link">
                    Sign in here
                  </span>
                </p>
              </div>
            </div>

          </div>

          {/* ─── 3D TURNING / FOLDING LEAF ───────────────────────────────── */}
          <div
            className={`ss-pagefold-turning-leaf ${mode === 'register' ? 'folded' : ''}`}
            aria-label="Turning page"
          >
            <div className="ss-leaf-curl-lighting" />
            <div className="ss-leaf-shadow" />

            {/* FRONT FACE: Sign In Form (Visible when at 0deg on the Right) */}
            <div
              className="ss-leaf-face front"
              style={{ pointerEvents: mode === 'login' ? 'auto' : 'none' }}
            >
              <div className={`ss-auth-card-inner ${loginShake ? 'ss-shake' : ''}`}>
                <h1 className="ss-auth-h1">Sign In</h1>
                <p className="ss-auth-desc">Enter your credentials</p>

                {loginSuccess ? (
                  <div style={{ textAlign: 'center', padding: '36px 0' }}>
                    <CheckCircle2 size={40} color="#10B981" style={{ margin: '0 auto 10px' }} />
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>
                      Authenticated!
                    </h3>
                    <p style={{ fontSize: '0.825rem', color: '#64748B', margin: 0 }}>
                      Opening workspace...
                    </p>
                    <Loader2 size={18} className="animate-spin" style={{ margin: '12px auto 0', color: '#2563EB' }} />
                  </div>
                ) : (
                  <form onSubmit={handleLoginSubmit} className="ss-auth-form" noValidate>
                    {/* Email */}
                    <div className="ss-auth-form-group">
                      <label className="ss-auth-label" htmlFor="loginEmail">
                        <span>Email</span>
                      </label>
                      <div className="ss-auth-input-wrap">
                        <input
                          id="loginEmail"
                          type="email"
                          required
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          onBlur={() => setLoginTouched((p) => ({ ...p, email: true }))}
                          placeholder="Enter your email"
                          className={`ss-auth-input ${loginTouched.email && !isLoginEmailValid ? 'ss-input-error' : ''}`}
                          autoComplete="email"
                        />
                        <Mail size={15} className="ss-auth-input-icon" />
                      </div>
                    </div>

                    {/* Password */}
                    <div className="ss-auth-form-group">
                      <div className="ss-auth-label">
                        <label htmlFor="loginPassword">Password</label>
                        <Link to="/forgot-password" className="ss-auth-flip-link" style={{ fontSize: '0.78rem' }}>
                          Forgot?
                        </Link>
                      </div>
                      <div className="ss-auth-input-wrap">
                        <input
                          id="loginPassword"
                          type={showLoginPassword ? 'text' : 'password'}
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          onBlur={() => setLoginTouched((p) => ({ ...p, password: true }))}
                          placeholder="Enter your password"
                          className={`ss-auth-input ${loginTouched.password && !loginPassword ? 'ss-input-error' : ''}`}
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="ss-auth-pw-toggle"
                          aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                        >
                          {showLoginPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>

                    {/* Remember Me */}
                    <div className="ss-auth-row">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          style={{ accentColor: '#2563EB', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.78rem' }}>Remember device</span>
                      </label>
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={loginLoading || !isLoginFormValid}
                      className="ss-auth-submit-btn"
                    >
                      {loginLoading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Signing In...</span>
                        </>
                      ) : (
                        <>
                          <span>Sign In</span>
                        </>
                      )}
                    </button>

                    {/* Google OAuth */}
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      className="ss-auth-google-btn"
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

                <p className="ss-auth-flip-hint">
                  New student?
                  <span onClick={() => switchMode('register')} className="ss-auth-flip-link">
                    Register here
                  </span>
                </p>
              </div>
            </div>

            {/* BACK FACE: Logo & 4 Points (Visible when Folded to Left) */}
            <div
              className="ss-leaf-face back"
              style={{ pointerEvents: mode === 'register' ? 'auto' : 'none' }}
            >
              <div className="ss-book-left-content">
                <div className="ss-book-logo-box">
                  <img
                    src="/studysync-logo-horizontal.png"
                    alt="StudySync AI"
                    className="ss-book-logo-img"
                  />
                </div>

                <div className="ss-book-ticks-group">
                  <div className="ss-book-tick-row">
                    <span className="ss-book-tick-circle">
                      <Check size={14} strokeWidth={3} />
                    </span>
                    <span className="ss-book-tick-text">Slide Grounded Q&A</span>
                  </div>

                  <div className="ss-book-tick-row">
                    <span className="ss-book-tick-circle">
                      <Check size={14} strokeWidth={3} />
                    </span>
                    <span className="ss-book-tick-text">Roman Urdu WhatsApp Alerts</span>
                  </div>

                  <div className="ss-book-tick-row">
                    <span className="ss-book-tick-circle">
                      <Check size={14} strokeWidth={3} />
                    </span>
                    <span className="ss-book-tick-text">Course-Isolated Workspaces</span>
                  </div>

                  <div className="ss-book-tick-row">
                    <span className="ss-book-tick-circle">
                      <Check size={14} strokeWidth={3} />
                    </span>
                    <span className="ss-book-tick-text">Autonomous Study Assistant</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
