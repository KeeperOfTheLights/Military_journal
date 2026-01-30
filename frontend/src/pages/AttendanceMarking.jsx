import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI, groupsAPI } from '../api/auth';
import { 
  ClipboardCheck, Calendar, Users, Check, X, 
  Save, ChevronDown, AlertCircle, ChevronLeft, ChevronRight,
  CalendarDays, CalendarRange, Grid3X3
} from 'lucide-react';
import './Management.css';

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
const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

const getWeekDates = (startDate) => {
  const dates = [];
  const start = new Date(startDate);
  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
};

const getMonthDates = (year, month) => {
  const dates = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates;
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

const formatDayOnly = (dateStr) => {
  const date = new Date(dateStr);
  return date.getDate();
};

const getDayOfWeek = (dateStr) => {
  const date = new Date(dateStr);
  const day = date.getDay();
  return day === 0 ? 6 : day - 1; // Convert to Monday = 0
};

const formatWeekRange = (weekDates) => {
  const start = new Date(weekDates[0]);
  const end = new Date(weekDates[6]);
  return `${start.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}`;
};

export default function AttendanceMarking() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  
  // View mode state
  const [viewMode, setViewMode] = useState('day'); // 'day', 'week', 'month'
  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));
  const [weekAttendance, setWeekAttendance] = useState({});
  
  // Month state
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthAttendance, setMonthAttendance] = useState({});

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';
  const weekDates = getWeekDates(weekStart);
  const monthDates = getMonthDates(selectedYear, selectedMonth);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadStudents();
    } else {
      setStudents([]);
      setAttendanceData({});
      setWeekAttendance({});
      setMonthAttendance({});
    }
  }, [selectedGroup]);

  // Load attendance based on view mode
  useEffect(() => {
    if (selectedGroup && students.length > 0) {
      if (viewMode === 'day') {
        loadExistingAttendance();
      } else if (viewMode === 'week') {
        loadWeekAttendance();
      } else if (viewMode === 'month') {
        loadMonthAttendance();
      }
    }
  }, [selectedDate, students, viewMode, weekStart, selectedMonth, selectedYear]);

  const loadGroups = async () => {
    try {
      const data = await groupsAPI.getAll();
      setGroups(data);
      if (data.length > 0) {
        setSelectedGroup(data[0].id);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await groupsAPI.getStudents(selectedGroup);
      setStudents(data);
      
      const initialData = {};
      data.forEach(student => {
        initialData[student.id] = { status: 'not_marked', notes: '' };
      });
      setAttendanceData(initialData);
      
    } catch (error) {
      console.error('Error loading students:', error);
      setStudents([]);
      setAttendanceData({});
    } finally {
      setLoading(false);
    }
  };

  const loadExistingAttendance = async () => {
    try {
      const resetData = {};
      students.forEach(student => {
        resetData[student.id] = { status: 'not_marked', notes: '' };
      });
      
      const data = await attendanceAPI.getAll({ 
        group_id: selectedGroup, 
        date_from: selectedDate,
        date_to: selectedDate 
      });
      
      if (data && data.length > 0) {
        data.forEach(record => {
          resetData[record.student_id] = {
            status: record.status,
            notes: record.reason || ''
          };
        });
      }
      
      setAttendanceData(resetData);
    } catch (error) {
      console.error('Error loading existing attendance:', error);
    }
  };

  const loadWeekAttendance = async () => {
    try {
      const weekData = {};
      weekDates.forEach(date => {
        weekData[date] = {};
        students.forEach(student => {
          weekData[date][student.id] = 'not_marked';
        });
      });
      
      const data = await attendanceAPI.getAll({ 
        group_id: selectedGroup, 
        date_from: weekDates[0],
        date_to: weekDates[6]
      });
      
      if (data && data.length > 0) {
        data.forEach(record => {
          const recordDate = record.date;
          if (weekData[recordDate]) {
            weekData[recordDate][record.student_id] = record.status;
          }
        });
      }
      
      setWeekAttendance(weekData);
    } catch (error) {
      console.error('Error loading week attendance:', error);
    }
  };

  const loadMonthAttendance = async () => {
    try {
      const monthData = {};
      monthDates.forEach(date => {
        monthData[date] = {};
        students.forEach(student => {
          monthData[date][student.id] = 'not_marked';
        });
      });
      
      const data = await attendanceAPI.getAll({ 
        group_id: selectedGroup, 
        date_from: monthDates[0],
        date_to: monthDates[monthDates.length - 1],
        limit: 1000
      });
      
      if (data && data.length > 0) {
        data.forEach(record => {
          const recordDate = record.date;
          if (monthData[recordDate]) {
            monthData[recordDate][record.student_id] = record.status;
          }
        });
      }
      
      setMonthAttendance(monthData);
    } catch (error) {
      console.error('Error loading month attendance:', error);
    }
  };

  const updateAttendance = (studentId, field, value) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value }
    }));
  };

  const updateWeekAttendance = (date, studentId, status) => {
    setWeekAttendance(prev => ({
      ...prev,
      [date]: { ...prev[date], [studentId]: status }
    }));
  };

  const updateMonthAttendance = (date, studentId, status) => {
    setMonthAttendance(prev => ({
      ...prev,
      [date]: { ...prev[date], [studentId]: status }
    }));
  };

  const cycleStatus = (currentStatus) => {
    const statuses = STATUS_CONFIG.map(s => s.value);
    const currentIndex = statuses.indexOf(currentStatus);
    const nextIndex = (currentIndex + 1) % statuses.length;
    return statuses[nextIndex];
  };

  const markAllPresent = () => {
    const updated = {};
    students.forEach(student => {
      updated[student.id] = { status: 'present', notes: '' };
    });
    setAttendanceData(updated);
  };

  const navigateWeek = (direction) => {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() + (direction * 7));
    setWeekStart(newStart);
  };

  const navigateMonth = (direction) => {
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

  const goToCurrentWeek = () => {
    setWeekStart(getWeekStart(new Date()));
  };

  const goToCurrentMonth = () => {
    setSelectedMonth(new Date().getMonth());
    setSelectedYear(new Date().getFullYear());
  };

  const saveAttendance = async () => {
    if (!selectedGroup || students.length === 0) return;
    
    const markedStudents = students.filter(
      student => attendanceData[student.id]?.status && attendanceData[student.id]?.status !== 'not_marked'
    );
    
    if (markedStudents.length === 0) {
      setMessage({ type: 'error', text: 'Выберите статус хотя бы для одного студента' });
      return;
    }
    
    setSaving(true);
    setMessage(null);
    
    try {
      const records = markedStudents.map(student => ({
        student_id: student.id,
        status: attendanceData[student.id]?.status,
        notes: attendanceData[student.id]?.notes || null
      }));
      
      const result = await attendanceAPI.createBulkSimple({ 
        group_id: parseInt(selectedGroup),
        date: selectedDate,
        records 
      });
      
      const skippedCount = students.length - markedStudents.length;
      
      let msgParts = [];
      if (result.created > 0) msgParts.push(`создано: ${result.created}`);
      if (result.updated > 0) msgParts.push(`изменено: ${result.updated}`);
      if (result.unchanged > 0) msgParts.push(`без изменений: ${result.unchanged}`);
      if (skippedCount > 0) msgParts.push(`пропущено: ${skippedCount}`);
      
      const details = msgParts.length > 0 ? ` (${msgParts.join(', ')})` : '';
      setMessage({ type: 'success', text: `Посещаемость сохранена!${details}` });
    } catch (error) {
      console.error('Error saving attendance:', error);
      const errorMsg = error.response?.data?.error?.message || 
                       error.response?.data?.detail || 
                       'Ошибка сохранения';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setSaving(false);
    }
  };

  const savePeriodAttendance = async (date, sourceData) => {
    if (!selectedGroup || students.length === 0) return;
    
    const dayData = sourceData[date] || {};
    const markedStudents = students.filter(
      student => dayData[student.id] && dayData[student.id] !== 'not_marked'
    );
    
    if (markedStudents.length === 0) {
      setMessage({ type: 'error', text: `Нет отмеченных студентов на ${formatDate(date)}` });
      return;
    }
    
    setSaving(true);
    setMessage(null);
    
    try {
      const records = markedStudents.map(student => ({
        student_id: student.id,
        status: dayData[student.id],
        notes: null
      }));
      
      const result = await attendanceAPI.createBulkSimple({ 
        group_id: parseInt(selectedGroup),
        date: date,
        records 
      });
      
      let msgParts = [];
      if (result.created > 0) msgParts.push(`создано: ${result.created}`);
      if (result.updated > 0) msgParts.push(`изменено: ${result.updated}`);
      
      const details = msgParts.length > 0 ? ` (${msgParts.join(', ')})` : '';
      setMessage({ type: 'success', text: `${formatDate(date)}: сохранено!${details}` });
    } catch (error) {
      console.error('Error saving attendance:', error);
      setMessage({ type: 'error', text: 'Ошибка сохранения' });
    } finally {
      setSaving(false);
    }
  };

  // Save all attendance for week/month at once
  const saveAllPeriodAttendance = async (dates, sourceData) => {
    if (!selectedGroup || students.length === 0) return;
    
    setSaving(true);
    setMessage(null);
    
    let totalCreated = 0;
    let totalUpdated = 0;
    let daysWithChanges = 0;
    
    try {
      for (const date of dates) {
        const dayData = sourceData[date] || {};
        const markedStudents = students.filter(
          student => dayData[student.id] && dayData[student.id] !== 'not_marked'
        );
        
        if (markedStudents.length === 0) continue;
        
        const records = markedStudents.map(student => ({
          student_id: student.id,
          status: dayData[student.id],
          notes: null
        }));
        
        const result = await attendanceAPI.createBulkSimple({ 
          group_id: parseInt(selectedGroup),
          date: date,
          records 
        });
        
        totalCreated += result.created || 0;
        totalUpdated += result.updated || 0;
        
        // Count days only if there were actual changes
        if ((result.created || 0) > 0 || (result.updated || 0) > 0) {
          daysWithChanges++;
        }
      }
      
      if (totalCreated === 0 && totalUpdated === 0) {
        setMessage({ type: 'error', text: 'Нет изменений для сохранения' });
        return;
      }
      
      let msgParts = [];
      if (totalCreated > 0) msgParts.push(`создано: ${totalCreated}`);
      if (totalUpdated > 0) msgParts.push(`изменено: ${totalUpdated}`);
      if (daysWithChanges > 0) msgParts.push(`дней: ${daysWithChanges}`);
      
      const details = msgParts.length > 0 ? ` (${msgParts.join(', ')})` : '';
      setMessage({ type: 'success', text: `Посещаемость сохранена!${details}` });
    } catch (error) {
      console.error('Error saving attendance:', error);
      setMessage({ type: 'error', text: 'Ошибка сохранения' });
    } finally {
      setSaving(false);
    }
  };

  const getStatusStyle = (status) => {
    const config = STATUS_CONFIG.find(s => s.value === status);
    return config ? { backgroundColor: config.color, color: 'white' } : {};
  };

  const getStatusLabel = (status) => {
    const config = STATUS_CONFIG.find(s => s.value === status);
    return config ? config.label : '?';
  };

  // Calculate student stats for month view
  const getStudentMonthStats = (studentId) => {
    let present = 0, absent = 0, late = 0, excused = 0, total = 0;
    
    monthDates.forEach(date => {
      const status = monthAttendance[date]?.[studentId];
      if (status && status !== 'not_marked') {
        total++;
        if (status === 'present') present++;
        else if (status === 'absent') absent++;
        else if (status === 'late') late++;
        else if (status === 'excused') excused++;
      }
    });
    
    return { present, absent, late, excused, total };
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
          onClick={() => {
            if (viewMode === 'day') saveAttendance();
            else if (viewMode === 'week') saveAllPeriodAttendance(weekDates, weekAttendance);
            else if (viewMode === 'month') saveAllPeriodAttendance(monthDates, monthAttendance);
          }}
          disabled={saving || students.length === 0}
        >
          <Save size={18} />
          {saving ? 'Сохранение...' : 'Сохранить всё'}
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

        {/* View mode toggle */}
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
            
            <button className="btn btn-outline" onClick={() => {
              const reset = {};
              students.forEach(s => { reset[s.id] = { status: 'not_marked', notes: '' }; });
              setAttendanceData(reset);
            }}>
              <X size={18} />
              Сбросить
            </button>
          </>
        ) : viewMode === 'week' ? (
          <>
            <button className="btn btn-nav-icon" onClick={() => navigateWeek(-1)} title="Предыдущая неделя">
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>‹</span>
            </button>
            <span className="period-label">{formatWeekRange(weekDates)}</span>
            <button className="btn btn-nav-icon" onClick={() => navigateWeek(1)} title="Следующая неделя">
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>›</span>
            </button>
            <input
              type="date"
              className="date-picker-compact"
              value={weekDates[0]}
              onChange={(e) => setWeekStart(getWeekStart(new Date(e.target.value)))}
              title="Выбрать неделю"
            />
            <button className="btn btn-outline btn-sm" onClick={goToCurrentWeek}>
              Сейчас
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-nav-icon" onClick={() => navigateMonth(-1)} title="Предыдущий месяц">
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>‹</span>
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
              {Array.from({ length: 10 }, (_, i) => selectedYear - 5 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <button className="btn btn-nav-icon" onClick={() => navigateMonth(1)} title="Следующий месяц">
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>›</span>
            </button>
            <button className="btn btn-outline btn-sm" onClick={goToCurrentMonth}>
              Сейчас
            </button>
          </>
        )}
      </div>

      {/* Status legend */}
      <div className="status-legend">
        {STATUS_CONFIG.map(status => (
          <div key={status.value} className="legend-item">
            <span 
              className="legend-badge" 
              style={{ backgroundColor: status.color }}
            >
              {status.label}
            </span>
            <span className="legend-label">{status.fullLabel}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Загрузка студентов...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <h3>Выберите группу</h3>
          <p>Выберите группу для отметки посещаемости</p>
        </div>
      ) : viewMode === 'day' ? (
        /* Daily view */
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
                  <span className="subtitle">{student.middle_name}</span>
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
                        style={isActive ? { 
                          backgroundColor: status.color, 
                          borderColor: status.color,
                          color: 'white' 
                        } : {}}
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
      ) : viewMode === 'week' ? (
        /* Weekly view */
        <div className="week-view-container">
          <table className="week-table">
            <thead>
              <tr>
                <th className="student-col">Студент</th>
                {weekDates.map((date, idx) => {
                  const isToday = date === new Date().toISOString().split('T')[0];
                  return (
                    <th key={date} className={`day-col ${isToday ? 'today' : ''}`}>
                      <div className="day-header">
                        <span className="day-name">{DAY_NAMES[idx]}</span>
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
                  {weekDates.map((date) => {
                    const status = weekAttendance[date]?.[student.id] || 'not_marked';
                    const isToday = date === new Date().toISOString().split('T')[0];
                    return (
                      <td key={date} className={`status-cell ${isToday ? 'today' : ''}`}>
                        <button
                          className="status-badge"
                          style={getStatusStyle(status)}
                          onClick={() => updateWeekAttendance(date, student.id, cycleStatus(status))}
                          title={`Кликните для смены статуса`}
                        >
                          {getStatusLabel(status)}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="student-col">
                  <strong>Сохранить:</strong>
                </td>
                {weekDates.map((date) => (
                  <td key={date} className="save-cell">
                    <button
                      className="btn btn-sm btn-save-day"
                      onClick={() => savePeriodAttendance(date, weekAttendance)}
                      disabled={saving}
                      title={`Сохранить ${formatDate(date)}`}
                    >
                      <Save size={14} />
                    </button>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        /* Monthly view */
        <div className="month-view-container">
          <table className="month-table">
            <thead>
              <tr>
                <th className="student-col-month">Студент</th>
                {monthDates.map((date) => {
                  const isToday = date === new Date().toISOString().split('T')[0];
                  const dayOfWeek = getDayOfWeek(date);
                  const isWeekend = dayOfWeek >= 5;
                  return (
                    <th 
                      key={date} 
                      className={`day-col-month ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}`}
                      title={`${DAY_NAMES[dayOfWeek]}, ${formatDate(date)}`}
                    >
                      <div className="day-header-month">
                        <span className="day-num">{formatDayOnly(date)}</span>
                        <span className="day-abbr">{DAY_NAMES[dayOfWeek]}</span>
                      </div>
                    </th>
                  );
                })}
                <th className="stats-col">Статистика</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => {
                const stats = getStudentMonthStats(student.id);
                return (
                  <tr key={student.id}>
                    <td className="student-col-month">
                      <div className="student-row-info">
                        <span className="student-number">{index + 1}</span>
                        <span className="student-name-short">
                          {student.last_name} {student.first_name?.[0]}.
                        </span>
                      </div>
                    </td>
                    {monthDates.map((date) => {
                      const status = monthAttendance[date]?.[student.id] || 'not_marked';
                      const isToday = date === new Date().toISOString().split('T')[0];
                      const dayOfWeek = getDayOfWeek(date);
                      const isWeekend = dayOfWeek >= 5;
                      return (
                        <td 
                          key={date} 
                          className={`status-cell-month ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''}`}
                        >
                          <button
                            className="status-badge-small"
                            style={getStatusStyle(status)}
                            onClick={() => updateMonthAttendance(date, student.id, cycleStatus(status))}
                            title={`${DAY_NAMES[dayOfWeek]}, ${formatDate(date)}`}
                          >
                            {getStatusLabel(status)}
                          </button>
                        </td>
                      );
                    })}
                    <td className="stats-col">
                      <div className="student-stats">
                        <span className="stat-item stat-present" title="Присутствовал">{stats.present}</span>
                        <span className="stat-item stat-absent" title="Отсутствовал">{stats.absent}</span>
                        <span className="stat-item stat-late" title="Опоздал">{stats.late}</span>
                        <span className="stat-item stat-excused" title="Уваж. причина">{stats.excused}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="student-col-month">
                  <strong>Сохранить:</strong>
                </td>
                {monthDates.map((date) => {
                  const dayOfWeek = getDayOfWeek(date);
                  const isWeekend = dayOfWeek >= 5;
                  return (
                    <td key={date} className={`save-cell-month ${isWeekend ? 'weekend' : ''}`}>
                      <button
                        className="btn-save-month"
                        onClick={() => savePeriodAttendance(date, monthAttendance)}
                        disabled={saving}
                        title={`Сохранить ${formatDate(date)}`}
                      >
                        <Save size={10} />
                      </button>
                    </td>
                  );
                })}
                <td className="stats-col"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
