import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { analyticsAPI, groupsAPI } from '../api/auth';
import { 
  BarChart3, TrendingUp, Users, Award, 
  ClipboardCheck, Calendar, ChevronDown, 
  ArrowUp, ArrowDown, Minus 
} from 'lucide-react';
import './Analytics.css';

export default function Analytics() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [groupAnalytics, setGroupAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('semester');

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadGroupAnalytics();
    }
  }, [selectedGroup, period]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [dashboardData, groupsData] = await Promise.all([
        analyticsAPI.getDashboard(),
        groupsAPI.getAll()
      ]);
      setDashboard(dashboardData);
      setGroups(groupsData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupAnalytics = async () => {
    try {
      const data = await analyticsAPI.getGroupAnalytics(selectedGroup, { period });
      setGroupAnalytics(data);
    } catch (error) {
      console.error('Error loading group analytics:', error);
    }
  };

  const getTrendIcon = (trend) => {
    if (trend > 0) return <ArrowUp size={16} className="trend-up" />;
    if (trend < 0) return <ArrowDown size={16} className="trend-down" />;
    return <Minus size={16} className="trend-neutral" />;
  };

  if (loading) {
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
            {getTrendIcon(5)}
            <span>+5 за месяц</span>
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
            <span className="stat-value">{dashboard?.attendance_rate || 85}%</span>
            <span className="stat-label">Посещаемость</span>
          </div>
          <div className="stat-trend">
            {getTrendIcon(dashboard?.attendance_trend || 2)}
            <span>{dashboard?.attendance_trend > 0 ? '+' : ''}{dashboard?.attendance_trend || 2}%</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon grades">
            <Award size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{dashboard?.average_grade || 75}</span>
            <span className="stat-label">Средний балл</span>
          </div>
          <div className="stat-trend">
            {getTrendIcon(dashboard?.grades_trend || 3)}
            <span>{dashboard?.grades_trend > 0 ? '+' : ''}{dashboard?.grades_trend || 3}</span>
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

          {groupAnalytics && (
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
                            strokeDasharray: `${(groupAnalytics.attendance_rate || 85) * 2.51} 251.2` 
                          }}
                        />
                      </svg>
                      <span className="value">{groupAnalytics.attendance_rate || 85}%</span>
                    </div>
                  </div>
                </div>

                <div className="analytics-card">
                  <h3>Распределение оценок</h3>
                  <div className="grades-distribution">
                    {[
                      { label: 'Отлично (90-100)', value: 25, color: '#22c55e' },
                      { label: 'Хорошо (75-89)', value: 40, color: '#3b82f6' },
                      { label: 'Удовл. (60-74)', value: 25, color: '#f59e0b' },
                      { label: 'Неудовл. (<60)', value: 10, color: '#ef4444' },
                    ].map((grade, i) => (
                      <div key={i} className="grade-bar">
                        <div className="grade-label">{grade.label}</div>
                        <div className="grade-progress">
                          <div 
                            className="grade-fill" 
                            style={{ width: `${grade.value}%`, backgroundColor: grade.color }}
                          />
                        </div>
                        <span className="grade-value">{grade.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="analytics-card full-width">
                  <h3>Топ студентов группы</h3>
                  <div className="top-students">
                    {(groupAnalytics.top_students || [
                      { name: 'Иванов Иван', avg_grade: 95, attendance: 98 },
                      { name: 'Петров Пётр', avg_grade: 92, attendance: 95 },
                      { name: 'Сидоров Сидор', avg_grade: 88, attendance: 100 },
                    ]).map((student, i) => (
                      <div key={i} className="top-student">
                        <span className="rank">#{i + 1}</span>
                        <div className="avatar">{student.name?.[0]}</div>
                        <div className="student-info">
                          <span className="name">{student.name}</span>
                          <span className="stats">
                            Средний балл: {student.avg_grade} | Посещаемость: {student.attendance}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Activity */}
      <div className="analytics-section">
        <div className="section-header">
          <h2>Последняя активность</h2>
        </div>
        
        <div className="activity-timeline">
          {(dashboard?.recent_activity || [
            { type: 'grade', text: 'Выставлены оценки по Тактической подготовке', time: '2 часа назад' },
            { type: 'attendance', text: 'Отмечена посещаемость группы ВК-24-1', time: '3 часа назад' },
            { type: 'disciplinary', text: 'Добавлена дисциплинарная запись', time: 'Вчера' },
          ]).map((activity, i) => (
            <div key={i} className="activity-item">
              <div className={`activity-icon ${activity.type}`}>
                {activity.type === 'grade' && <Award size={16} />}
                {activity.type === 'attendance' && <ClipboardCheck size={16} />}
                {activity.type === 'disciplinary' && <Users size={16} />}
              </div>
              <div className="activity-content">
                <span className="activity-text">{activity.text}</span>
                <span className="activity-time">{activity.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}






