import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { scheduleAPI } from '../api/auth';
import { Calendar, Clock, MapPin, User, BookOpen } from 'lucide-react';
import './Schedule.css';

const DAYS = [
  { key: 'monday', label: 'Понедельник' },
  { key: 'tuesday', label: 'Вторник' },
  { key: 'wednesday', label: 'Среда' },
  { key: 'thursday', label: 'Четверг' },
  { key: 'friday', label: 'Пятница' },
  { key: 'saturday', label: 'Суббота' },
];

export default function Schedule() {
  const { isTeacher } = useAuth();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('all');

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      const data = await scheduleAPI.getMy();
      setSchedule(data);
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScheduleByDay = (day) => {
    return schedule
      .filter((item) => item.day_of_week === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  const filteredDays = selectedDay === 'all' 
    ? DAYS 
    : DAYS.filter(d => d.key === selectedDay);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Загрузка расписания...</p>
      </div>
    );
  }

  return (
    <div className="schedule-page">
      <div className="page-header">
        <div>
          <h1>Расписание занятий</h1>
          <p className="page-subtitle">Учебный год 2024-2025</p>
        </div>
      </div>

      <div className="schedule-filters">
        <button
          className={`filter-btn ${selectedDay === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedDay('all')}
        >
          Все дни
        </button>
        {DAYS.map((day) => (
          <button
            key={day.key}
            className={`filter-btn ${selectedDay === day.key ? 'active' : ''}`}
            onClick={() => setSelectedDay(day.key)}
          >
            {day.label.slice(0, 3)}
          </button>
        ))}
      </div>

      <div className="schedule-grid">
        {filteredDays.map((day) => {
          const daySchedule = getScheduleByDay(day.key);
          
          return (
            <div key={day.key} className="day-card">
              <div className="day-header">
                <Calendar size={18} />
                <h3>{day.label}</h3>
                <span className="lesson-count">{daySchedule.length} занятий</span>
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
    </div>
  );
}






