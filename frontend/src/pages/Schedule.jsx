import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { scheduleAPI, groupsAPI } from '../api/auth';
import { Calendar, Clock, MapPin, User, BookOpen, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import './Schedule.css';

const DAYS = [
  { key: 'monday', label: 'Понедельник', short: 'Пн' },
  { key: 'tuesday', label: 'Вторник', short: 'Вт' },
  { key: 'wednesday', label: 'Среда', short: 'Ср' },
  { key: 'thursday', label: 'Четверг', short: 'Чт' },
  { key: 'friday', label: 'Пятница', short: 'Пт' },
  { key: 'saturday', label: 'Суббота', short: 'Сб' },
];

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

export default function Schedule() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  // Only week view now (no templates)
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadWeekSchedule();
  }, [currentDate, selectedGroupId]);

  const loadInitialData = async () => {
    try {
      if (user?.role === 'teacher' || user?.role === 'admin') {
        const groupsData = await groupsAPI.getAll();
        setGroups(groupsData);
        if (groupsData.length > 0) {
          setSelectedGroupId(groupsData[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadWeekSchedule = async () => {
    try {
      setLoading(true);
      const weekStart = getWeekStart(currentDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      let data;
      if (user?.role === 'student') {
        // Get student's group ID first
        const mySchedule = await scheduleAPI.getMy();
        if (mySchedule.length > 0 && mySchedule[0].group_id) {
          // Filter by current week dates
          data = mySchedule.filter(item => {
            if (!item.specific_date) return false;
            const itemDate = new Date(item.specific_date);
            return itemDate >= weekStart && itemDate <= weekEnd;
          });
        } else {
          data = [];
        }
      } else if (selectedGroupId) {
        data = await scheduleAPI.getByDateRange(
          selectedGroupId,
          weekStart.toISOString().split('T')[0],
          weekEnd.toISOString().split('T')[0]
        );
      }
      setSchedule(data || []);
    } catch (error) {
      console.error('Error loading week schedule:', error);
      setSchedule([]);
    } finally {
      setLoading(false);
    }
  };


  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const getWeekDates = () => {
    const weekStart = getWeekStart(currentDate);
    const dates = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const getScheduleForDate = (date) => {
    // Format date as YYYY-MM-DD without timezone conversion
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    return schedule
      .filter(item => item.specific_date === dateStr)
      .sort((a, b) => a.start_time?.localeCompare(b.start_time));
  };


  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Загрузка расписания...</p>
      </div>
    );
  }

  const weekDates = getWeekDates();
  const weekStart = weekDates[0];
  const weekEnd = weekDates[weekDates.length - 1];

  return (
    <div className="schedule-page">
      <div className="page-header">
        <div>
          <h1>Расписание занятий</h1>
          {weekStart && weekEnd && (
            <p className="page-subtitle">
              {weekStart.getDate()} {MONTH_NAMES[weekStart.getMonth()]} - {weekEnd.getDate()} {MONTH_NAMES[weekEnd.getMonth()]} {weekEnd.getFullYear()}
            </p>
          )}
        </div>
      </div>

      <div className="schedule-controls">
        <div className="navigation-controls">
            {(user?.role === 'teacher' || user?.role === 'admin') && groups.length > 0 && (
              <div className="filter-group">
                <select
                  className="form-select"
                  value={selectedGroupId || ''}
                  onChange={(e) => setSelectedGroupId(parseInt(e.target.value))}
                >
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="select-arrow" />
              </div>
            )}

            <button className="nav-btn" onClick={() => navigateMonth(-1)} title="Предыдущий месяц">
              <span>‹‹</span>
            </button>
            <button className="nav-btn" onClick={() => navigateWeek(-1)} title="Предыдущая неделя">
              <ChevronLeft size={18} />
            </button>
            <button className="nav-btn today-btn" onClick={goToToday}>
              Сегодня
            </button>
            <button className="nav-btn" onClick={() => navigateWeek(1)} title="Следующая неделя">
              <ChevronRight size={18} />
            </button>
            <button className="nav-btn" onClick={() => navigateMonth(1)} title="Следующий месяц">
            <span>››</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Загрузка расписания...</p>
        </div>
      ) : (
        <div className="schedule-grid">
          {weekDates.map((date, index) => {
              const daySchedule = getScheduleForDate(date);
              const dayKey = DAYS[index];
              
              return (
                <div key={date.toISOString()} className={`day-card ${isToday(date) ? 'today' : ''}`}>
                  <div className="day-header">
                    <Calendar size={18} />
                    <div>
                      <h3>{dayKey.label}</h3>
                      <p className="day-date">{date.getDate()} {MONTH_NAMES[date.getMonth()]}</p>
                    </div>
                    <span className="lesson-count">{daySchedule.length}</span>
                  </div>

                  <div className="lessons-list">
                    {daySchedule.length > 0 ? (
                      daySchedule.map((lesson) => (
                        <div key={lesson.id} className="lesson-card">
                          <div className="lesson-time">
                            <Clock size={14} />
                            <span>{lesson.start_time?.slice(0, 5)} - {lesson.end_time?.slice(0, 5)}</span>
                          </div>
                          
                          <div className="lesson-content">
                            <h4 className="lesson-subject">
                              <BookOpen size={16} />
                              {lesson.subject?.name || 'Предмет'}
                            </h4>
                            
                            <div className="lesson-details">
                              <div className="lesson-detail">
                                <MapPin size={14} />
                                <span>Ауд. {lesson.room}</span>
                              </div>
                              
                              {lesson.teacher && (
                                <div className="lesson-detail">
                                  <User size={14} />
                                  <span>{lesson.teacher.last_name} {lesson.teacher.first_name?.charAt(0)}.</span>
                                </div>
                              )}
                              
                              {lesson.group && (
                                <div className="lesson-detail">
                                  <span className="group-badge">{lesson.group.name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-lessons">
                        <p>Нет занятий</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}






