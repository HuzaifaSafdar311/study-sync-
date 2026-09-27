import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useState, useEffect } from 'react';
import { authApi, setAuthToken, getAuthToken } from './services/api';

// Pages
import Landing from './pages/Landing';
import About from './pages/About';
import Features from './pages/Features';
import PricingPage from './pages/PricingPage';
import Blog from './pages/Blog';
import Contact from './pages/Contact';
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyOtp from './pages/VerifyOtp';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Calendar from './pages/Calendar';
import Courses from './pages/Courses';
import Chatbot from './pages/Chatbot';
import Settings from './pages/Settings';
import Onboarding from './pages/Onboarding';
import AdminPortal from './pages/AdminPortal';
import ToolsHub from './pages/Tools/ToolsHub';
import Compressor from './pages/Tools/Compressor';
import CamScanner from './pages/Tools/CamScanner';
import PdfConverter from './pages/Tools/PdfConverter';
import Layout from './components/Layout';
import LogoFillLoader from './components/LogoFillLoader';

import './index.css';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isOnboarded?: boolean;
  plan?: string;
  university?: string;
  major?: string;
  semester?: string;
  aiProviderPreference?: string;
  activeByokProvider?: string;
}

// Protected Route Guard: Requires login; forces onboarding if incomplete
function ProtectedRoute({
  user,
  authChecking,
  children,
}: {
  user: User | null;
  authChecking: boolean;
  children: React.ReactNode;
}) {
  if (authChecking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAF9', color: '#57534E' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366F1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>Loading student workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.isOnboarded === false) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

// Tool Auth Guard: Displays student login prompt for CPU-heavy tools
function ToolAuthGuard({
  user,
  authChecking,
  children,
}: {
  user: User | null;
  authChecking: boolean;
  children: React.ReactNode;
}) {
  if (authChecking) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #E2E8F0', borderTopColor: '#6366F1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ maxWidth: '540px', margin: '4rem auto', padding: '2.5rem', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        </div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>Student Login Required</h2>
        <p style={{ color: '#64748B', fontSize: '0.95rem', marginBottom: '1.75rem', lineHeight: 1.5 }}>
          Document conversion and compression utilize dedicated server-side CPU workers. Please log in or create a free student account to process your files securely.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <a
            href="/login"
            style={{
              padding: '10px 24px',
              background: '#6366F1',
              color: '#FFFFFF',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.9rem',
              textDecoration: 'none',
              boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
            }}
          >
            Log In
          </a>
          <a
            href="/register"
            style={{
              padding: '10px 24px',
              background: '#F1F5F9',
              color: '#334155',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.9rem',
              textDecoration: 'none',
              border: '1px solid #E2E8F0',
            }}
          >
            Create Account
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Onboarding Route Guard: Requires login; redirects to dashboard if already completed
function OnboardingRoute({
  user,
  authChecking,
  onComplete,
}: {
  user: User | null;
  authChecking: boolean;
  onComplete: (u: any) => void;
}) {
  if (authChecking) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAF9' }}>
        <div style={{ width: '32px', height: '32px', border: '3px solid #E2E8F0', borderTopColor: '#6366F1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.isOnboarded === true) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Onboarding onComplete={onComplete} />;
}

// Public Auth Route Guard: Redirects logged-in users away from /login & /register
function PublicAuthRoute({
  user,
  authChecking,
  children,
}: {
  user: User | null;
  authChecking: boolean;
  children: React.ReactNode;
}) {
  if (authChecking) {
    return null;
  }

  if (user) {
    if (user.isOnboarded === false) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [isAppLoading, setIsAppLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setAuthChecking(false);
      return;
    }

    try {
      const { data } = await authApi.me();
      if (data.data?.user) {
        setUser(data.data.user);
      } else {
        setUser(null);
        setAuthToken(null);
      }
    } catch {
      setUser(null);
      setAuthToken(null);
    } finally {
      setAuthChecking(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {}
    setAuthToken(null);
    setUser(null);
  };

  return (
    <>
      {isAppLoading && (
        <LogoFillLoader
          onFinish={() => setIsAppLoading(false)}
        />
      )}
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'toast-custom',
            duration: 4000,
            style: {
              fontFamily: "'Inter', sans-serif",
              fontSize: '0.875rem',
              borderRadius: '8px',
            },
          }}
        />

        <Routes>
          {/* Public Platform Pages */}
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<About />} />
          <Route path="/features" element={<Features />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/courses" element={<Navigate to="/" replace />} />

          {/* Authentication & Account Recovery Routes */}
          <Route
            path="/login"
            element={
              <PublicAuthRoute user={user} authChecking={authChecking}>
                <Login onLogin={(u) => setUser(u)} />
              </PublicAuthRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicAuthRoute user={user} authChecking={authChecking}>
                <Register />
              </PublicAuthRoute>
            }
          />
          <Route
            path="/verify-otp"
            element={<VerifyOtp onLogin={(u) => setUser(u)} />}
          />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Onboarding Wizard (Dedicated Gate for New Students) */}
          <Route
            path="/onboarding"
            element={
              <OnboardingRoute
                user={user}
                authChecking={authChecking}
                onComplete={(u) => setUser((prev) => (prev ? { ...prev, ...u, isOnboarded: true } : u))}
              />
            }
          />

          {/* Public Tools Section (Accessible to both Guests and Logged-in Students, No Auth Required) */}
          <Route element={<Layout user={user} onLogout={handleLogout} />}>
            <Route path="/tools" element={<ToolsHub />} />
            <Route
              path="/tools/compressor"
              element={
                <ToolAuthGuard user={user} authChecking={authChecking}>
                  <Compressor />
                </ToolAuthGuard>
              }
            />
            <Route path="/tools/cam-scanner" element={<CamScanner />} />
            <Route
              path="/tools/pdf-converter"
              element={
                <ToolAuthGuard user={user} authChecking={authChecking}>
                  <PdfConverter />
                </ToolAuthGuard>
              }
            />
          </Route>

          {/* Protected Workspace Layout (Per-Student Isolated) */}
          <Route
            element={
              <ProtectedRoute user={user} authChecking={authChecking}>
                <Layout user={user!} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard user={user!} />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/my-courses" element={<Courses />} />
            <Route path="/chatbot" element={<Chatbot />} />
            <Route
              path="/settings"
              element={
                <Settings
                  user={user!}
                  onUpdateUser={(updated) => setUser((prev) => (prev ? { ...prev, ...updated } : null))}
                  onLogout={handleLogout}
                />
              }
            />
          </Route>

          {/* Dedicated High-Security Operations & Admin Portal */}
          <Route path="/admin/login" element={<Navigate to="/login" replace />} />
          <Route path="/admin" element={<AdminPortal />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
