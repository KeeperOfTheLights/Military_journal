'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { useGetDashboardStatsApiAnalyticsDashboardGet } from '@/api/client/analytics/analytics';
import { useGetMyScheduleApiScheduleMyGet } from '@/api/client/schedule/schedule';
import {
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  TrendingUp,
  Calendar,
  AlertTriangle,
  ChevronRight,
  Clock,
} from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const { user } = useAuthStore();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  // Stats query
  const { data: dashboardData, isLoading: isLoadingStats } = useGetDashboardStatsApiAnalyticsDashboardGet(
    { query: { enabled: isTeacher } } as any
  );

  // Schedule query (available for all authenticated users)
  const { data: scheduleData, isLoading: isLoadingSchedule } = useGetMyScheduleApiScheduleMyGet();

  const stats = dashboardData?.data as any; // Cast to avoid lint errors with ErrorResponse
  const schedule = (scheduleData?.data && Array.isArray(scheduleData.data)) ? scheduleData.data.slice(0, 5) : [];

  const loading = (isTeacher && isLoadingStats) || isLoadingSchedule;

  const getRoleName = (role: string | undefined) => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'teacher': return 'Преподаватель';
      case 'student': return 'Студент';
      default: return role;
    }
  };

  if (loading && !stats && !schedule.length) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Загрузка данных...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1>Добро пожаловать!</h1>
          <p className="page-subtitle">
            {getRoleName(user?.role)} • {user?.email}
          </p>
        </div>
        <div className="header-actions">
          <Link href="/schedule" className="btn btn-primary">
            <Calendar size={18} />
            Расписание
          </Link>
        </div>
      </div>

      {isTeacher && stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon students">
              <Users size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.total_students || 0}</span>
              <span className="stat-label">Студентов</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon teachers">
              <GraduationCap size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.total_teachers || 0}</span>
              <span className="stat-label">Преподавателей</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon groups">
              <BookOpen size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.total_groups || 0}</span>
              <span className="stat-label">Групп</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon attendance">
              <ClipboardCheck size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{Math.round(stats.today_attendance_rate || 0)}%</span>
              <span className="stat-label">Посещаемость сегодня</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon grade">
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{Math.round(stats.average_grade || 0)}%</span>
              <span className="stat-label">Средний балл</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon violations">
              <AlertTriangle size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.recent_violations || 0}</span>
              <span className="stat-label">Нарушений (30 дней)</span>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <div className="section-header">
            <h2>
              <Calendar size={20} />
              Ближайшие занятия
            </h2>
            <Link href="/schedule" className="section-link">
              Все расписание <ChevronRight size={16} />
            </Link>
          </div>

          <div className="schedule-list">
            {schedule.length > 0 ? (
              schedule.map((item: any) => {
                const scheduleDate = item.date ? new Date(item.date) : null;
                const formattedDate = scheduleDate
                  ? scheduleDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })
                  : 'Дата не указана';

                return (
                  <div key={item.id} className="schedule-item">
                    <div className="schedule-time">
                      <Clock size={16} />
                      <span>{item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}</span>
                    </div>
                    <div className="schedule-info">
                      <h4>{item.subject_name || item.subject?.name || 'Предмет'}</h4>
                      <p>
                        {formattedDate} • Ауд. {item.room}
                        {item.group_name && ` • ${item.group_name}`}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">
                <Calendar size={48} />
                <p>Расписание не найдено</p>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <div className="section-header">
            <h2>
              <ClipboardCheck size={20} />
              Быстрые действия
            </h2>
          </div>

          <div className="quick-actions">
            {isTeacher ? (
              <>
                <Link href="/attendance/marking" className="action-card">
                  <ClipboardCheck size={24} />
                  <span>Отметить посещаемость</span>
                </Link>
                <Link href="/grades/entry" className="action-card">
                  <GraduationCap size={24} />
                  <span>Выставить оценки</span>
                </Link>
                <Link href="/students" className="action-card">
                  <Users size={24} />
                  <span>Список студентов</span>
                </Link>
                <Link href="/analytics" className="action-card">
                  <TrendingUp size={24} />
                  <span>Аналитика</span>
                </Link>
              </>
            ) : (
              <>
                <Link href="/grades" className="action-card">
                  <GraduationCap size={24} />
                  <span>Мои оценки</span>
                </Link>
                <Link href="/attendance" className="action-card">
                  <ClipboardCheck size={24} />
                  <span>Моя посещаемость</span>
                </Link>
                <Link href="/schedule" className="action-card">
                  <Calendar size={24} />
                  <span>Моё расписание</span>
                </Link>
                <Link href="/assignments" className="action-card">
                  <BookOpen size={24} />
                  <span>Задания</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
