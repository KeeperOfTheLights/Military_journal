'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { Calendar, Clock, MapPin, User, BookOpen, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import '@/styles/Schedule.css';

// Import generated hooks
import { useListGroupsApiGroupsGet } from '@/api/orval/client/groups/groups';
import {
  useGetMyScheduleApiScheduleMyGet,
  useGetScheduleByDateRangeApiScheduleByDateRangeGet
} from '@/api/orval/client/schedule/schedule';

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
  const { user } = useAuthStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);

  // Helper to get week start/end
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const weekStart = getWeekStart(currentDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const dateFrom = formatDate(weekStart);
  const dateTo = formatDate(weekEnd);

  // Queries
  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';
  const isStudent = user?.role === 'student';

  const { data: groupsData } = useListGroupsApiGroupsGet(
    undefined,
    { query: { enabled: isTeacherOrAdmin } as any }
  );

  const { data: myScheduleData, isLoading: isLoadingMySchedule } = useGetMyScheduleApiScheduleMyGet(
    undefined,
    { query: { enabled: isStudent } as any }
  );

  const { data: groupScheduleData, isLoading: isLoadingGroupSchedule } = useGetScheduleByDateRangeApiScheduleByDateRangeGet(
    {
      group_id: selectedGroupId!,
      date_from: dateFrom,
      date_to: dateTo
    },
    { query: { enabled: isTeacherOrAdmin && !!selectedGroupId } as any }
  );

  useEffect(() => {
    if (groupsData?.data && Array.isArray(groupsData.data) && !selectedGroupId) {
      if (groupsData.data.length > 0) {
        setSelectedGroupId(groupsData.data[0].id);
      }
    }
  }, [groupsData, selectedGroupId]);

  const loading = isStudent ? isLoadingMySchedule : (isLoadingGroupSchedule && !!selectedGroupId);

  const getScheduleToDisplay = () => {
    if (isStudent) {
      if (!myScheduleData?.data || !Array.isArray(myScheduleData.data)) return [];
      // Filter by current week
      return myScheduleData.data.filter((item: any) => {
        if (!item.specific_date) return false;
        const itemDate = new Date(item.specific_date);
        return itemDate >= weekStart && itemDate <= weekEnd;
      });
    } else {
      return (groupScheduleData?.data && Array.isArray(groupScheduleData.data)) ? groupScheduleData.data : [];
    }
  };

  const schedule = getScheduleToDisplay();
  const groups = (groupsData?.data && Array.isArray(groupsData.data)) ? groupsData.data : [];

  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 6; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const getScheduleForDate = (date: Date) => {
    const dateStr = formatDate(date);
    return schedule
      .filter((item: any) => item.specific_date === dateStr)
      .sort((a: any, b: any) => (a.start_time || '').localeCompare(b.start_time || ''));
  };


  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const weekDates = getWeekDates();

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
          {isTeacherOrAdmin && (
            <div style={{ display: 'flex', gap: '0.5rem', marginRight: '1rem' }}>
              <Link href="/schedule/calendar" className="nav-btn" style={{ width: 'auto', padding: '0 0.75rem' }}>Календарь</Link>
              <Link href="/schedule/management" className="nav-btn" style={{ width: 'auto', padding: '0 0.75rem' }}>Управление</Link>
            </div>
          )}
          {isTeacherOrAdmin && groups.length > 0 && (
            <div className="filter-group">
              <select
                className="form-select"
                value={selectedGroupId || ''}
                onChange={(e) => setSelectedGroupId(parseInt(e.target.value))}
              >
                {groups.map((group: any) => (
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
                    daySchedule.map((lesson: any) => (
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
                              <span className={lesson.room ? '' : 'text-gray-400'}>{lesson.room ? `Ауд. ${lesson.room}` : 'Аудитория не указана'}</span>
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
