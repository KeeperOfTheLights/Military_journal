'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListAttendanceApiAttendanceGet,
  useCreateBulkAttendanceSimpleApiAttendanceBulkSimplePost
} from '@/api/orval/client/attendance/attendance';
import { useListGroupsApiGroupsGet } from '@/api/orval/client/groups/groups';
import { useListStudentsApiStudentsGet } from '@/api/orval/client/students/students';

import {
  ClipboardCheck, Calendar, Users, Check, X,
  Save, ChevronDown, AlertCircle,
  CalendarDays, CalendarRange, Grid3X3
} from 'lucide-react';
import '@/styles/Management.css';

const STATUS_CONFIG = [
  { value: 'not_marked', label: 'Н/О', fullLabel: 'Не отмечено', color: '#6b7280' },
  { value: 'present', label: 'П', fullLabel: 'Присутствует', color: '#22c55e' },
  { value: 'absent', label: 'О', fullLabel: 'Отсутствует', color: '#ef4444' },
  { value: 'late', label: 'Оп', fullLabel: 'Опоздал', color: '#f59e0b' },
  { value: 'excused', label: 'Ув', fullLabel: 'Уваж. причина', color: '#3b82f6' }
];

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

// Helper functions
const getWeekStart = (date: Date | string) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

const getWeekDates = (startDate: Date | string) => {
  const dates = [];
  const start = new Date(startDate);
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
};

