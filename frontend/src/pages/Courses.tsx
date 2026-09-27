import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  CheckCircle2,
  Clock,
  Trash2,
  Bot,
  X,
  Calendar,
  Search,
  BookOpen,
  Upload,
  Sparkles,
  AlertCircle,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { coursesApi, tasksApi, authApi } from '../services/api';
import { buildWhatsAppPurchaseUrl, buildWhatsAppExtraCourseUrl } from '../config/plans';

interface Course {
  id: string;
  name: string;
  colorTag: string;
  chunksCount?: number;
  totalTasks?: number;
  pendingTasksCount?: number;
  completedTasksCount?: number;
}

interface TaskItem {
  id: string;
  title: string;
  type: string;
  deadline: string;
  priority: string;
  status: 'pending' | 'done' | 'missed';
  subject?: string;
}

const COLOR_PALETTE = [
  '#4F46E5', // Indigo (Core StudySync Theme)
  '#2563EB', // Royal Blue
  '#7C3AED', // Purple / Violet
  '#0891B2', // Cyan / Ocean
  '#0D9488', // Teal
  '#059669', // Emerald Green
  '#EA580C', // Amber / Orange
  '#D946EF', // Fuchsia / Rose
];


export default function Courses() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Add Course Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseColor, setNewCourseColor] = useState(COLOR_PALETTE[0]);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);

  // Course Hub / Detail Modal
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [activeTab, setActiveTab] = useState<'tasks' | 'notes'>('tasks');
  const [courseTasks, setCourseTasks] = useState<{
    pending: TaskItem[];
    completed: TaskItem[];
  }>({ pending: [], completed: [] });
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Notes Ingestion inside Modal
  const [notesTitle, setNotesTitle] = useState('');
  const [notesContent, setNotesContent] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // User Plan & Quota State
  const [userPlanInfo, setUserPlanInfo] = useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeModalMsg, setUpgradeModalMsg] = useState('');

  useEffect(() => {
    fetchCourses();
    fetchPlanInfo();
  }, []);

  const fetchPlanInfo = async () => {
    try {
      const res = await authApi.me();
      if (res.data?.data?.user?.planInfo) {
        setUserPlanInfo(res.data.data.user.planInfo);
      }
    } catch {}
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await coursesApi.getAll();
      setCourses(data.data?.courses || []);
    } catch {
      setError('Unable to load courses. Please check your internet connection and try again.');
      toast.error('Failed to load courses.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCourseDetails = async (course: Course, initialTab: 'tasks' | 'notes' = 'tasks') => {
    setActiveCourse(course);
    setActiveTab(initialTab);
    setLoadingTasks(true);
    try {
      const { data } = await coursesApi.getCourseTasks(course.id);
      setCourseTasks({
        pending: data.data?.pending || [],
        completed: data.data?.completed || [],
      });
    } catch {
      toast.error('Could not load course tasks.');
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleToggleTaskStatus = async (task: TaskItem) => {
    const newStatus = task.status === 'done' ? 'pending' : 'done';
    try {
      await tasksApi.update(task.id, { status: newStatus });
      toast.success(newStatus === 'done' ? 'Task marked complete!' : 'Task moved to pending.');
      if (activeCourse) {
        handleOpenCourseDetails(activeCourse, activeTab);
      }
      fetchCourses();
    } catch {
      toast.error('Failed to update task status.');
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim()) {
      toast.error('Please enter a course name');
      return;
    }

    const maxAllowed = userPlanInfo?.maxCourses ?? 1;
    if (courses.length >= maxAllowed) {
      setShowAddModal(false);
      setShowUpgradeModal(true);
      const isTopTier = userPlanInfo?.plan === 'pro' || userPlanInfo?.plan === 'campus';
      if (isTopTier) {
        setUpgradeModalMsg(
          `Aap StudySync ke sab se heavy plan (${userPlanInfo?.planName || 'StudySync Pro'}) par hain aur aapki ${maxAllowed} courses ki limit reach ho chuki hai. Agar aap mazeed course add karna chahte hain to sirf Rs. 100 me milega!`
        );
      } else {
        setUpgradeModalMsg(
          `You have reached the maximum course limit (${courses.length}/${maxAllowed} courses) for your ${
            userPlanInfo?.planName || 'Free Plan'
          }. Please upgrade on WhatsApp to add more courses.`
        );
      }
      return;
    }

    try {
      setIsCreatingCourse(true);
      await coursesApi.create({
        name: newCourseName.trim(),
        colorTag: newCourseColor,
      });
      toast.success('Course created successfully!');
      setNewCourseName('');
      setShowAddModal(false);
      fetchCourses();
      fetchPlanInfo();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to create course.';
      toast.error(msg);
      if (err?.response?.data?.planLimitReached) {
        setShowAddModal(false);
        setShowUpgradeModal(true);
        setUpgradeModalMsg(msg);
      }
    } finally {
      setIsCreatingCourse(false);
    }
  };

  const handleDeleteCourse = async (courseId: string, courseName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${courseName}"? All associated notes and chat history will be permanently deleted.`)) {
      return;
    }

    try {
      await coursesApi.delete(courseId);
      toast.success('Course deleted.');
      if (activeCourse?.id === courseId) {
        setActiveCourse(null);
      }
      fetchCourses();
      fetchPlanInfo();
    } catch {
      toast.error('Failed to delete course.');
    }
  };

  const handleIngestNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCourse || !notesContent.trim()) return;

    try {
      setIsIngesting(true);
      const { data } = await coursesApi.addMaterial(activeCourse.id, {
        title: notesTitle.trim() || 'Lecture Notes',
        content: notesContent.trim(),
      });
      toast.success(`Indexed ${data.data?.chunksIndexed || 1} note chunks into AI knowledge base!`);
      setNotesTitle('');
      setNotesContent('');
      fetchCourses();
    } catch {
      toast.error('Failed to index notes.');
    } finally {
      setIsIngesting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeCourse) return;

    const fileList = Array.from(files);
    const maxMB = userPlanInfo?.maxUploadMB ?? 10;
    const maxBytes = maxMB * 1024 * 1024;

    for (const f of fileList) {
      if (f.size > maxBytes) {
        const actualMB = (f.size / (1024 * 1024)).toFixed(1);
        toast.error(`File "${f.name}" (${actualMB}MB) exceeds your ${maxMB}MB plan limit.`);
        setShowUpgradeModal(true);
        setUpgradeModalMsg(
          `File "${f.name}" (${actualMB}MB) exceeds your ${maxMB}MB upload limit for ${
            userPlanInfo?.planName || 'Free Plan'
          }. Please upgrade to Plus (50MB) or Pro (150MB) on WhatsApp to upload larger materials.`
        );
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
    }

    try {
      setIsUploading(true);
      await coursesApi.uploadMaterial(activeCourse.id, fileList);
      toast.success(`Uploaded and indexed ${fileList.length} file(s) into AI Knowledge Base!`);
      fetchCourses();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to upload files.';
      toast.error(msg);
      if (err?.response?.data?.planLimitReached) {
        setShowUpgradeModal(true);
        setUpgradeModalMsg(msg);
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenChatbot = (course: Course, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    localStorage.setItem('studysync_last_selected_course', course.id);
    navigate(`/chatbot?courseId=${course.id}`);
  };

  // Filtered Courses Calculation
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchesSearch;
    });
  }, [courses, searchQuery]);

  return (
    <div className="courses-page-container" style={{ width: '100%', maxWidth: '100%', margin: 0, padding: '24px 36px 80px 36px', boxSizing: 'border-box' }}>
      {/* ─── Header ────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          marginBottom: 24,
          paddingBottom: 20,
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>
              Courses
            </h1>
            {(() => {
              const maxAllowed = userPlanInfo?.maxCourses ?? 1;
              const isFull = courses.length >= maxAllowed;
              return (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: isFull ? '#B91C1C' : '#4F46E5',
                      background: isFull ? '#FEF2F2' : '#EEF2FF',
                      padding: '4px 12px',
                      borderRadius: 20,
                      border: `1px solid ${isFull ? '#FECACA' : '#C7D2FE'}`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>Quota: {courses.length} / {maxAllowed} ({userPlanInfo?.planName || 'Free Trial'})</span>
                    {isFull && (
                      <span style={{ fontSize: '0.65rem', background: '#EF4444', color: '#FFF', padding: '1px 5px', borderRadius: 4, fontWeight: 700 }}>
                        LIMIT REACHED
                      </span>
                    )}
                  </span>

                  {isFull && (
                    <button
                      onClick={() => {
                        setShowUpgradeModal(true);
                        setUpgradeModalMsg(
                          `You have reached the maximum course capacity (${courses.length}/${maxAllowed} courses) for your ${userPlanInfo?.planName || 'Free Trial'}.`
                        );
                      }}
                      style={{
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: '#047857',
                        background: '#ECFDF5',
                        padding: '4px 12px',
                        borderRadius: 20,
                        border: '1px solid #A7F3D0',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Sparkles size={12} color="#059669" />
                      <span>Upgrade Plan on WhatsApp</span>
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
          <p style={{ color: '#64748B', fontSize: '0.9rem', marginTop: 4, marginBottom: 0 }}>
            Manage academic subjects, syllabus tasks, and AI vector knowledge bases.
          </p>
        </div>

        <button
          onClick={() => {
            const maxAllowed = userPlanInfo?.maxCourses ?? 1;
            if (courses.length >= maxAllowed) {
              setShowUpgradeModal(true);
              setUpgradeModalMsg(
                `You have reached the maximum course capacity (${courses.length}/${maxAllowed} courses) for your ${userPlanInfo?.planName || 'Free Trial'}. Please upgrade your plan on WhatsApp to create more courses.`
              );
            } else {
              setShowAddModal(true);
            }
          }}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 18px',
            background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: 10,
            fontSize: '0.88rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.28)',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #4338CA 0%, #4F46E5 100%)';
            e.currentTarget.style.boxShadow = '0 6px 18px rgba(79, 70, 229, 0.38)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(79, 70, 229, 0.28)';
            e.currentTarget.style.transform = 'none';
          }}
        >
          <Plus size={18} strokeWidth={2.4} />
          <span>Add Course</span>
        </button>
      </div>

      {/* ─── Search & Filter Bar ────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 300px', maxWidth: 460 }}>
          <Search
            size={16}
            color="#6366F1"
            style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          />
          <input
            type="text"
            placeholder="Search courses by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              borderRadius: 10,
              border: '1px solid #E2E8F0',
              fontSize: '0.88rem',
              background: '#FFFFFF',
              color: '#0F172A',
              outline: 'none',
              transition: 'all 0.15s ease',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#6366F1';
              e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.12)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#E2E8F0';
              e.target.style.boxShadow = 'none';
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#94A3B8',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {searchQuery && (
          <div style={{ fontSize: '0.82rem', color: '#64748B', fontWeight: 500 }}>
            Showing {filteredCourses.length} of {courses.length} courses
          </div>
        )}
      </div>

      {/* ─── Courses Grid ───────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: '3px solid #E2E8F0',
              borderTopColor: '#4F46E5',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px auto',
            }}
          />
          <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 500 }}>Loading academic courses...</span>
        </div>
      ) : error ? (
        <div
          style={{
            background: '#FEF2F2',
            border: '1.5px solid #FECACA',
            borderRadius: 16,
            padding: '48px 24px',
            textAlign: 'center',
            maxWidth: 520,
            margin: '40px auto',
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: '#FEE2E2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px auto',
            }}
          >
            <AlertCircle size={24} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#991B1B', marginBottom: 6 }}>
            Failed to Load Courses
          </h3>
          <p style={{ fontSize: '0.86rem', color: '#B91C1C', lineHeight: 1.5, marginBottom: 20 }}>
            {error}
          </p>
          <button
            type="button"
            onClick={fetchCourses}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '9px 18px',
              background: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              fontSize: '0.84rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(220, 38, 38, 0.25)',
            }}
          >
            <RefreshCw size={14} />
            <span>Try Again</span>
          </button>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div
          style={{
            background: '#FFFFFF',
            border: '1.5px dashed #E2E8F0',
            borderRadius: 16,
            padding: '56px 24px',
            textAlign: 'center',
            maxWidth: 520,
            margin: '40px auto',
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
              border: '1px solid #C7D2FE',
              color: '#4F46E5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.15)',
            }}
          >
            <BookOpen size={24} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
            {searchQuery ? 'No matching courses found' : 'No courses enrolled yet'}
          </h3>
          <p style={{ fontSize: '0.86rem', color: '#64748B', lineHeight: 1.5, marginBottom: 22 }}>
            {searchQuery
              ? `No course matches "${searchQuery}". Try a different search term or clear the filter.`
              : 'Add your university courses to organize assignments, quizzes, study notes, and get autonomous AI assistance.'}
          </p>
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                background: '#EEF2FF',
                color: '#4F46E5',
                border: '1px solid #C7D2FE',
                fontWeight: 600,
                fontSize: '0.86rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#E0E7FF')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#EEF2FF')}
            >
              Clear Search
            </button>
          ) : (
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '11px 22px',
                borderRadius: 10,
                background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #4338CA 0%, #4F46E5 100%)';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(79, 70, 229, 0.4)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(79, 70, 229, 0.3)';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <Plus size={16} />
              <span>Create Your First Course</span>
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            width: '100%',
          }}
        >
          {filteredCourses.map((course) => {
            const courseColor = course.colorTag || '#4F46E5';

            return (
              <div
                key={course.id}
                onClick={() => handleOpenChatbot(course)}
                style={{
                  background: '#FFFFFF',
                  borderRadius: 12,
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)',
                  transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 22px',
                  gap: 16,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1.5px)';
                  e.currentTarget.style.boxShadow = `0 6px 18px -2px ${courseColor}18, 0 2px 6px rgba(0, 0, 0, 0.04)`;
                  e.currentTarget.style.borderColor = `${courseColor}60`;
                  const del = e.currentTarget.querySelector('.row-delete-icon') as HTMLElement | null;
                  if (del) del.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0, 0, 0, 0.03)';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  const del = e.currentTarget.querySelector('.row-delete-icon') as HTMLElement | null;
                  if (del) del.style.opacity = '0';
                }}
              >
                {/* Left Subtle Color Accent Strip */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4.5,
                    background: `linear-gradient(180deg, ${courseColor} 0%, #818CF8 100%)`,
                    borderRadius: '12px 0 0 12px',
                  }}
                />

                {/* Left: Course Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
                  <h3
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      color: '#0F172A',
                      margin: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={course.name}
                  >
                    {course.name}
                  </h3>
                </div>

                {/* Right: Actions (Delete on hover + Open Chatbot button) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <button
                    className="row-delete-icon"
                    onClick={(e) => handleDeleteCourse(course.id, course.name, e)}
                    title="Delete Course"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      padding: 6,
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#FEE2E2';
                      e.currentTarget.style.color = '#EF4444';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#94A3B8';
                    }}
                  >
                    <Trash2 size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleOpenChatbot(course, e)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '9px 18px',
                      background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                      color: '#FFFFFF',
                      borderRadius: 8,
                      border: 'none',
                      fontSize: '0.86rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                      boxShadow: '0 2px 6px rgba(79, 70, 229, 0.22)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #4338CA 0%, #4F46E5 100%)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.35)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)';
                      e.currentTarget.style.boxShadow = '0 2px 6px rgba(79, 70, 229, 0.22)';
                    }}
                  >
                    <Bot size={16} />
                    <span>Open Chatbot</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Course Hub Modal (Tasks & Notes Ingestion) ──────────── */}
      {activeCourse && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(6px)',
            padding: 16,
          }}
          onClick={() => setActiveCourse(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 620,
              maxHeight: '88vh',
              background: '#FFFFFF',
              borderRadius: 16,
              boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'fadeInScale 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '20px 24px 16px 24px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: `${activeCourse.colorTag || '#6366F1'}18`,
                    color: activeCourse.colorTag || '#6366F1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.25rem',
                    border: `1px solid ${activeCourse.colorTag || '#6366F1'}30`,
                  }}
                >
                  {activeCourse.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    {activeCourse.name}
                  </h2>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: 2 }}>
                    {courseTasks.pending.length} Pending • {courseTasks.completed.length} Done • {activeCourse.chunksCount || 0} Knowledge Chunks
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={(e) => handleOpenChatbot(activeCourse, e)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 12px',
                    background: '#EEF2FF',
                    color: '#4F46E5',
                    border: '1px solid #C7D2FE',
                    borderRadius: 8,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Bot size={14} />
                  <span>Chatbot</span>
                </button>

                <button
                  onClick={() => setActiveCourse(null)}
                  style={{
                    background: '#F1F5F9',
                    border: 'none',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748B',
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal Tabs */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid #E2E8F0',
                background: '#F8FAFC',
                padding: '0 24px',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('tasks')}
                style={{
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: `2.5px solid ${activeTab === 'tasks' ? '#4F46E5' : 'transparent'}`,
                  color: activeTab === 'tasks' ? '#4F46E5' : '#64748B',
                  fontWeight: activeTab === 'tasks' ? 700 : 500,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Clock size={15} />
                <span>Academic Tasks ({courseTasks.pending.length + courseTasks.completed.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('notes')}
                style={{
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom: `2.5px solid ${activeTab === 'notes' ? '#4F46E5' : 'transparent'}`,
                  color: activeTab === 'notes' ? '#4F46E5' : '#64748B',
                  fontWeight: activeTab === 'notes' ? 700 : 500,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <BookOpen size={15} />
                <span>Add Study Materials (FAISS)</span>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
              {activeTab === 'tasks' ? (
                <div>
                  {loadingTasks ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748B', fontSize: '0.88rem' }}>
                      Loading tasks...
                    </div>
                  ) : (
                    <div>
                      {/* Pending Tasks */}
                      <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Clock size={14} />
                          <span>Pending ({courseTasks.pending.length})</span>
                        </div>

                        {courseTasks.pending.length === 0 ? (
                          <div style={{ padding: '16px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0', color: '#64748B', fontSize: '0.84rem', textAlign: 'center' }}>
                            All tasks caught up for this course! 🎉
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {courseTasks.pending.map((task) => (
                              <div
                                key={task.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '12px 14px',
                                  background: '#FFFFFF',
                                  border: '1px solid #E2E8F0',
                                  borderRadius: 10,
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <input
                                    type="checkbox"
                                    aria-label={`Mark "${task.title}" as completed`}
                                    checked={false}
                                    onChange={() => handleToggleTaskStatus(task)}
                                    style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#4F46E5' }}
                                  />
                                  <div>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0F172A' }}>
                                      {task.title}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                      <Calendar size={12} />
                                      <span>Due: {new Date(task.deadline).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                                      <span>•</span>
                                      <span style={{ textTransform: 'capitalize' }}>{task.type}</span>
                                    </div>
                                  </div>
                                </div>

                                <span
                                  style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    padding: '2px 8px',
                                    borderRadius: 6,
                                    background: task.priority === 'high' ? '#FEE2E2' : '#FEF3C7',
                                    color: task.priority === 'high' ? '#B91C1C' : '#B45309',
                                  }}
                                >
                                  {task.priority}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Completed Tasks */}
                      <div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <CheckCircle2 size={14} />
                          <span>Completed ({courseTasks.completed.length})</span>
                        </div>

                        {courseTasks.completed.length === 0 ? (
                          <div style={{ padding: '14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0', color: '#94A3B8', fontSize: '0.84rem', textAlign: 'center' }}>
                            No completed tasks yet.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {courseTasks.completed.map((task) => (
                              <div
                                key={task.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '10px 14px',
                                  background: '#F8FAFC',
                                  border: '1px solid #E2E8F0',
                                  borderRadius: 10,
                                  opacity: 0.85,
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <input
                                    type="checkbox"
                                    aria-label={`Mark "${task.title}" as pending`}
                                    checked={true}
                                    onChange={() => handleToggleTaskStatus(task)}
                                    style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#16A34A' }}
                                  />
                                  <div>
                                    <div style={{ fontSize: '0.88rem', fontWeight: 500, color: '#64748B', textDecoration: 'line-through' }}>
                                      {task.title}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 1 }}>
                                      Finished
                                    </div>
                                  </div>
                                </div>
                                <CheckCircle2 size={16} color="#16A34A" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Notes & Material Ingestion Tab */
                <div>
                  <div
                    style={{
                      background: '#EEF2FF',
                      border: '1px solid #C7D2FE',
                      borderRadius: 10,
                      padding: '12px 16px',
                      fontSize: '0.82rem',
                      color: '#3730A3',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      marginBottom: 18,
                    }}
                  >
                    <Sparkles size={18} color="#4F46E5" style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <strong>AI FAISS Semantic Engine:</strong> Any lecture text, summaries, or slides you add here are converted to embeddings. The AI Chatbot will directly cite and use them when answering your questions!
                    </div>
                  </div>

                  {/* File Upload Option */}
                  <div
                    style={{
                      border: '1.5px dashed #CBD5E1',
                      borderRadius: 12,
                      padding: '20px',
                      textAlign: 'center',
                      background: '#F8FAFC',
                      marginBottom: 20,
                    }}
                  >
                    <Upload size={24} color="#6366F1" style={{ margin: '0 auto 8px auto' }} />
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0F172A' }}>
                      Upload Course Documents
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748B', marginTop: 2, marginBottom: 12 }}>
                      Supports PDF, DOCX, PPTX slides, XLSX, TXT, code files & voice notes
                      <span style={{ display: 'block', marginTop: 4, fontWeight: 600, color: '#4F46E5' }}>
                        Max upload size: {userPlanInfo?.maxUploadMB ?? 10}MB per file ({userPlanInfo?.planName || 'Free Trial'})
                      </span>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      aria-label="Upload course documents and syllabus"
                      multiple
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                      accept=".pdf,.docx,.doc,.txt,.py,.md,.csv,.pptx,.ppt,.xlsx,.xls,.mp3,.wav,.m4a,.webm"
                    />
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        padding: '8px 18px',
                        background: '#EEF2FF',
                        border: '1px solid #C7D2FE',
                        borderRadius: 8,
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        color: '#4F46E5',
                        cursor: isUploading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isUploading) e.currentTarget.style.background = '#E0E7FF';
                      }}
                      onMouseLeave={(e) => {
                        if (!isUploading) e.currentTarget.style.background = '#EEF2FF';
                      }}
                    >
                      {isUploading ? 'Uploading & Indexing...' : 'Browse Files'}
                    </button>
                  </div>

                  {/* Text Notes Paste */}
                  <form onSubmit={handleIngestNotes}>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                        Note Title / Topic
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Chapter 4: Memory Management"
                        value={notesTitle}
                        onChange={(e) => setNotesTitle(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 12px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          fontSize: '0.86rem',
                          color: '#0F172A',
                          outline: 'none',
                          transition: 'all 0.15s ease',
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#6366F1';
                          e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#CBD5E1';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                        Notes Content
                      </label>
                      <textarea
                        rows={5}
                        placeholder="Paste lecture notes, definitions, exam tips, or formulas..."
                        value={notesContent}
                        onChange={(e) => setNotesContent(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 8,
                          border: '1px solid #CBD5E1',
                          fontSize: '0.86rem',
                          fontFamily: 'inherit',
                          color: '#0F172A',
                          outline: 'none',
                          transition: 'all 0.15s ease',
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#6366F1';
                          e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#CBD5E1';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isIngesting || !notesContent.trim()}
                      style={{
                        width: '100%',
                        padding: '11px',
                        background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 8,
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        cursor: isIngesting || !notesContent.trim() ? 'not-allowed' : 'pointer',
                        opacity: isIngesting || !notesContent.trim() ? 0.6 : 1,
                        boxShadow: '0 4px 14px rgba(79, 70, 229, 0.28)',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isIngesting && notesContent.trim()) {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #4338CA 0%, #4F46E5 100%)';
                          e.currentTarget.style.boxShadow = '0 6px 18px rgba(79, 70, 229, 0.38)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isIngesting && notesContent.trim()) {
                          e.currentTarget.style.background = 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)';
                          e.currentTarget.style.boxShadow = '0 4px 14px rgba(79, 70, 229, 0.28)';
                        }
                      }}
                    >
                      {isIngesting ? 'Vectorizing and Indexing into FAISS...' : 'Index Notes into AI Knowledge Base'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Add Course Modal ────────────────────────────────────── */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            backdropFilter: 'blur(6px)',
            padding: 16,
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 460,
              background: '#FFFFFF',
              borderRadius: 16,
              boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.25)',
              padding: '24px 26px',
              animation: 'fadeInScale 0.2s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Add New Course
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748B', marginTop: 2, marginBottom: 0 }}>
                  Create a subject to track tasks and chat with AI
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: '50%',
                  width: 30,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748B',
                }}
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateCourse}>
              {/* Course Name Input */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Course Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Operating Systems"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: 10,
                    border: '1.5px solid #CBD5E1',
                    fontSize: '0.9rem',
                    color: '#0F172A',
                    outline: 'none',
                    transition: 'all 0.15s ease',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#6366F1';
                    e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#CBD5E1';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>


              {/* Color Swatches */}
              <div style={{ marginBottom: 22 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: 8 }}>
                  Accent Shade
                </label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {COLOR_PALETTE.map((c) => {
                    const isSelected = newCourseColor === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewCourseColor(c)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: c,
                          border: isSelected ? '2.5px solid #FFFFFF' : '2px solid #FFFFFF',
                          boxShadow: isSelected ? `0 0 0 2.5px ${c}, 0 4px 10px rgba(0,0,0,0.2)` : '0 1px 3px rgba(0,0,0,0.12)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                          transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                        }}
                      >
                        {isSelected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFFFFF' }} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 8,
                    background: '#F1F5F9',
                    border: '1px solid #E2E8F0',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#E2E8F0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#F1F5F9';
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingCourse}
                  style={{
                    padding: '10px 22px',
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                    border: 'none',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    cursor: isCreatingCourse ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)',
                    transition: 'all 0.18s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isCreatingCourse) {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #4338CA 0%, #4F46E5 100%)';
                      e.currentTarget.style.boxShadow = '0 6px 18px rgba(79, 70, 229, 0.4)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isCreatingCourse) {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)';
                      e.currentTarget.style.boxShadow = '0 4px 14px rgba(79, 70, 229, 0.3)';
                      e.currentTarget.style.transform = 'none';
                    }
                  }}
                >
                  {isCreatingCourse ? 'Creating...' : 'Save Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Plan Limit Reached & Upgrade Modal ─── */}
      {showUpgradeModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setShowUpgradeModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 18,
              maxWidth: 520,
              width: '100%',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
              animation: 'modalSlideIn 0.22s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 100%)',
                color: '#FFF',
                padding: '24px 28px',
                position: 'relative',
              }}
            >
              <button
                onClick={() => setShowUpgradeModal(false)}
                style={{
                  position: 'absolute',
                  top: 18,
                  right: 18,
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: 'none',
                  color: '#FFF',
                  borderRadius: '50%',
                  width: 30,
                  height: 30,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={16} />
              </button>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: '#25D366',
                  color: '#075E54',
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  marginBottom: 10,
                }}
              >
                ⚡ Instant WhatsApp Upgrade Desk
              </div>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: '#FFF' }}>
                Course Capacity Limit Reached
              </h3>
              <p style={{ margin: '6px 0 0', fontSize: '0.86rem', color: '#C7D2FE', lineHeight: 1.45 }}>
                {upgradeModalMsg ||
                  `You have reached the maximum course limit for your ${userPlanInfo?.planName || 'Free Trial'}.`}
              </p>
            </div>

            {/* Modal Content Body */}
            <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {userPlanInfo?.plan === 'pro' || userPlanInfo?.plan === 'campus' ? (
                /* ─── Heavy Plan / Pro User Extra Course Add-on ─── */
                <div
                  style={{
                    background: 'linear-gradient(135deg, #F0FDF4 0%, #EEF2FF 100%)',
                    border: '1.5px solid #86EFAC',
                    borderRadius: 14,
                    padding: 20,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        background: '#16A34A',
                        color: '#FFF',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: 6,
                        letterSpacing: '0.04em',
                      }}
                    >
                      TOP-TIER ADD-ON
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#166534' }}>
                      Heavy Plan Expansion
                    </span>
                  </div>

                  <h4 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', color: '#0F172A', fontWeight: 800 }}>
                    Mazeed Courses Sirf Rs. 100 / Course me!
                  </h4>

                  <p style={{ margin: '0 0 14px 0', fontSize: '0.86rem', color: '#334155', lineHeight: 1.5 }}>
                    Aap already platform ke sab se heavy plan (<strong>{userPlanInfo?.planName || 'StudySync Pro'}</strong>) par enrolled hain. Agar aap mazeed courses add karna chahte hain, to koi naya subscription package buy karne ki zaroorat nahi — har extra course sirf <strong>Rs. 100 (100 PKR)</strong> me milega!
                  </p>

                  <div style={{ background: '#FFF', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ fontSize: '0.92rem', color: '#065F46' }}>Extra Course Capacity</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 2 }}>
                          Permanent slot addition with 150MB uploads & AI chat
                        </div>
                      </div>
                      <span style={{ fontWeight: 800, color: '#16A34A', fontSize: '1.15rem' }}>
                        Rs. 100 <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>/ course</span>
                      </span>
                    </div>
                  </div>

                  <a
                    href={buildWhatsAppExtraCourseUrl(userPlanInfo?.email)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      padding: '13px 20px',
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                      color: '#FFF',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      textDecoration: 'none',
                      boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
                      transition: 'transform 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'none';
                    }}
                  >
                    <MessageSquare size={18} />
                    <span>Rs. 100 me Extra Course Buy Karein (WhatsApp)</span>
                  </a>
                </div>
              ) : (
                /* ─── Plus / Pro Tier Upgrades in PKR ─── */
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 16 }}>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#475569',
                      marginBottom: 10,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Choose Your Next Upgrade Tier:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 14px',
                        background: '#FFF',
                        borderRadius: 10,
                        border: '1px solid #E2E8F0',
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: '0.925rem', color: '#1E1B4B' }}>StudySync Plus</strong>
                        <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 2 }}>
                          Up to 5 Courses • 50MB file uploads • Full WhatsApp
                        </div>
                      </div>
                      <span style={{ fontWeight: 800, color: '#4F46E5', fontSize: '0.95rem' }}>Rs. 1,000/mo</span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 14px',
                        background: '#F0FDF4',
                        borderRadius: 10,
                        border: '1px solid #BBF7D0',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <strong style={{ fontSize: '0.925rem', color: '#065F46' }}>StudySync Pro</strong>
                          <span
                            style={{
                              fontSize: '0.62rem',
                              background: '#22C55E',
                              color: '#FFF',
                              padding: '1px 5px',
                              borderRadius: 4,
                              fontWeight: 700,
                            }}
                          >
                            MOST POPULAR
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#047857', marginTop: 2 }}>
                          Up to 10 Courses • 150MB uploads • Multi-Model Switcher
                        </div>
                      </div>
                      <span style={{ fontWeight: 800, color: '#059669', fontSize: '0.95rem' }}>Rs. 2,000/mo</span>
                    </div>
                  </div>

                  {/* Action Buttons for Normal Upgrades */}
                  <div style={{ marginTop: 14 }}>
                    <a
                      href={userPlanInfo?.whatsappUpgradeUrl || buildWhatsAppPurchaseUrl('plus', 'monthly')}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        padding: '13px 20px',
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #25D366 0%, #16A34A 100%)',
                        color: '#FFF',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        textDecoration: 'none',
                        boxShadow: '0 4px 16px rgba(37, 211, 102, 0.35)',
                      }}
                    >
                      <MessageSquare size={18} />
                      <span>Upgrade on WhatsApp Now (Auto-Message)</span>
                    </a>
                  </div>
                </div>
              )}

              <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748B' }}>
                Admin (Muhammad Arham) will activate your account via WhatsApp (+923030111550)
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
