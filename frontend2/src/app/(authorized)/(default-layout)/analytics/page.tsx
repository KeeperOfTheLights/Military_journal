'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import {
  useGetDashboardStatsApiAnalyticsDashboardGet,
  useGetGroupAnalyticsApiAnalyticsGroupsGroupIdGet
} from '@/api/orval/client/analytics/analytics';
import { useListGroupsApiGroupsGet } from '@/api/orval/client/groups/groups';

import {
  BarChart3, Users, Award,
  ClipboardCheck, ChevronDown,
  ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import '@/styles/Analytics.css';

export default function Analytics() {
  const { user } = useAuthStore();
  const [selectedGroup, setSelectedGroup] = useState('');
  const [period, setPeriod] = useState('semester');

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';

  // Dashboard Stats
  const { data: dashboardData, isLoading: isLoadingDashboard } = useGetDashboardStatsApiAnalyticsDashboardGet({
    query: { enabled: isTeacherOrAdmin }
  } as any);
  const dashboard = dashboardData?.data;

  // Groups
  const { data: groupsData } = useListGroupsApiGroupsGet();
  const groups = Array.isArray(groupsData?.data) ? groupsData.data : [];

  // Group Analytics
  const { data: groupAnalyticsData, isLoading: isLoadingGroupAnalytics } = useGetGroupAnalyticsApiAnalyticsGroupsGroupIdGet(
    selectedGroup ? parseInt(selectedGroup) : 0,
    {}, // academic_year, semester params
    { query: { enabled: !!selectedGroup && isTeacherOrAdmin } } as any
  );
  const groupAnalytics = groupAnalyticsData?.data;

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <ArrowUp size={16} className="trend-up" />;
    if (trend < 0) return <ArrowDown size={16} className="trend-down" />;
    return <Minus size={16} className="trend-neutral" />;
  };

  if (isLoadingDashboard && !dashboard) {
    return (
      <div className="analytics-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Загрузка аналитики...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <div className="page-header">
        <div className="page-title">
          <BarChart3 size={28} />
          <h1>Аналитика и статистика</h1>
        </div>

        <div className="header-filters">
          <select
            className="form-input"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="week">Неделя</option>
            <option value="month">Месяц</option>
            <option value="semester">Семестр</option>
            <option value="year">Год</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon students">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{dashboard?.total_students || 0}</span>
            <span className="stat-label">Студентов</span>
          </div>
          <div className="stat-trend">
            {getTrendIcon(0)}
            <span>Стабильно</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon groups">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{dashboard?.total_groups || groups.length}</span>
            <span className="stat-label">Групп</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon attendance">
            <ClipboardCheck size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{dashboard?.today_attendance_rate || 0}%</span>
            <span className="stat-label">Посещаемость</span>
          </div>
          <div className="stat-trend">
            {getTrendIcon(1)}
            <span>+1% за сегодня</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon grades">
            <Award size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{dashboard?.average_grade || 0}</span>
            <span className="stat-label">Средний балл</span>
          </div>
          <div className="stat-trend">
            {getTrendIcon(0)}
            <span>Без изменений</span>
          </div>
        </div>
      </div>

      {/* Group Selection */}
      {isTeacherOrAdmin && (
        <div className="analytics-section">
          <div className="section-header">
            <h2>Аналитика по группе</h2>
            <div className="filter-group">
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="form-input"
              >
                <option value="">Выберите группу</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
              <ChevronDown size={16} className="select-arrow" />
            </div>
          </div>

          {isLoadingGroupAnalytics ? (
            <div className="loading-state" style={{ minHeight: '200px' }}>
              <div className="spinner"></div>
              <p>Загрузка данных группы...</p>
            </div>
          ) : groupAnalytics && (
            <div className="group-analytics">
              <div className="analytics-grid">
                <div className="analytics-card">
                  <h3>Посещаемость</h3>
                  <div className="chart-placeholder">
                    <div className="progress-ring">
                      <svg viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" className="bg" />
                        <circle
                          cx="50" cy="50" r="40"
                          className="progress"
                          style={{
                            strokeDasharray: `${(groupAnalytics.average_attendance_rate || 0) * 2.51} 251.2`
                          }}
                        />
                      </svg>
                      <span className="value">{Math.round(groupAnalytics.average_attendance_rate || 0)}%</span>
                    </div>
                  </div>
                </div>

                <div className="analytics-card">
                  <h3>Средний балл по предметам</h3>
                  <div className="grades-distribution">
                    {Object.entries(groupAnalytics.grades_by_subject || {}).map(([subject, grade]: [string, any], i) => (
                      <div key={i} className="grade-bar">
                        <div className="grade-label" title={subject}>{subject}</div>
                        <div className="grade-progress">
                          <div
                            className="grade-fill"
                            style={{
                              width: `${grade}%`,
                              backgroundColor: grade >= 90 ? '#22c55e' : (grade >= 75 ? '#3b82f6' : '#f59e0b')
                            }}
                          />
                        </div>
                        <span className="grade-value">{Math.round(grade)}%</span>
                      </div>
                    ))}
                    {Object.keys(groupAnalytics.grades_by_subject || {}).length === 0 && (
                      <p className="empty-msg">Нет данных по оценкам</p>
                    )}
                  </div>
                </div>

                <div className="analytics-card full-width">
                  <h3>Топ студентов группы</h3>
                  <div className="top-students">
                    {(groupAnalytics.top_students || []).map((student: any, i: number) => (
                      <div key={i} className="top-student">
                        <span className="rank">#{i + 1}</span>
                        <div className="avatar">{student.name?.[0] || 'С'}</div>
                        <div className="student-info">
                          <span className="name">{student.name}</span>
                          <span className="stats">
                            Средний балл: {Math.round(student.average_grade || 0)} | Посещаемость: {Math.round(student.attendance_rate || 0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                    {(!groupAnalytics.top_students || groupAnalytics.top_students.length === 0) && (
                      <p className="empty-msg">Нет данных о студентах</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Activity - Placeholder as API doesn't provide it yet */}
      <div className="analytics-section">
        <div className="section-header">
          <h2>Последняя активность</h2>
        </div>

        <div className="activity-timeline">
          <div className="empty-state" style={{ minHeight: '150px' }}>
            <p>Раздел в разработке. Здесь будет отображаться история изменений.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
