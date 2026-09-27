import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { adminApi, setAdminToken, getAdminToken } from '../services/api';
import {
  Users,
  BookOpen,
  CheckCircle,
  Cpu,
  RefreshCw,
  Search,
  Shield,
  Key,
  Database,
  Sparkles,
  Zap,
  Lock,
  UserCheck,
  UserX,
  ExternalLink,
  Activity,
  LogOut,
  KeyRound,
  ShieldAlert,
  MessageSquare,
  Mail,
  HardDrive,
  Eye,
  X,
} from 'lucide-react';
import '../styles/admin.css';

export default function AdminPortal() {
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'courses' | 'ai' | 'security'>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [overview, setOverview] = useState<any>(null);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersPagination, setUsersPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [userSearch, setUserSearch] = useState('');
  const [userPlanFilter, setUserPlanFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');

  // Fast-Action Upgrade Desk State (for WhatsApp orders)
  const [upgradeEmail, setUpgradeEmail] = useState('');
  const [upgradePlan, setUpgradePlan] = useState<'trial' | 'plus' | 'pro' | 'campus'>('plus');
  const [isUpgradingEmail, setIsUpgradingEmail] = useState(false);

  // Fast-Action Bonus Course Desk State (for WhatsApp Rs. 100 extra course orders)
  const [bonusEmail, setBonusEmail] = useState('');
  const [bonusCount, setBonusCount] = useState<number>(1);
  const [isAddingBonusEmail, setIsAddingBonusEmail] = useState(false);

  const [coursesList, setCoursesList] = useState<any[]>([]);
  const [coursesPagination, setCoursesPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [courseSearch, setCourseSearch] = useState('');
  const [courseStatusFilter, setCourseStatusFilter] = useState('all');

  const [aiUsage, setAiUsage] = useState<any>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  // Action states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedUserForModal, setSelectedUserForModal] = useState<any | null>(null);

  // Initial authorization check
  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    const token = getAdminToken();
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    try {
      const res = await adminApi.me();
      if (res.data.success && res.data.data) {
        setAdminUser(res.data.data);
        loadAllData();
      } else {
        setAdminToken(null);
        navigate('/login', { replace: true });
      }
    } catch {
      setAdminToken(null);
      navigate('/login', { replace: true });
    }
  };

  const handleLogout = async () => {
    try {
      await adminApi.logout();
    } catch {}
    setAdminToken(null);
    toast.success('Admin session ended securely.');
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    if (!adminUser) return;
    if (activeTab === 'users') {
      fetchUsers(1);
    } else if (activeTab === 'courses') {
      fetchCourses(1);
    } else if (activeTab === 'ai') {
      fetchAiUsage();
    }
  }, [activeTab, userPlanFilter, userStatusFilter, courseStatusFilter]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchOverview(),
        fetchUsers(1),
        fetchCourses(1),
        fetchAiUsage(),
      ]);
    } catch {
      toast.error('Failed to load some admin telemetry.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadAllData();
      toast.success('Admin telemetry refreshed live.');
    } catch {
      toast.error('Error refreshing data.');
    } finally {
      setRefreshing(false);
    }
  };

  const fetchOverview = async () => {
    try {
      const res = await adminApi.getOverview();
      if (res.data.success) {
        setOverview(res.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching overview:', err);
    }
  };

  const fetchUsers = async (page = 1) => {
    try {
      const res = await adminApi.getUsers({
        page,
        limit: 15,
        search: userSearch,
        plan: userPlanFilter,
        status: userStatusFilter,
      });
      if (res.data.success) {
        setUsersList(res.data.data.users);
        setUsersPagination(res.data.data.pagination);
      }
    } catch (err: any) {
      console.error('Error fetching users:', err);
    }
  };

  const fetchCourses = async (page = 1) => {
    try {
      const res = await adminApi.getCourses({
        page,
        limit: 15,
        search: courseSearch,
        status: courseStatusFilter,
      });
      if (res.data.success) {
        setCoursesList(res.data.data.courses);
        setCoursesPagination(res.data.data.pagination);
      }
    } catch (err: any) {
      console.error('Error fetching courses:', err);
    }
  };

  const fetchAiUsage = async () => {
    try {
      const res = await adminApi.getAiUsage();
      if (res.data.success) {
        setAiUsage(res.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching AI usage:', err);
    }
  };

  const handlePlanChange = async (userId: string, newPlan: string) => {
    setActionLoadingId(userId);
    try {
      const res = await adminApi.updateUserPlan(userId, newPlan);
      if (res.data.success) {
        toast.success(res.data.message || `Plan updated to ${newPlan.toUpperCase()}`);
        setUsersList((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, plan: newPlan } : u))
        );
        fetchOverview();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update plan');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDirectEmailUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upgradeEmail.trim()) {
      toast.error('Please enter the student email address.');
      return;
    }
    setIsUpgradingEmail(true);
    try {
      const res = await adminApi.upgradeUserByEmail(upgradeEmail.trim(), upgradePlan);
      if (res.data.success) {
        toast.success(res.data.message || `Student plan upgraded successfully!`);
        setUpgradeEmail('');
        fetchUsers(1);
        fetchOverview();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to upgrade student plan.');
    } finally {
      setIsUpgradingEmail(false);
    }
  };

  const handleAddBonusCourses = async (userId: string, count: number = 1) => {
    setActionLoadingId(userId);
    try {
      const res = await adminApi.addBonusCourses(userId, count);
      if (res.data.success) {
        toast.success(res.data.message || `Added ${count} bonus course(s)!`);
        setUsersList((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, bonusCourses: res.data.bonusCourses } : u))
        );
        if (selectedUserForModal && selectedUserForModal.id === userId) {
          setSelectedUserForModal((prev: any) => ({ ...prev, bonusCourses: res.data.bonusCourses }));
        }
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add bonus courses');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDirectBonusEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bonusEmail.trim()) {
      toast.error('Please enter the student email address.');
      return;
    }
    setIsAddingBonusEmail(true);
    try {
      const res = await adminApi.addBonusCoursesByEmail(bonusEmail.trim(), Number(bonusCount) || 1);
      if (res.data.success) {
        toast.success(res.data.message || `Bonus course(s) granted successfully!`);
        setBonusEmail('');
        setBonusCount(1);
        fetchUsers(usersPagination.page || 1);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to grant bonus course.');
    } finally {
      setIsAddingBonusEmail(false);
    }
  };

  const handleToggleUserBlock = async (userId: string, currentBlocked: boolean) => {
    const nextStatus = !currentBlocked;
    setActionLoadingId(userId);
    try {
      const res = await adminApi.updateUserStatus(userId, nextStatus);
      if (res.data.success) {
        toast.success(nextStatus ? 'Student account suspended' : 'Student account reactivated');
        setUsersList((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isBlocked: nextStatus } : u))
        );
        fetchOverview();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update account status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleCourseBlock = async (courseId: string, currentBlocked: boolean) => {
    const nextStatus = !currentBlocked;
    setActionLoadingId(courseId);
    try {
      const res = await adminApi.updateCourseStatus(courseId, nextStatus);
      if (res.data.success) {
        toast.success(nextStatus ? 'Course suspended' : 'Course restored');
        setCoursesList((prev) =>
          prev.map((c) => (c.id === courseId ? { ...c, isBlocked: nextStatus } : c))
        );
        fetchOverview();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update course status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error('Please enter current and new passwords.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long.');
      return;
    }

    setChangingPass(true);
    try {
      const res = await adminApi.changePassword({ currentPassword, newPassword });
      if (res.data.success) {
        toast.success('Admin password updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(res.data.message || 'Could not update password.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to change password.');
    } finally {
      setChangingPass(false);
    }
  };

  if (loading && !overview) {
    return (
      <div className="admin-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '42px',
            height: '42px',
            border: '3px solid rgba(99,102,241,0.2)',
            borderTopColor: '#6366F1',
            borderRadius: '50%',
            animation: 'adminPulse 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#FFFFFF' }}>Connecting to Operations Vault...</h3>
          <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: '#94A3B8' }}>
            Verifying isolated admin session & telemetry
          </p>
        </div>
      </div>
    );
  }

  const uStats = overview?.users || {};
  const aStats = overview?.activity || {};
  const tStats = overview?.telemetry || {};

  return (
    <div className="admin-shell admin-has-sidebar">
      <div className="admin-shell-glow" />
      <div className="admin-shell-glow-2" />

      {/* ─── Dedicated Admin Left Sidebar ─────────────────────────────── */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-brand-icon">
            <Shield size={20} />
          </div>
          <div className="admin-sidebar-brand">
            <h2>StudySync</h2>
            <span>Admin</span>
          </div>
        </div>

        <div className="admin-sidebar-status">
          <span className="admin-pulse-dot" />
          <span>Connected</span>
        </div>

        <nav className="admin-sidebar-nav">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`admin-nav-item ${activeTab === 'overview' ? 'active' : ''}`}
          >
            <Activity size={18} />
            <span>Dashboard</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
          >
            <Users size={18} />
            <span>Students</span>
            <span className="admin-nav-badge">{uStats.total || 0}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('courses')}
            className={`admin-nav-item ${activeTab === 'courses' ? 'active' : ''}`}
          >
            <BookOpen size={18} />
            <span>Courses</span>
            <span className="admin-nav-badge">{aStats.totalCourses || 0}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`admin-nav-item ${activeTab === 'ai' ? 'active' : ''}`}
          >
            <Cpu size={18} />
            <span>AI Quotas</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`admin-nav-item ${activeTab === 'security' ? 'active' : ''}`}
          >
            <Lock size={18} />
            <span>Security</span>
          </button>
        </nav>

        <div className="admin-sidebar-footer">
          {adminUser && (
            <div className="admin-sidebar-user" title={adminUser.email || adminUser.username}>
              <Key size={14} style={{ color: '#F59E0B', flexShrink: 0 }} />
              <span>{adminUser.username || adminUser.email}</span>
            </div>
          )}
          <button type="button" onClick={handleLogout} className="admin-sidebar-logout" title="Sign out">
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ─── Main Admin Workspace ─────────────────────────────────────── */}
      <div className="admin-main-wrap">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <h1 className="admin-page-title">
              {activeTab === 'overview' && 'Dashboard'}
              {activeTab === 'users' && 'Students'}
              {activeTab === 'courses' && 'Courses'}
              {activeTab === 'ai' && 'AI Quotas'}
              {activeTab === 'security' && 'Security'}
            </h1>
          </div>

          <div className="admin-topbar-actions">
            <button
              type="button"
              onClick={handleRefresh}
              className="admin-btn-primary"
              disabled={refreshing}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Syncing...' : 'Sync'}
            </button>
            <a
              href="https://supabase.com/dashboard/project/twluwkcduduvswmjvqfl"
              target="_blank"
              rel="noopener noreferrer"
              className="admin-btn-secondary"
            >
              <Database size={14} style={{ color: '#38BDF8' }} />
              <span>Cloud DB</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </header>

        <main className="admin-body">
          {/* ─── TAB 1: OVERVIEW & ANALYTICS ─────────────────────────────── */}
          {activeTab === 'overview' && (
            <div className="animate-fadeIn">
              {/* 8 KPI Metrics Grid with Punchy Labels */}
              <section className="admin-stats-grid" style={{ marginBottom: '24px' }}>
                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-label">Students</span>
                    <div className="admin-stat-icon indigo">
                      <Users size={19} />
                    </div>
                  </div>
                  <div className="admin-stat-value">{uStats.total || 0}</div>
                  <div className="admin-stat-subtext">
                    <strong style={{ color: '#34D399' }}>+{uStats.newThisWeek || 0}</strong> this week • {uStats.blocked || 0} suspended
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-label">Pro & Campus</span>
                    <div className="admin-stat-icon amber">
                      <Sparkles size={19} />
                    </div>
                  </div>
                  <div className="admin-stat-value">
                    {(uStats.planBreakdown?.pro || 0) + (uStats.planBreakdown?.campus || 0)}
                  </div>
                  <div className="admin-stat-subtext">
                    {uStats.planBreakdown?.free || 0} on Free
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-label">Courses</span>
                    <div className="admin-stat-icon cyan">
                      <BookOpen size={19} />
                    </div>
                  </div>
                  <div className="admin-stat-value">{aStats.totalCourses || 0}</div>
                  <div className="admin-stat-subtext">
                    {aStats.blockedCourses || 0} suspended • {aStats.totalMaterials || 0} materials
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-label">Storage</span>
                    <div className="admin-stat-icon indigo">
                      <HardDrive size={19} />
                    </div>
                  </div>
                  <div className="admin-stat-value">
                    {tStats.totalUploadMB || 0} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>MB</span>
                  </div>
                  <div className="admin-stat-subtext">
                    {tStats.totalUploadedFiles || aStats.totalMaterials || 0} files uploaded
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-label">System AI</span>
                    <div className="admin-stat-icon amber">
                      <Zap size={19} />
                    </div>
                  </div>
                  <div className="admin-stat-value">{tStats.totalSystemAiCalls || 0}</div>
                  <div className="admin-stat-subtext">
                    3 msgs / user limit
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-label">WhatsApp</span>
                    <div className="admin-stat-icon emerald">
                      <MessageSquare size={19} />
                    </div>
                  </div>
                  <div className="admin-stat-value">{tStats.totalWhatsAppSent || 0}</div>
                  <div className="admin-stat-subtext">
                    Total alerts sent
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-label">Emails</span>
                    <div className="admin-stat-icon cyan">
                      <Mail size={19} />
                    </div>
                  </div>
                  <div className="admin-stat-value">{tStats.totalEmailsSent || 0}</div>
                  <div className="admin-stat-subtext">
                    Total alerts sent
                  </div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-label">Chat Queries</span>
                    <div className="admin-stat-icon emerald">
                      <Cpu size={19} />
                    </div>
                  </div>
                  <div className="admin-stat-value">{aStats.totalChatMessages || 0}</div>
                  <div className="admin-stat-subtext">
                    {uStats.aiModeBreakdown?.byok || 0} BYOK • {uStats.aiModeBreakdown?.system || 0} System
                  </div>
                </div>
              </section>
            <div className="admin-grid-2">
              <div className="admin-card-section">
                <h3>Plans</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                      <span style={{ color: '#64748B' }}>Free Trial (1 Course)</span>
                      <strong>{(uStats.planBreakdown?.trial ?? uStats.planBreakdown?.free) || 0} students</strong>
                    </div>
                    <div style={{ height: '8px', background: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        background: '#94A3B8',
                        width: `${(((uStats.planBreakdown?.trial ?? uStats.planBreakdown?.free) || 0) / Math.max(uStats.total || 1, 1)) * 100}%`
                      }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                      <span style={{ color: '#0284C7' }}>Plus (Rs. 1,000/mo)</span>
                      <strong style={{ color: '#0284C7' }}>{uStats.planBreakdown?.plus || 0} students</strong>
                    </div>
                    <div style={{ height: '8px', background: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        background: '#0284C7',
                        width: `${((uStats.planBreakdown?.plus || 0) / Math.max(uStats.total || 1, 1)) * 100}%`
                      }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                      <span style={{ color: '#4F46E5' }}>Pro (Rs. 2,000/mo)</span>
                      <strong style={{ color: '#4F46E5' }}>{uStats.planBreakdown?.pro || 0} students</strong>
                    </div>
                    <div style={{ height: '8px', background: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        background: '#4F46E5',
                        width: `${((uStats.planBreakdown?.pro || 0) / Math.max(uStats.total || 1, 1)) * 100}%`
                      }} />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                      <span style={{ color: '#D97706' }}>Campus (Rs. 4,500/mo)</span>
                      <strong style={{ color: '#D97706' }}>{uStats.planBreakdown?.campus || 0} students</strong>
                    </div>
                    <div style={{ height: '8px', background: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        background: '#D97706',
                        width: `${((uStats.planBreakdown?.campus || 0) / Math.max(uStats.total || 1, 1)) * 100}%`
                      }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="admin-card-section">
                <h3>AI Models</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                  <div style={{ padding: '14px 16px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid var(--admin-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                      <Zap size={16} style={{ color: '#D97706' }} />
                      Server System Key
                    </span>
                    <span className="admin-pill plan-pro">{uStats.aiModeBreakdown?.system || 0} users</span>
                  </div>

                  <div style={{ padding: '14px 16px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid var(--admin-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                      <Key size={16} style={{ color: '#0284C7' }} />
                      BYOK Custom Keys
                    </span>
                    <span className="admin-pill plan-campus">{uStats.aiModeBreakdown?.byok || 0} users</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Signups */}
            <div className="admin-card-section">
              <h3>Recent Students</h3>
              <div className="admin-table-wrapper" style={{ marginBottom: 0, marginTop: '14px' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Plan</th>
                      <th>AI Mode</th>
                      <th>Registered</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(overview?.recentSignups || []).map((s: any) => (
                      <tr key={s.id}>
                        <td>
                          <div className="admin-user-cell">
                            <div className="admin-user-avatar">
                              {s.fullName?.[0]?.toUpperCase() || 'S'}
                            </div>
                            <div className="admin-user-info">
                              <h4>{s.fullName}</h4>
                              <p>{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`admin-pill plan-${s.plan || 'free'}`}>
                            {s.plan || 'free'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem', color: '#64748B', fontWeight: 600 }}>
                            {s.aiProviderPreference === 'byok' ? 'Custom BYOK' : 'System Key'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                            {new Date(s.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td>
                          <span className={`admin-pill ${s.isBlocked ? 'status-blocked' : 'status-active'}`}>
                            {s.isBlocked ? 'Suspended' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 2: STUDENT DIRECTORY ─────────────────────────────────── */}
        {activeTab === 'users' && (
          <div className="animate-fadeIn">
            {/* ⚡ Instant WhatsApp Desks: Plan Upgrades & Extra Courses */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              {/* Desk 1: Subscription Plan Upgrade */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #F0FDF4 0%, #EEF2FF 100%)',
                  border: '1px solid #BBF7D0',
                  borderRadius: '14px',
                  padding: '16px 20px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '8px',
                      background: '#16A34A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFF',
                      flexShrink: 0,
                    }}
                  >
                    <MessageSquare size={16} />
                  </div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>
                    Instant Plan Upgrade
                  </h4>
                </div>

                <form onSubmit={handleDirectEmailUpgrade} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="email"
                    placeholder="Student email..."
                    value={upgradeEmail}
                    onChange={(e) => setUpgradeEmail(e.target.value)}
                    className="admin-input-search"
                    style={{
                      flex: '1 1 200px',
                      minWidth: '170px',
                      background: '#FFFFFF',
                      border: '1px solid var(--admin-border)',
                    }}
                  />

                  <select
                    value={upgradePlan}
                    onChange={(e) => setUpgradePlan(e.target.value as any)}
                    className="admin-select"
                    style={{ flex: '0 0 auto', minWidth: '150px' }}
                  >
                    <option value="trial">Free Trial (1 Crs)</option>
                    <option value="plus">Plus (5 Crs)</option>
                    <option value="pro">Pro (10 Crs)</option>
                    <option value="campus">Campus (25 Crs)</option>
                  </select>

                  <button
                    type="submit"
                    disabled={isUpgradingEmail}
                    className="admin-btn-primary"
                    style={{
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      borderColor: '#059669',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {isUpgradingEmail ? (
                      <>
                        <RefreshCw size={14} className="admin-spin" /> Upgrading...
                      </>
                    ) : (
                      <>
                        <CheckCircle size={14} /> Upgrade Plan
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* Desk 2: Instant Extra Courses Grant (WhatsApp Rs. 100) */}
              <div
                style={{
                  background: 'linear-gradient(135deg, #FAF5FF 0%, #F5F3FF 100%)',
                  border: '1px solid #E9D5FF',
                  borderRadius: '14px',
                  padding: '16px 20px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '8px',
                      background: '#7C3AED',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFF',
                      flexShrink: 0,
                    }}
                  >
                    <BookOpen size={16} />
                  </div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>
                    Grant Extra Course (Rs. 100 WhatsApp)
                  </h4>
                </div>

                <form onSubmit={handleDirectBonusEmail} style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="email"
                    placeholder="Student email..."
                    value={bonusEmail}
                    onChange={(e) => setBonusEmail(e.target.value)}
                    className="admin-input-search"
                    style={{
                      flex: '1 1 200px',
                      minWidth: '170px',
                      background: '#FFFFFF',
                      border: '1px solid var(--admin-border)',
                    }}
                  />

                  <select
                    value={bonusCount}
                    onChange={(e) => setBonusCount(Number(e.target.value))}
                    className="admin-select"
                    style={{ flex: '0 0 auto', minWidth: '110px' }}
                  >
                    <option value={1}>+1 Course</option>
                    <option value={2}>+2 Courses</option>
                    <option value={3}>+3 Courses</option>
                    <option value={5}>+5 Courses</option>
                  </select>

                  <button
                    type="submit"
                    disabled={isAddingBonusEmail}
                    className="admin-btn-primary"
                    style={{
                      background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                      borderColor: '#6D28D9',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    {isAddingBonusEmail ? (
                      <>
                        <RefreshCw size={14} className="admin-spin" /> Adding...
                      </>
                    ) : (
                      <>
                        <Zap size={14} /> Add Extra
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            <div className="admin-control-bar">
              <div className="admin-search-wrap">
                <Search className="admin-search-icon" size={17} />
                <input
                  type="text"
                  placeholder="Search students..."
                  className="admin-input-search"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchUsers(1)}
                />
              </div>

              <div className="admin-filter-group">
                <select
                  aria-label="Filter students by billing plan"
                  className="admin-select"
                  value={userPlanFilter}
                  onChange={(e) => setUserPlanFilter(e.target.value)}
                >
                  <option value="all">All Plans</option>
                  <option value="trial">Free Trial</option>
                  <option value="plus">Plus</option>
                  <option value="pro">Pro</option>
                  <option value="campus">Campus</option>
                </select>

                <select
                  aria-label="Filter students by status"
                  className="admin-select"
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="blocked">Suspended</option>
                </select>

                <button
                  type="button"
                  onClick={() => fetchUsers(1)}
                  className="admin-btn-secondary"
                >
                  Apply
                </button>
              </div>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Plan</th>
                    <th>Courses & Files</th>
                    <th>System AI</th>
                    <th>WhatsApp</th>
                    <th>Emails</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                        No students found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    usersList.map((u) => {
                      const normPlan = u.plan === 'free' ? 'trial' : (u.plan || 'trial');
                      const baseMaxCourses = normPlan === 'pro' ? 10 : normPlan === 'plus' ? 5 : normPlan === 'campus' ? 25 : 1;
                      const bonusCourses = u.bonusCourses || 0;
                      const effectiveMaxCourses = baseMaxCourses + bonusCourses;
                      const maxMB = normPlan === 'pro' ? 150 : normPlan === 'plus' ? 50 : normPlan === 'campus' ? 500 : 10;
                      const courseCount = u.coursesCount || 0;
                      const uploadMB = u.uploads?.totalMB || 0;
                      const uploadFiles = u.uploads?.filesCount || 0;
                      const systemUsed = u.systemAiUsage?.used || 0;
                      const isByok = Boolean(u.systemAiUsage?.isByok || u.aiProviderPreference === 'byok');

                      return (
                        <tr key={u.id}>
                          {/* 1. Student Name & Email */}
                          <td>
                            <div className="admin-user-cell">
                              <div className="admin-user-avatar">
                                {u.fullName?.[0]?.toUpperCase() || 'S'}
                              </div>
                              <div className="admin-user-info">
                                <h4>{u.fullName}</h4>
                                <p>{u.email}</p>
                                {u.university && (
                                  <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                    {u.university} {u.major ? `• ${u.major}` : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* 2. Plan Management Dropdown */}
                          <td>
                            <select
                              aria-label={`Change billing plan for ${u.fullName}`}
                              className="admin-select"
                              style={{ fontSize: '0.78rem', padding: '6px 8px' }}
                              value={normPlan}
                              disabled={actionLoadingId === u.id}
                              onChange={(e) => handlePlanChange(u.id, e.target.value)}
                            >
                              <option value="trial">Free Trial (1 Crs • 10MB)</option>
                              <option value="plus">StudySync Plus (5 Crs • 50MB)</option>
                              <option value="pro">StudySync Pro (10 Crs • 150MB)</option>
                              <option value="campus">Campus Enterprise (25 Crs • 500MB)</option>
                            </select>
                          </td>

                          {/* 3. Courses & Uploads with +1 Increment Button */}
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: courseCount >= effectiveMaxCourses ? '#DC2626' : '#0F172A' }}>
                                  {courseCount} / {effectiveMaxCourses} Crs
                                </span>
                                {bonusCourses > 0 && (
                                  <span className="admin-bonus-badge" title={`${bonusCourses} bonus courses granted by admin`}>
                                    +{bonusCourses} Bonus
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleAddBonusCourses(u.id, 1)}
                                  disabled={actionLoadingId === u.id}
                                  className="admin-btn-bonus"
                                  title="Add +1 course limit for this student"
                                >
                                  {actionLoadingId === u.id ? '...' : '+1 Crs'}
                                </button>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span className="telemetry-chip storage-ok" title={`${uploadFiles} files uploaded`}>
                                  <HardDrive size={11} /> {uploadMB} / {maxMB} MB
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* 4. System AI Quota */}
                          <td>
                            {isByok ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span className="telemetry-chip ai-byok">
                                  <Key size={11} /> BYOK Active
                                </span>
                                <span style={{ fontSize: '0.7rem', color: '#15803D', fontWeight: 600 }}>
                                  {u.systemAiUsage?.provider || u.activeByokProvider || 'Groq / Gemini'}
                                </span>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {systemUsed >= 3 ? (
                                  <span className="telemetry-chip ai-quota-blocked" title="Limit reached: User must provide personal API key">
                                    <Zap size={11} /> 3/3 Limit Reached
                                  </span>
                                ) : (
                                  <span className={systemUsed > 0 ? "telemetry-chip ai-quota-warning" : "telemetry-chip ai-quota-ok"}>
                                    <Zap size={11} /> {systemUsed} / 3 Used ({3 - systemUsed} left)
                                  </span>
                                )}
                                <span style={{ fontSize: '0.7rem', color: '#64748B' }}>
                                  Server AI Pool
                                </span>
                              </div>
                            )}
                          </td>

                          {/* 5. WhatsApp Integration */}
                          <td>
                            {u.whatsapp?.isIntegrated || u.whatsappNumber ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span className="telemetry-chip wa-linked">
                                  <MessageSquare size={11} /> Linked
                                </span>
                                <span style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 600 }}>
                                  {u.whatsapp?.messagesSent || 0} msgs sent
                                </span>
                                <span style={{ fontSize: '0.68rem', color: '#64748B' }}>
                                  {u.whatsapp?.number || u.whatsappNumber}
                                </span>
                              </div>
                            ) : (
                              <span className="telemetry-chip wa-none">
                                Not Linked
                              </span>
                            )}
                          </td>

                          {/* 6. Emails Sent */}
                          <td>
                            <span className="telemetry-chip email-chip" title="Total notification and reminder emails sent">
                              <Mail size={11} /> {u.emails?.sentCount || 0} sent
                            </span>
                          </td>

                          {/* 7. Status */}
                          <td>
                            <span className={`admin-pill ${u.isBlocked ? 'status-blocked' : 'status-active'}`}>
                              {u.isBlocked ? 'Suspended' : 'Active'}
                            </span>
                          </td>

                          {/* 8. Actions */}
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                onClick={() => setSelectedUserForModal(u)}
                                className="admin-btn-secondary"
                                style={{ padding: '6px 9px', fontSize: '0.75rem', gap: '4px' }}
                                title="View 360° telemetry details"
                              >
                                <Eye size={13} />
                                360°
                              </button>
                              <button
                                onClick={() => handleToggleUserBlock(u.id, !!u.isBlocked)}
                                disabled={actionLoadingId === u.id}
                                className={`admin-btn-action ${u.isBlocked ? 'reactivate' : 'suspend'}`}
                              >
                                {u.isBlocked ? (
                                  <>
                                    <UserCheck size={13} />
                                    Reactivate
                                  </>
                                ) : (
                                  <>
                                    <UserX size={13} />
                                    Suspend
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="admin-pagination">
                <span>
                  Showing {usersList.length} of {usersPagination.total} registered students
                </span>
                <div className="admin-pagination-btns">
                  <button
                    className="admin-page-btn"
                    disabled={usersPagination.page <= 1}
                    onClick={() => fetchUsers(usersPagination.page - 1)}
                  >
                    Previous
                  </button>
                  <span style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#475569' }}>
                    Page {usersPagination.page} of {usersPagination.totalPages}
                  </span>
                  <button
                    className="admin-page-btn"
                    disabled={usersPagination.page >= usersPagination.totalPages}
                    onClick={() => fetchUsers(usersPagination.page + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            {/* ─── 360° User Telemetry Modal ─── */}
            {selectedUserForModal && (
              <div className="admin-modal-overlay" onClick={() => setSelectedUserForModal(null)}>
                <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
                  <div className="admin-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="admin-user-avatar" style={{ width: '42px', height: '42px', fontSize: '1.1rem' }}>
                        {selectedUserForModal.fullName?.[0]?.toUpperCase() || 'S'}
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0F172A', fontWeight: 800 }}>
                          {selectedUserForModal.fullName}
                        </h3>
                        <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                          {selectedUserForModal.email} • Plan: <strong style={{ color: '#4F46E5', textTransform: 'uppercase' }}>{selectedUserForModal.plan}</strong>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedUserForModal(null)}
                      className="admin-btn-icon-close"
                      title="Close modal"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="admin-modal-body">
                    {/* 4 Cards Overview in Grid */}
                    <div className="admin-modal-grid">
                      {/* Card 1: System AI & BYOK */}
                      <div className="admin-modal-metric-card">
                        <div className="card-head">
                          <span>System AI Usage</span>
                          <Zap size={16} style={{ color: selectedUserForModal.systemAiUsage?.isByok ? '#16A34A' : '#D97706' }} />
                        </div>
                        <div className="card-val">
                          {selectedUserForModal.systemAiUsage?.isByok ? (
                            <span style={{ color: '#16A34A', fontSize: '1.1rem' }}>BYOK Active</span>
                          ) : (
                            `${selectedUserForModal.systemAiUsage?.used || 0} / 3 Msgs`
                          )}
                        </div>
                        <div className="card-desc">
                          {selectedUserForModal.systemAiUsage?.isByok ? (
                            `Using custom BYOK key (${selectedUserForModal.systemAiUsage?.provider || selectedUserForModal.activeByokProvider || 'Active'}). Unlimited queries at $0 cost to server.`
                          ) : (selectedUserForModal.systemAiUsage?.used || 0) >= 3 ? (
                            <strong style={{ color: '#DC2626' }}>Quota Exhausted (3/3). Chatbot prompts student to attach their personal Gemini/Groq key.</strong>
                          ) : (
                            `Server pool active. ${3 - (selectedUserForModal.systemAiUsage?.used || 0)} free trial system messages left.`
                          )}
                        </div>
                      </div>

                      {/* Card 2: Uploads & Storage */}
                      <div className="admin-modal-metric-card">
                        <div className="card-head">
                          <span>Total Uploads</span>
                          <HardDrive size={16} style={{ color: '#4F46E5' }} />
                        </div>
                        <div className="card-val">
                          {selectedUserForModal.uploads?.totalMB || 0} <span style={{ fontSize: '0.9rem' }}>MB</span>
                        </div>
                        <div className="card-desc">
                          {selectedUserForModal.uploads?.filesCount || 0} files uploaded across courses.
                          Plan storage limit: {
                            selectedUserForModal.plan === 'pro' ? '150 MB' :
                            selectedUserForModal.plan === 'plus' ? '50 MB' :
                            selectedUserForModal.plan === 'campus' ? '500 MB' : '10 MB'
                          }.
                        </div>
                      </div>

                      {/* Card 3: WhatsApp Automation */}
                      <div className="admin-modal-metric-card">
                        <div className="card-head">
                          <span>WhatsApp Status</span>
                          <MessageSquare size={16} style={{ color: selectedUserForModal.whatsapp?.isIntegrated ? '#16A34A' : '#94A3B8' }} />
                        </div>
                        <div className="card-val">
                          {selectedUserForModal.whatsapp?.messagesSent || 0} <span style={{ fontSize: '0.9rem' }}>Msgs</span>
                        </div>
                        <div className="card-desc">
                          {selectedUserForModal.whatsapp?.isIntegrated || selectedUserForModal.whatsappNumber ? (
                            `Linked: ${selectedUserForModal.whatsapp?.number || selectedUserForModal.whatsappNumber}. Receiving automated reminders.`
                          ) : (
                            'WhatsApp is not connected or linked for this student.'
                          )}
                        </div>
                      </div>

                      {/* Card 4: Email Communications */}
                      <div className="admin-modal-metric-card">
                        <div className="card-head">
                          <span>Emails Sent</span>
                          <Mail size={16} style={{ color: '#0284C7' }} />
                        </div>
                        <div className="card-val">
                          {selectedUserForModal.emails?.sentCount || 0} <span style={{ fontSize: '0.9rem' }}>Sent</span>
                        </div>
                        <div className="card-desc">
                          Total study digest, deadline reminders, and upgrade confirmation emails dispatched.
                        </div>
                      </div>
                    </div>

                    {/* Course & Activity Summary */}
                    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px' }}>
                      <h4 style={{ margin: '0 0 10px', fontSize: '0.85rem', color: '#0F172A', fontWeight: 700 }}>
                        Student Activity & Academic Overview
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Courses Created</span>
                          <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>
                            {selectedUserForModal.coursesCount || 0} / {
                              selectedUserForModal.plan === 'pro' ? 10 :
                              selectedUserForModal.plan === 'plus' ? 5 :
                              selectedUserForModal.plan === 'campus' ? 25 : 1
                            }
                          </p>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Tasks Generated</span>
                          <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>
                            {selectedUserForModal.tasksCount || 0}
                          </p>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Chat Queries</span>
                          <p style={{ margin: '2px 0 0', fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>
                            {selectedUserForModal.chatMessagesCount || 0}
                          </p>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Account Status</span>
                          <p style={{ margin: '2px 0 0' }}>
                            <span className={`admin-pill ${selectedUserForModal.isBlocked ? 'status-blocked' : 'status-active'}`}>
                              {selectedUserForModal.isBlocked ? 'Suspended' : 'Active'}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Quick Admin Actions inside Modal */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>Change Plan:</span>
                        <select
                          className="admin-select"
                          style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                          value={selectedUserForModal.plan === 'free' ? 'trial' : (selectedUserForModal.plan || 'trial')}
                          onChange={(e) => {
                            handlePlanChange(selectedUserForModal.id, e.target.value);
                            setSelectedUserForModal((prev: any) => ({ ...prev, plan: e.target.value }));
                          }}
                        >
                          <option value="trial">Free Trial (1 Crs • 10MB)</option>
                          <option value="plus">StudySync Plus (5 Crs • 50MB)</option>
                          <option value="pro">StudySync Pro (10 Crs • 150MB)</option>
                          <option value="campus">Campus Enterprise (25 Crs • 500MB)</option>
                        </select>
                      </div>

                      <button
                        onClick={() => {
                          handleToggleUserBlock(selectedUserForModal.id, !!selectedUserForModal.isBlocked);
                          setSelectedUserForModal((prev: any) => ({ ...prev, isBlocked: !prev.isBlocked }));
                        }}
                        className={`admin-btn-action ${selectedUserForModal.isBlocked ? 'reactivate' : 'suspend'}`}
                      >
                        {selectedUserForModal.isBlocked ? (
                          <>
                            <UserCheck size={14} /> Reactivate Account
                          </>
                        ) : (
                          <>
                            <UserX size={14} /> Suspend Account
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: COURSE MODERATION ─────────────────────────────────── */}
        {activeTab === 'courses' && (
          <div className="animate-fadeIn">
            <div className="admin-control-bar">
              <div className="admin-search-wrap">
                <Search className="admin-search-icon" size={17} />
                <input
                  type="text"
                  placeholder="Search courses by code or title..."
                  className="admin-input-search"
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchCourses(1)}
                />
              </div>

              <div className="admin-filter-group">
                <select
                  aria-label="Filter courses by moderation status"
                  className="admin-select"
                  value={courseStatusFilter}
                  onChange={(e) => setCourseStatusFilter(e.target.value)}
                >
                  <option value="all">All Courses</option>
                  <option value="active">Active Only</option>
                  <option value="blocked">Suspended Only</option>
                </select>

                <button
                  onClick={() => fetchCourses(1)}
                  className="admin-btn-secondary"
                >
                  Apply Filters
                </button>
              </div>
            </div>

            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Instructor & Owner</th>
                    <th>Materials</th>
                    <th>Chats</th>
                    <th>Created</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Moderation</th>
                  </tr>
                </thead>
                <tbody>
                  {coursesList.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#94A3B8' }}>
                        No courses found.
                      </td>
                    </tr>
                  ) : (
                    coursesList.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <div>
                            <span style={{ fontWeight: 700, color: '#38BDF8', fontSize: '0.85rem' }}>
                              {c.code}
                            </span>
                            <h4 style={{ margin: '2px 0 0', fontSize: '0.88rem', color: '#0F172A' }}>
                              {c.title}
                            </h4>
                          </div>
                        </td>
                        <td>
                          <div>
                            <span style={{ color: '#0F172A' }}>{c.instructor || 'Not specified'}</span>
                            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#94A3B8' }}>
                              Owner: {c.user?.fullName || c.user?.email || 'Student'}
                            </p>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{c.materialsCount || 0}</span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{c.chatsCount || 0}</span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                            {new Date(c.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td>
                          <span className={`admin-pill ${c.isBlocked ? 'status-blocked' : 'status-active'}`}>
                            {c.isBlocked ? 'Suspended' : 'Active'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleToggleCourseBlock(c.id, !!c.isBlocked)}
                            disabled={actionLoadingId === c.id}
                            className={`admin-btn-action ${c.isBlocked ? 'reactivate' : 'suspend'}`}
                          >
                            {c.isBlocked ? (
                              <>
                                <CheckCircle size={14} />
                                Restore Course
                              </>
                            ) : (
                              <>
                                <ShieldAlert size={14} />
                                Suspend Course
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="admin-pagination">
                <span>
                  Showing {coursesList.length} of {coursesPagination.total} courses
                </span>
                <div className="admin-pagination-btns">
                  <button
                    className="admin-page-btn"
                    disabled={coursesPagination.page <= 1}
                    onClick={() => fetchCourses(coursesPagination.page - 1)}
                  >
                    Previous
                  </button>
                  <span style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#475569' }}>
                    Page {coursesPagination.page} of {coursesPagination.totalPages}
                  </span>
                  <button
                    className="admin-page-btn"
                    disabled={coursesPagination.page >= coursesPagination.totalPages}
                    onClick={() => fetchCourses(coursesPagination.page + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 4: AI & BYOK QUOTAS ─────────────────────────────────── */}
        {activeTab === 'ai' && (
          <div className="animate-fadeIn">
            {aiUsage && (
              <div className="admin-stats-grid" style={{ marginBottom: '24px' }}>
                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-label">System Key Consumers</span>
                    <div className="admin-stat-icon amber">
                      <Zap size={19} />
                    </div>
                  </div>
                  <div className="admin-stat-value">{aiUsage.userPreferences?.system || 0}</div>
                  <div className="admin-stat-subtext">Students relying on server AI keys</div>
                </div>

                <div className="admin-stat-card">
                  <div className="admin-stat-top">
                    <span className="admin-stat-label">BYOK Custom Keys</span>
                    <div className="admin-stat-icon cyan">
                      <Key size={19} />
                    </div>
                  </div>
                  <div className="admin-stat-value">{aiUsage.keysRegistered?.total || 0}</div>
                  <div className="admin-stat-subtext">
                    Gemini: {aiUsage.keysRegistered?.gemini || 0} • Groq: {aiUsage.keysRegistered?.groq || 0} • OpenAI: {aiUsage.keysRegistered?.openai || 0}
                  </div>
                </div>
              </div>
            )}

            <div className="admin-card-section">
              <h3>AI Quotas</h3>

              <div className="admin-grid-2" style={{ marginTop: '16px' }}>
                <div className="admin-quota-tier">
                  <h4>
                    <span>Free / Trial</span>
                    <span className="admin-pill plan-free">Rs. 0</span>
                  </h4>
                  <ul className="admin-quota-list">
                    <li>
                      <span>System AI Pool:</span>
                      <span>3 Free Messages</span>
                    </li>
                    <li>
                      <span>Allowed Courses:</span>
                      <span>1 course max</span>
                    </li>
                    <li>
                      <span>Material Uploads:</span>
                      <span>10 MB max</span>
                    </li>
                    <li>
                      <span>BYOK Custom Keys:</span>
                      <span style={{ color: '#10B981' }}>Gemini / Groq</span>
                    </li>
                  </ul>
                </div>

                <div className="admin-quota-tier" style={{ borderColor: 'rgba(59,130,246,0.4)' }}>
                  <h4>
                    <span>Plus</span>
                    <span className="admin-pill" style={{ background: '#DBEAFE', color: '#1E40AF' }}>Rs. 1,000 / mo</span>
                  </h4>
                  <ul className="admin-quota-list">
                    <li>
                      <span>Allowed Courses:</span>
                      <span>5 courses max</span>
                    </li>
                    <li>
                      <span>Material Uploads:</span>
                      <span>50 MB max</span>
                    </li>
                    <li>
                      <span>WhatsApp Alerts:</span>
                      <span>Automated Baileys</span>
                    </li>
                    <li>
                      <span>BYOK Custom Keys:</span>
                      <span style={{ color: '#10B981' }}>Unlimited Chat</span>
                    </li>
                  </ul>
                </div>

                <div className="admin-quota-tier" style={{ borderColor: 'rgba(99,102,241,0.4)' }}>
                  <h4>
                    <span>Pro</span>
                    <span className="admin-pill plan-pro">Rs. 2,000 / mo</span>
                  </h4>
                  <ul className="admin-quota-list">
                    <li>
                      <span>Allowed Courses:</span>
                      <span>10 courses (Extra: Rs. 100)</span>
                    </li>
                    <li>
                      <span>Material Uploads:</span>
                      <span>150 MB max</span>
                    </li>
                    <li>
                      <span>BYOK Multi-Model:</span>
                      <span style={{ color: '#10B981' }}>Gemini, Groq, OpenAI</span>
                    </li>
                    <li>
                      <span>WhatsApp Bot:</span>
                      <span>Full Baileys Bot</span>
                    </li>
                  </ul>
                </div>

                <div className="admin-quota-tier" style={{ borderColor: 'rgba(245,158,11,0.4)' }}>
                  <h4>
                    <span>Campus</span>
                    <span className="admin-pill plan-campus">Rs. 4,500 / mo</span>
                  </h4>
                  <ul className="admin-quota-list">
                    <li>
                      <span>Allowed Courses:</span>
                      <span>25 courses (Extra: Rs. 100)</span>
                    </li>
                    <li>
                      <span>Material Uploads:</span>
                      <span>200 MB max</span>
                    </li>
                    <li>
                      <span>Capacity:</span>
                      <span>Department / Batch</span>
                    </li>
                    <li>
                      <span>BYOK Custom Keys:</span>
                      <span style={{ color: '#10B981' }}>Supported</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 5: SECURITY & CREDENTIALS ───────────────────────────── */}
        {activeTab === 'security' && (
          <div className="animate-fadeIn">
            <div className="admin-card-section" style={{ maxWidth: '520px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <KeyRound size={20} style={{ color: '#F59E0B' }} />
                <h3 style={{ margin: 0 }}>Update Password</h3>
              </div>

              <form onSubmit={handleChangeAdminPassword}>
                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="current-pass">Current Password</label>
                  <input
                    id="current-pass"
                    type="password"
                    className="admin-form-input"
                    style={{ paddingLeft: '14px' }}
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="new-pass">New Password</label>
                  <input
                    id="new-pass"
                    type="password"
                    className="admin-form-input"
                    style={{ paddingLeft: '14px' }}
                    placeholder="Min 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label" htmlFor="confirm-pass">Confirm Password</label>
                  <input
                    id="confirm-pass"
                    type="password"
                    className="admin-form-input"
                    style={{ paddingLeft: '14px' }}
                    placeholder="Repeat new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="admin-btn-primary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: '10px' }}
                  disabled={changingPass}
                >
                  <Lock size={16} />
                  {changingPass ? 'Updating...' : 'Save Password'}
                </button>
              </form>
            </div>
          </div>
        )}
        </main>
      </div>

      {/* ─── 360° Student Telemetry & Quota Modal ──────────────────────── */}
      {selectedUserForModal && (() => {
        const u = selectedUserForModal;
        const normPlan = u.plan === 'free' ? 'trial' : (u.plan || 'trial');
        const baseMax = normPlan === 'pro' ? 10 : normPlan === 'plus' ? 5 : normPlan === 'campus' ? 25 : 1;
        const bonus = u.bonusCourses || 0;
        const effectiveMax = baseMax + bonus;
        const courseCount = u.coursesCount || 0;

        return (
          <div className="admin-modal-backdrop" onClick={() => setSelectedUserForModal(null)}>
            <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="admin-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="admin-user-avatar" style={{ width: '40px', height: '40px', fontSize: '1.1rem' }}>
                    {u.fullName?.[0]?.toUpperCase() || 'S'}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0F172A' }}>{u.fullName}</h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>{u.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUserForModal(null)}
                  className="admin-btn-secondary"
                  style={{ padding: '6px', borderRadius: '50%' }}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="admin-modal-body">
                {/* Course Quota & Bonus Increments */}
                <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid var(--admin-border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>Course Limit & Capacity</span>
                    <span style={{ fontWeight: 800, fontSize: '1.05rem', color: '#4F46E5' }}>
                      {courseCount} / {effectiveMax} Courses
                    </span>
                  </div>
                  <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#64748B' }}>
                    Plan base limit: <strong>{baseMax}</strong> courses. Bonus courses granted by Admin: <strong style={{ color: '#7E22CE' }}>+{bonus}</strong>.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>Grant Extra:</span>
                    <button
                      type="button"
                      disabled={actionLoadingId === u.id}
                      onClick={() => handleAddBonusCourses(u.id, 1)}
                      className="admin-btn-bonus"
                      style={{ padding: '5px 12px', fontSize: '0.8rem' }}
                    >
                      +1 Course
                    </button>
                    <button
                      type="button"
                      disabled={actionLoadingId === u.id}
                      onClick={() => handleAddBonusCourses(u.id, 2)}
                      className="admin-btn-bonus"
                      style={{ padding: '5px 12px', fontSize: '0.8rem' }}
                    >
                      +2 Courses
                    </button>
                    <button
                      type="button"
                      disabled={actionLoadingId === u.id}
                      onClick={() => handleAddBonusCourses(u.id, 5)}
                      className="admin-btn-bonus"
                      style={{ padding: '5px 12px', fontSize: '0.8rem' }}
                    >
                      +5 Courses
                    </button>
                  </div>
                </div>

                {/* Grid Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid var(--admin-border)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Subscription Plan</span>
                    <div style={{ marginTop: '6px' }}>
                      <select
                        className="admin-select"
                        style={{ width: '100%', fontSize: '0.82rem' }}
                        value={normPlan}
                        disabled={actionLoadingId === u.id}
                        onChange={(e) => {
                          handlePlanChange(u.id, e.target.value);
                          setSelectedUserForModal((prev: any) => ({ ...prev, plan: e.target.value }));
                        }}
                      >
                        <option value="trial">Free Trial (1 Crs • 10MB)</option>
                        <option value="plus">StudySync Plus (5 Crs • 50MB)</option>
                        <option value="pro">StudySync Pro (10 Crs • 150MB)</option>
                        <option value="campus">Campus Enterprise (25 Crs • 500MB)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid var(--admin-border)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Account Status</span>
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`admin-pill ${u.isBlocked ? 'status-blocked' : 'status-active'}`}>
                        {u.isBlocked ? 'Suspended' : 'Active'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          handleToggleUserBlock(u.id, !!u.isBlocked);
                          setSelectedUserForModal((prev: any) => ({ ...prev, isBlocked: !prev.isBlocked }));
                        }}
                        className={`admin-btn-action ${u.isBlocked ? 'reactivate' : 'suspend'}`}
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        {u.isBlocked ? 'Reactivate' : 'Suspend'}
                      </button>
                    </div>
                  </div>

                  <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid var(--admin-border)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>AI Provider / Mode</span>
                    <div style={{ marginTop: '4px', fontWeight: 600, fontSize: '0.88rem', color: '#0F172A' }}>
                      {u.aiProviderPreference === 'byok' ? `BYOK (${u.activeByokProvider || 'Gemini/Groq'})` : 'System AI Pool'}
                    </div>
                  </div>

                  <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid var(--admin-border)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Storage Used</span>
                    <div style={{ marginTop: '4px', fontWeight: 600, fontSize: '0.88rem', color: '#0F172A' }}>
                      {u.uploads?.totalMB || 0} MB ({u.uploads?.filesCount || 0} files)
                    </div>
                  </div>

                  <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid var(--admin-border)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>WhatsApp Integration</span>
                    <div style={{ marginTop: '4px', fontWeight: 600, fontSize: '0.88rem', color: '#0F172A' }}>
                      {u.whatsapp?.isIntegrated || u.whatsappNumber ? `Linked (${u.whatsappNumber || u.whatsapp?.number})` : 'Not Linked'}
                    </div>
                  </div>

                  <div style={{ padding: '12px', background: '#F8FAFC', borderRadius: '10px', border: '1px solid var(--admin-border)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748B' }}>Academic Profile</span>
                    <div style={{ marginTop: '4px', fontWeight: 600, fontSize: '0.85rem', color: '#0F172A' }}>
                      {u.university || 'N/A'} {u.major ? `(${u.major})` : ''}
                    </div>
                  </div>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  onClick={() => setSelectedUserForModal(null)}
                  className="admin-btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