const getMonthDates = (year: number, month: number) => {
  const dates = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

const formatWeekRange = (weekDates: string[]) => {
  const start = new Date(weekDates[0]);
  const end = new Date(weekDates[6]);
  return `${start.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}`;
};

export default function AttendanceMarking() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';

  // Filters & State
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState('day'); // 'day', 'week', 'month'

  // Local editable data
  const [attendanceData, setAttendanceData] = useState<any>({});
  const [weekAttendance, setWeekAttendance] = useState<any>({});
  const [monthAttendance, setMonthAttendance] = useState<any>({});

  const [message, setMessage] = useState<any>(null);

  // Week/Month navigation state
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const monthDates = useMemo(() => getMonthDates(selectedYear, selectedMonth), [selectedYear, selectedMonth]);

  // Queries
  const { data: groupsData } = useListGroupsApiGroupsGet();
  const groups = Array.isArray(groupsData?.data) ? groupsData.data : [];

  const { data: studentsData, isLoading: isLoadingStudents } = useListStudentsApiStudentsGet(
    { group_id: selectedGroup ? parseInt(selectedGroup) : undefined },
    { query: { enabled: !!selectedGroup } } as any
  );
  const students = Array.isArray(studentsData?.data) ? studentsData.data : [];

  const attendanceParams = {
    group_id: selectedGroup ? parseInt(selectedGroup) : undefined,
    date_from: viewMode === 'day' ? selectedDate : (viewMode === 'week' ? weekDates[0] : monthDates[0]),
    date_to: viewMode === 'day' ? selectedDate : (viewMode === 'week' ? weekDates[6] : monthDates[monthDates.length - 1]),
    limit: 1000
  };

  const { data: fetchedAttendance, isLoading: isLoadingAttendance } = useListAttendanceApiAttendanceGet(
    attendanceParams,
    { query: { enabled: !!selectedGroup && students.length > 0 } } as any
  );

  // Mutations
  const createBulkMutation = useCreateBulkAttendanceSimpleApiAttendanceBulkSimplePost();

  // Initialize local state when students or fetched attendance changes
  useEffect(() => {
    if (students.length === 0) return;

    if (viewMode === 'day') {
      const initialDay: any = {};
      students.forEach(s => { initialDay[s.id] = { status: 'not_marked', notes: '' }; });

      const records = Array.isArray(fetchedAttendance?.data) ? fetchedAttendance.data : [];
      records.forEach((record: any) => {
        initialDay[record.student_id] = {
          status: record.status,
          notes: record.notes || ''
        };
      });
      setAttendanceData(initialDay);
    } else if (viewMode === 'week') {
      const initialWeek: any = {};
      weekDates.forEach(date => {
        initialWeek[date] = {};
        students.forEach(s => { initialWeek[date][s.id] = 'not_marked'; });
      });

      const records = Array.isArray(fetchedAttendance?.data) ? fetchedAttendance.data : [];
      records.forEach((record: any) => {
        if (initialWeek[record.date]) {
          initialWeek[record.date][record.student_id] = record.status;
        }
      });
      setWeekAttendance(initialWeek);
    } else if (viewMode === 'month') {
      const initialMonth: any = {};
      monthDates.forEach(date => {
        initialMonth[date] = {};
        students.forEach(s => { initialMonth[date][s.id] = 'not_marked'; });
      });

      const records = Array.isArray(fetchedAttendance?.data) ? fetchedAttendance.data : [];
      records.forEach((record: any) => {
        if (initialMonth[record.date]) {
          initialMonth[record.date][record.student_id] = record.status;
        }
      });
      setMonthAttendance(initialMonth);
    }
  }, [students, fetchedAttendance, viewMode, weekDates, monthDates, selectedDate]);

  // Event handlers
  const updateAttendance = (studentId: any, field: string, value: any) => {
    setAttendanceData((prev: any) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value }
    }));
  };

  const updateWeekAttendance = (date: string, studentId: any, status: string) => {
    setWeekAttendance((prev: any) => ({
      ...prev,
      [date]: { ...prev[date], [studentId]: status }
    }));
  };

  const updateMonthAttendance = (date: string, studentId: any, status: string) => {
    setMonthAttendance((prev: any) => ({
      ...prev,
      [date]: { ...prev[date], [studentId]: status }
    }));
  };

  const cycleStatus = (currentStatus: string) => {
    const statuses = STATUS_CONFIG.map(s => s.value);
    const currentIndex = statuses.indexOf(currentStatus);
    const nextIndex = (currentIndex + 1) % statuses.length;
    return statuses[nextIndex];
  };

  const markAllPresent = () => {
    const updated: any = {};
    students.forEach(student => {
      updated[student.id] = { status: 'present', notes: '' };
    });
    setAttendanceData(updated);
  };

  const navigateWeek = (direction: number) => {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() + (direction * 7));
    setWeekStart(newStart);
  };

  const navigateMonth = (direction: number) => {
    let newMonth = selectedMonth + direction;
    let newYear = selectedYear;

    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }

    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const saveAttendance = async () => {
    if (!selectedGroup || students.length === 0) return;

    if (viewMode === 'day') {
      const records = students
        .filter(s => attendanceData[s.id]?.status !== 'not_marked')
        .map(s => ({
          student_id: s.id,
          status: attendanceData[s.id].status as any,
          notes: attendanceData[s.id].notes || null
        }));

      if (records.length === 0) {
        setMessage({ type: 'error', text: 'Выберите статус хотя бы для одного студента' });
        return;
      }

      try {
        await createBulkMutation.mutateAsync({
          data: {
            group_id: parseInt(selectedGroup),
            date: selectedDate,
            records
          }
        });
        setMessage({ type: 'success', text: 'Посещаемость успешно сохранена!' });
        queryClient.invalidateQueries({ queryKey: getListAttendanceApiAttendanceGetQueryKey(attendanceParams) });
      } catch (error: any) {
        setMessage({ type: 'error', text: error.response?.data?.detail || 'Ошибка сохранения' });
      }
    } else {
      // For week/month, we save day by day
      const datesToSave = viewMode === 'week' ? weekDates : monthDates;
      const source = viewMode === 'week' ? weekAttendance : monthAttendance;

      let successCount = 0;
      let errorOccurred = false;

      for (const date of datesToSave) {
        const dayRecords = students
          .filter(s => source[date]?.[s.id] && source[date][s.id] !== 'not_marked')
          .map(s => ({
            student_id: s.id,
            status: source[date][s.id] as any,
            notes: null
          }));

        if (dayRecords.length === 0) continue;

        try {
          await createBulkMutation.mutateAsync({
            data: {
              group_id: parseInt(selectedGroup),
              date: date,
              records: dayRecords
            }
          });
          successCount++;
        } catch (error) {
          console.error(`Error saving attendance for ${date}:`, error);
          errorOccurred = true;
        }
      }

      if (successCount > 0) {
        setMessage({
          type: errorOccurred ? 'warning' : 'success',
          text: errorOccurred ? `Частично сохранено (успешно: ${successCount} дней)` : 'Все данные успешно сохранены!'
        });
        queryClient.invalidateQueries({ queryKey: getListAttendanceApiAttendanceGetQueryKey(attendanceParams) });
      } else if (errorOccurred) {
        setMessage({ type: 'error', text: 'Ошибка при сохранении данных' });
      }
    }
  };

  const getStatusStyle = (status: string) => {
    const config = STATUS_CONFIG.find(s => s.value === status);
    return config ? { backgroundColor: config.color, color: 'white' } : {};
  };

  const getStatusLabel = (status: string) => {
    const config = STATUS_CONFIG.find(s => s.value === status);
    return config ? config.label : '?';
  };

  if (!isTeacherOrAdmin) {
    return (
      <div className="management-page">
        <div className="empty-state">
          <AlertCircle size={48} />
          <h3>Доступ ограничен</h3>
          <p>Только преподаватели могут отмечать посещаемость</p>
        </div>
      </div>
    );
  }

  return (
    <div className="management-page">
      <div className="page-header">
        <div className="page-title">
          <ClipboardCheck size={28} />
          <h1>Отметка посещаемости</h1>
        </div>
        <button
          className="btn btn-primary"
          onClick={saveAttendance}
          disabled={createBulkMutation.isPending || students.length === 0}
        >
          <Save size={18} />
          {createBulkMutation.isPending ? 'Сохранение...' : 'Сохранить всё'}
        </button>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <div className="filters-bar">
        <div className="filter-group">
          <Users size={18} />
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
          >
            <option value="">Выберите группу</option>
            {groups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="select-arrow" />
        </div>

        <div className="view-toggle">
          <button
            className={`toggle-btn ${viewMode === 'day' ? 'active' : ''}`}
            onClick={() => setViewMode('day')}
            title="Дневной вид"
          >
            <CalendarDays size={18} />
            День
          </button>
          <button
            className={`toggle-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
            title="Недельный вид"
          >
            <CalendarRange size={18} />
            Неделя
          </button>
          <button
            className={`toggle-btn ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
            title="Месячный вид"
          >
            <Grid3X3 size={18} />
            Месяц
          </button>
        </div>

        {viewMode === 'day' ? (
          <>
            <div className="filter-group">
              <Calendar size={18} />
              <input
                type="date"
                className="form-input"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <button className="btn btn-outline" onClick={markAllPresent}>
              <Check size={18} />
              Все присутствуют
            </button>
          </>
        ) : viewMode === 'week' ? (
          <>
            <button className="btn btn-nav-icon" onClick={() => navigateWeek(-1)}>
              <span style={{ fontSize: '20px', fontWeight: 'bold' }}>‹</span>
            </button>
            <span className="period-label">{formatWeekRange(weekDates)}</span>
            <button className="btn btn-nav-icon" onClick={() => navigateWeek(1)}>
              <span style={{ fontSize: '20px', fontWeight: 'bold' }}>›</span>
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setWeekStart(getWeekStart(new Date()))}>
              Сейчас
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-nav-icon" onClick={() => navigateMonth(-1)}>
              <span style={{ fontSize: '20px', fontWeight: 'bold' }}>‹</span>
            </button>
            <select
              className="select-compact"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            >
              {MONTH_NAMES.map((name, idx) => (
                <option key={idx} value={idx}>{name}</option>
              ))}
            </select>
            <select
              className="select-compact"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {[2024, 2025, 2026].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <button className="btn btn-nav-icon" onClick={() => navigateMonth(1)}>
              <span style={{ fontSize: '20px', fontWeight: 'bold' }}>›</span>
            </button>
          </>
        )}
      </div>

      <div className="status-legend">
        {STATUS_CONFIG.map(status => (
          <div key={status.value} className="legend-item">
            <span className="legend-badge" style={{ backgroundColor: status.color }}>{status.label}</span>
            <span className="legend-label">{status.fullLabel}</span>
          </div>
        ))}
      </div>

      {isLoadingStudents || isLoadingAttendance ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Загрузка данных...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <h3>Выберите группу</h3>
          <p>Для начала работы выберите группу из списка</p>
        </div>
      ) : viewMode === 'day' ? (
        <div className="attendance-grid">
          {students.map((student, index) => (
            <div key={student.id} className="attendance-card">
              <div className="student-info">
                <span className="student-number">{index + 1}</span>
                <div className="avatar">
                  {student.first_name?.[0]}{student.last_name?.[0]}
                </div>
                <div className="student-name">
                  <span className="name">{student.last_name} {student.first_name}</span>
                  <span className="subtitle">{student.rank}</span>
                </div>
              </div>

              <div className="attendance-controls">
                <div className="status-buttons">
                  {STATUS_CONFIG.map(status => {
                    const isActive = attendanceData[student.id]?.status === status.value;
                    return (
                      <button
                        key={status.value}
                        type="button"
                        className={`status-btn-word ${isActive ? 'active' : ''}`}
                        style={isActive ? { backgroundColor: status.color, borderColor: status.color, color: 'white' } : {}}
                        onClick={() => updateAttendance(student.id, 'status', status.value)}
                      >
                        {status.fullLabel}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  className="notes-input"
                  placeholder="Примечание..."
                  value={attendanceData[student.id]?.notes || ''}
                  onChange={(e) => updateAttendance(student.id, 'notes', e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="week-view-container">
          <table className="week-table">
            <thead>
              <tr>
                <th className="student-col">Курсант</th>
                {(viewMode === 'week' ? weekDates : monthDates).map((date, idx) => {
                  const dayIdx = new Date(date).getDay();
                  const displayIdx = dayIdx === 0 ? 6 : dayIdx - 1;
                  return (
                    <th key={date} className="day-col">
                      <div className="day-header">
                        <span className="day-name">{DAY_NAMES[displayIdx]}</span>
                        <span className="day-date">{formatDate(date)}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => (
                <tr key={student.id}>
                  <td className="student-col">
                    <div className="student-row-info">
                      <span className="student-number">{index + 1}</span>
                      <span className="student-name-short">
                        {student.last_name} {student.first_name?.[0]}.
                      </span>
                    </div>
                  </td>
                  {(viewMode === 'week' ? weekDates : monthDates).map((date) => {
                    const source = viewMode === 'week' ? weekAttendance : monthAttendance;
                    const status = source[date]?.[student.id] || 'not_marked';
                    return (
                      <td key={date} className="status-cell">
                        <button
                          className="status-badge"
                          style={getStatusStyle(status)}
                          onClick={() => {
                            const newStatus = cycleStatus(status);
                            if (viewMode === 'week') updateWeekAttendance(date, student.id, newStatus);
                            else updateMonthAttendance(date, student.id, newStatus);
                          }}
                        >
                          {getStatusLabel(status)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Helper to get query key for invalidation
function getListAttendanceApiAttendanceGetQueryKey(params: any) {
  return [`/api/attendance/`, ...(params ? [params] : [])];
}
