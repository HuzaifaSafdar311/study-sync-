import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  GraduationCap,
  Bot,
  Settings,
  ShieldCheck,
  LogOut,
  FileArchive,
  LogIn,
  Menu,
  X,
  Sparkles,
  Zap,
} from 'lucide-react';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';

interface LayoutProps {
  user: {
    fullName: string;
    email: string;
    role?: string;
    plan?: string;
    avatarUrl?: string;
  } | null;
  onLogout?: () => void;
}

const getInitials = (name?: string) => {
  if (!name || !name.trim()) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getPlanBadge = (plan?: string) => {
  const norm = (plan || '').trim().toLowerCase();
  if (norm === 'pro') {
    return {
      label: 'Pro',
      className: 'sidebar-plan-pro',
      icon: <Sparkles size={11} className="sidebar-plan-icon" />,
    };
  }
  if (norm === 'plus') {
    return {
      label: 'Plus',
      className: 'sidebar-plan-plus',
      icon: <Zap size={11} className="sidebar-plan-icon" fill="currentColor" />,
    };
  }
  if (norm === 'campus') {
    return {
      label: 'Campus',
      className: 'sidebar-plan-campus',
      icon: <GraduationCap size={11} className="sidebar-plan-icon" />,
    };
  }
  return {
    label: 'Free',
    className: 'sidebar-plan-free',
    icon: null,
  };
};

export default function Layout({ user, onLogout }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isChatbotPage = location.pathname.startsWith('/chatbot');
  const isCoursesPage = location.pathname.startsWith('/my-courses');
  const isDashboardPage = location.pathname === '/dashboard' || location.pathname === '/' || location.pathname === '';
  const isAdminPage = location.pathname.startsWith('/admin');

  // Close mobile sidebar on route navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch { }
    onLogout?.();
    navigate('/');
    toast.success('Signed out safely.');
  };

  return (
    <div className={`app-layout has-sidebar ${isChatbotPage ? 'chatbot-mode' : ''}`}>
      {/* ─── Mobile Sticky Top Header (Only visible <= 768px) ───────────── */}
      <div className="layout-mobile-top-bar">
        <NavLink to="/dashboard" className="layout-mobile-brand" onClick={() => setIsMobileMenuOpen(false)}>
          <img
            src="/studysync-logo-horizontal.png"
            alt="StudySync AI"
            className="layout-mobile-brand-img"
          />
        </NavLink>
        <button
          type="button"
          className="layout-mobile-toggle-btn"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* ─── Backdrop overlay when mobile menu is open ──────────────────── */}
      {isMobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ─── Sleek Left Sidebar Navigation ──────────────────────────────── */}
      <aside className={`app-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        {/* Top: Brand Header (Large Clean Logo, No Border, No Shade) */}
        <div className="sidebar-brand-container">
          <NavLink to="/dashboard" className="sidebar-brand-link" title="StudySync AI — Dashboard">
            <img
              src="/studysync-logo-horizontal.png"
              alt="StudySync AI"
              className="sidebar-brand-logo-img"
            />
          </NavLink>
          <button
            type="button"
            className="sidebar-mobile-close-btn"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Center: Main Navigation List Divided into Modern Sections */}
        <nav className="sidebar-nav">
          <div className="sidebar-nav-section">
            <div className="sidebar-nav-label">Workspace</div>
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              title="Dashboard"
            >
              <div className="sidebar-nav-icon-wrap">
                <LayoutDashboard size={19} />
              </div>
              <span className="sidebar-nav-title">Dashboard</span>
            </NavLink>

            <NavLink
              to="/calendar"
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              title="Calendar"
            >
              <div className="sidebar-nav-icon-wrap">
                <CalendarDays size={19} />
              </div>
              <span className="sidebar-nav-title">Calendar</span>
            </NavLink>

            <NavLink
              to="/my-courses"
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              title="Courses"
            >
              <div className="sidebar-nav-icon-wrap">
                <GraduationCap size={19} />
              </div>
              <span className="sidebar-nav-title">Courses</span>
            </NavLink>
          </div>

          <div className="sidebar-nav-section">
            <div className="sidebar-nav-label">Intelligence</div>
            <NavLink
              to="/chatbot"
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              title="AI Chatbot Assistant"
            >
              <div className="sidebar-nav-icon-wrap">
                <Bot size={19} />
              </div>
              <span className="sidebar-nav-title">AI Chatbot</span>
              <span className="sidebar-ai-glow-badge">AI 2.0</span>
            </NavLink>
          </div>

          <div className="sidebar-nav-section">
            <div className="sidebar-nav-label">Utilities</div>
            <NavLink
              to="/tools"
              className={({ isActive }) => `sidebar-nav-item ${isActive || location.pathname.startsWith('/tools') ? 'active' : ''}`}
              title="Document Tools"
            >
              <div className="sidebar-nav-icon-wrap">
                <FileArchive size={19} />
              </div>
              <span className="sidebar-nav-title">Doc Tools</span>
              <span className="sidebar-ai-glow-badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366F1' }}>New</span>
            </NavLink>
          </div>

          <div className="sidebar-nav-section">
            <div className="sidebar-nav-label">Preferences</div>
            <NavLink
              to="/settings"
              className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
              title="Settings"
            >
              <div className="sidebar-nav-icon-wrap">
                <Settings size={19} />
              </div>
              <span className="sidebar-nav-title">Settings</span>
            </NavLink>
          </div>

          {user?.role === 'admin' && !user?.email?.toLowerCase().includes('arham.solution.me') && (
            <div className="sidebar-nav-section">
              <div className="sidebar-nav-label" style={{ color: '#F59E0B' }}>Governance</div>
              <NavLink
                to="/admin"
                className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
                title="Admin Portal"
              >
                <div className="sidebar-nav-icon-wrap" style={{ color: '#F59E0B' }}>
                  <ShieldCheck size={19} />
                </div>
                <span className="sidebar-nav-title" style={{ fontWeight: 600 }}>Admin Portal</span>
                <span style={{
                  marginLeft: 'auto',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(239, 68, 68, 0.25))',
                  color: '#F59E0B',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  padding: '2px 7px',
                  borderRadius: '9999px',
                  letterSpacing: '0.05em'
                }}>
                  Admin
                </span>
              </NavLink>
            </div>
          )}

          <div className="sidebar-footer-profile-section">
            {user ? (
              <div className="sidebar-profile-card">
                <NavLink
                  to="/settings"
                  className="sidebar-profile-info-link"
                  title="View Profile & Settings"
                >
                  <div className="sidebar-profile-avatar">
                    {getInitials(user.fullName)}
                  </div>
                  <div className="sidebar-profile-details">
                    <span className="sidebar-profile-name" title={user.fullName || 'Student'}>
                      {user.fullName || 'Student'}
                    </span>
                    <div className="sidebar-profile-plan-wrap">
                      {(() => {
                        const badge = getPlanBadge(user.plan);
                        return (
                          <span className={`sidebar-profile-plan-badge ${badge.className}`}>
                            {badge.icon}
                            <span>{badge.label}</span>
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </NavLink>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="sidebar-profile-logout-btn"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <NavLink
                to="/login"
                className="sidebar-nav-item"
                style={{ color: '#6366F1' }}
                title="Sign in to your account"
              >
                <div className="sidebar-nav-icon-wrap" style={{ color: '#6366F1' }}>
                  <LogIn size={18} />
                </div>
                <span className="sidebar-nav-title" style={{ color: '#6366F1', fontWeight: 600 }}>Sign In</span>
              </NavLink>
            )}
          </div>
        </nav>
      </aside>

      {/* ─── Main Viewport Area ───────────────────────────────────────── */}
      <main className={`main-content ${isChatbotPage ? 'chatbot-mode' : ''}`}>
        <div
          className={`page-container ${isChatbotPage ? 'page-container-chatbot' : ''} ${isCoursesPage ? 'page-container-courses' : ''
            } ${isDashboardPage ? 'page-container-dashboard' : ''} ${isAdminPage ? 'page-container-admin' : ''}`}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
