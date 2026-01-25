import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { analyticsAPI, scheduleAPI, attendanceAPI, gradesAPI } from '../api/auth';
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
  const { user, isTeacher, isStudent } = useAuth();
  const [stats, setStats] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Small delay to ensure token is set
    const timer = setTimeout(() => {
      loadDashboardData();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const loadDashboardData = async () => {
    try {
      if (isTeacher) {
        const dashboardData = await analyticsAPI.getDashboard();
        setStats(dashboardData);
      }
      
      const scheduleData = await scheduleAPI.getMy();
      setSchedule(scheduleData.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleName = (role) => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'teacher': return 'Преподаватель';
      case 'student': return 'Студент';
      default: return role;
    }
  };

  const getDayName = (day) => {
    const days = {
      monday: 'Понедельник',
      tuesday: 'Вторник',
      wednesday: 'Среда',
      thursday: 'Четверг',
      friday: 'Пятница',
      saturday: 'Суббота',
    };
    return days[day] || day;
  };

  if (loading) {
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
          <Link to="/schedule" className="btn btn-primary">
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
              <span className="stat-value">{stats.total_students}</span>
              <span className="stat-label">Студентов</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon teachers">
              <GraduationCap size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.total_teachers}</span>
              <span className="stat-label">Преподавателей</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon groups">
              <BookOpen size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.total_groups}</span>
              <span className="stat-label">Групп</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon attendance">
              <ClipboardCheck size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.today_attendance_rate}%</span>
              <span className="stat-label">Посещаемость сегодня</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon grade">
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.average_grade}%</span>
              <span className="stat-label">Средний балл</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon violations">
              <AlertTriangle size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{stats.recent_violations}</span>
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
            <Link to="/schedule" className="section-link">
              Все расписание <ChevronRight size={16} />
            </Link>
          </div>

          <div className="schedule-list">
            {schedule.length > 0 ? (
              schedule.map((item) => (
                <div key={item.id} className="schedule-item">
                  <div className="schedule-time">
                    <Clock size={16} />
                    <span>{item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}</span>
                  </div>
                  <div className="schedule-info">
                    <h4>{item.subject?.name || 'Предмет'}</h4>
                    <p>
                      {getDayName(item.day_of_week)} • Ауд. {item.room}
                      {item.group && ` • ${item.group.name}`}
                    </p>
                  </div>
                </div>
              ))
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
                <Link to="/attendance/mark" className="action-card">
                  <ClipboardCheck size={24} />
                  <span>Отметить посещаемость</span>
                </Link>
                <Link to="/grades/entry" className="action-card">
                  <GraduationCap size={24} />
                  <span>Выставить оценки</span>
                </Link>
                <Link to="/students" className="action-card">
                  <Users size={24} />
                  <span>Список студентов</span>
                </Link>
                <Link to="/analytics" className="action-card">
                  <TrendingUp size={24} />
                  <span>Аналитика</span>
                </Link>
              </>
            ) : (
              <>
                <Link to="/grades" className="action-card">
                  <GraduationCap size={24} />
                  <span>Мои оценки</span>
                </Link>
                <Link to="/attendance" className="action-card">
                  <ClipboardCheck size={24} />
                  <span>Моя посещаемость</span>
                </Link>
                <Link to="/schedule" className="action-card">
                  <Calendar size={24} />
                  <span>Моё расписание</span>
                </Link>
                <Link to="/assignments" className="action-card">
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

