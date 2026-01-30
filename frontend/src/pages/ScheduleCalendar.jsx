import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { scheduleAPI, groupsAPI, subjectsAPI, teachersAPI } from '../api/auth';
import { 
  Calendar, Plus, Edit2, Trash2, Clock, MapPin, 
  Users, BookOpen, X, Check, ChevronDown, AlertCircle,
  ChevronLeft, ChevronRight, Copy
} from 'lucide-react';
import './Management.css';

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function ScheduleCalendar() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState([]);
  const [groups, setGroups] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    group_id: '',
    subject_id: '',
    teacher_id: '',
    specific_date: '',
    start_time: '09:00',
    end_time: '10:30',
    room: '',
    semester: 1,
    academic_year: '2025-2026',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);
  const [monthlyItems, setMonthlyItems] = useState([]);

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';

  const timeSlots = [
    { start: '08:00', end: '09:30' },
    { start: '09:40', end: '11:10' },
    { start: '11:20', end: '12:50' },
    { start: '13:30', end: '15:00' },
    { start: '15:10', end: '16:40' },
    { start: '16:50', end: '18:20' },
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadSchedule();
    }
  }, [selectedGroup, currentMonth, currentYear]);

  const loadInitialData = async () => {
    try {
      const [groupsData, subjectsData, teachersData] = await Promise.all([
        groupsAPI.getAll(),
        subjectsAPI.getAll(),
        teachersAPI.getAll()
      ]);
      setGroups(groupsData);
      setSubjects(subjectsData);
      setTeachers(teachersData);
      
      if (groupsData.length > 0) {
        setSelectedGroup(groupsData[0].id);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const firstDay = new Date(currentYear, currentMonth, 1);
      const lastDay = new Date(currentYear, currentMonth + 1, 0);
      
      const data = await scheduleAPI.getByDateRange(
        selectedGroup,
        firstDay.toISOString().split('T')[0],
        lastDay.toISOString().split('T')[0]
      );
      setSchedule(data);
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    
    const days = [];
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getScheduleForDate = (day) => {
    if (!day) return [];
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return schedule
      .filter(item => item.specific_date === dateStr)
      .sort((a, b) => a.start_time?.localeCompare(b.start_time));
  };

  const navigateMonth = (direction) => {
    let newMonth = currentMonth + direction;
    let newYear = currentYear;
    
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  const openAddModal = (day) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setEditingItem(null);
    setFormData({
      group_id: selectedGroup,
      subject_id: subjects[0]?.id || '',
      teacher_id: teachers[0]?.id || '',
      specific_date: dateStr,
      start_time: '09:00',
      end_time: '10:30',
      room: '',
      semester: 1,
      academic_year: '2025-2026',
    });
    setMessage(null);
    setShowModal(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      group_id: item.group_id,
      subject_id: item.subject_id,
      teacher_id: item.teacher_id,
      specific_date: item.specific_date,
      start_time: item.start_time?.slice(0, 5) || '09:00',
      end_time: item.end_time?.slice(0, 5) || '10:30',
      room: item.room || '',
      semester: item.semester || 1,
      academic_year: item.academic_year || '2025-2026',
    });
    setMessage(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    
    try {
      const payload = {
        group_id: parseInt(formData.group_id),
        subject_id: parseInt(formData.subject_id),
        teacher_id: parseInt(formData.teacher_id),
        specific_date: formData.specific_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        room: formData.room || 'TBD',
        semester: parseInt(formData.semester),
        academic_year: formData.academic_year,
      };
      
      if (editingItem) {
        await scheduleAPI.update(editingItem.id, payload);
        setMessage({ type: 'success', text: 'Занятие обновлено!' });
      } else {
        await scheduleAPI.create(payload);
        setMessage({ type: 'success', text: 'Занятие добавлено!' });
      }
      
      setTimeout(() => {
        setShowModal(false);
        loadSchedule();
      }, 1000);
    } catch (error) {
      console.error('Error saving schedule:', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Ошибка сохранения' });
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id) => {
    if (!confirm('Удалить это занятие?')) return;
    
    try {
      await scheduleAPI.delete(id);
      loadSchedule();
    } catch (error) {
      alert('Ошибка удаления');
    }
  };

  const copyWeek = async () => {
    if (!selectedDate) {
      alert('Выберите дату для копирования');
      return;
    }
    
    const targetDate = prompt('Введите целевую дату (YYYY-MM-DD):');
    if (!targetDate) return;
    
    try {
      const result = await scheduleAPI.copyWeek(selectedDate, targetDate, selectedGroup);
      alert(`Скопировано ${result.created} занятий`);
      loadSchedule();
    } catch (error) {
      alert('Ошибка копирования');
    }
  };

  const openMonthlyModal = () => {
    setMonthlyItems([{
      id: Date.now(),
      subject_id: subjects[0]?.id || '',
      teacher_id: teachers[0]?.id || '',
      specific_date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`,
      start_time: '09:00',
      end_time: '10:30',
      room: '',
    }]);
    setShowMonthlyModal(true);
  };

  const addMonthlyItem = () => {
    setMonthlyItems([...monthlyItems, {
      id: Date.now(),
      subject_id: subjects[0]?.id || '',
      teacher_id: teachers[0]?.id || '',
      specific_date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`,
      start_time: '09:00',
      end_time: '10:30',
      room: '',
    }]);
  };

  const updateMonthlyItem = (id, field, value) => {
    setMonthlyItems(monthlyItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeMonthlyItem = (id) => {
    setMonthlyItems(monthlyItems.filter(item => item.id !== id));
  };

  const handleMonthlySubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    
    try {
      const payload = {
        group_id: parseInt(selectedGroup),
        year: currentYear,
        month: currentMonth + 1,
        semester: currentMonth >= 8 || currentMonth <= 0 ? 1 : 2,
        academic_year: '2025-2026',
        schedule_items: monthlyItems.map(item => ({
          subject_id: parseInt(item.subject_id),
          teacher_id: parseInt(item.teacher_id),
          specific_date: item.specific_date,
          start_time: item.start_time,
          end_time: item.end_time,
          room: item.room || 'TBD',
        })),
      };
      
      const result = await scheduleAPI.createMonthly(payload);
      alert(`Создано ${result.created} занятий, пропущено ${result.skipped}`);
      setShowMonthlyModal(false);
      loadSchedule();
    } catch (error) {
      console.error('Error creating monthly schedule:', error);
      alert(error.response?.data?.detail || 'Ошибка создания расписания');
    } finally {
      setSaving(false);
    }
  };

  const getSubjectName = (id) => subjects.find(s => s.id === id)?.name || '—';
  const getTeacherName = (id) => {
    const t = teachers.find(t => t.id === id);
    return t ? `${t.last_name} ${t.first_name?.[0]}.` : '—';
  };

  if (!isTeacherOrAdmin) {
    return (
      <div className="management-page">
        <div className="empty-state">
          <AlertCircle size={48} />
          <h3>Доступ ограничен</h3>
          <p>Только преподаватели могут управлять расписанием</p>
        </div>
      </div>
    );
  }

  const days = getDaysInMonth();
  const today = new Date();
  const isToday = (day) => {
    return day && 
           currentYear === today.getFullYear() && 
           currentMonth === today.getMonth() && 
           day === today.getDate();
  };

  return (
    <div className="management-page">
      <div className="page-header">
        <div className="page-title">
          <Calendar size={28} />
          <h1>Календарь расписания</h1>
        </div>
        <button className="btn btn-primary" onClick={openMonthlyModal}>
          <Plus size={18} />
          Создать на месяц
        </button>
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <Users size={18} />
          <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}>
            <option value="">Выберите группу</option>
            {groups.map(group => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>
          <ChevronDown size={16} className="select-arrow" />
        </div>

        <button className="btn btn-nav-icon" onClick={() => navigateMonth(-1)}>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>‹</span>
        </button>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            className="select-compact"
            value={currentMonth}
            onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={idx} value={idx}>{name}</option>
            ))}
          </select>
          <select
            className="select-compact"
            value={currentYear}
            onChange={(e) => setCurrentYear(parseInt(e.target.value))}
          >
            {Array.from({ length: 5 }, (_, i) => currentYear - 2 + i).map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-nav-icon" onClick={() => navigateMonth(1)}>
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>›</span>
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Загрузка расписания...</p>
        </div>
      ) : !selectedGroup ? (
        <div className="empty-state">
          <Calendar size={48} />
          <h3>Выберите группу</h3>
        </div>
      ) : (
        <div className="calendar-grid">
          <div className="calendar-header">
            {DAY_NAMES.map(day => (
              <div key={day} className="calendar-day-name">{day}</div>
            ))}
          </div>
          <div className="calendar-body">
            {days.map((day, index) => {
              const daySchedule = day ? getScheduleForDate(day) : [];
              return (
                <div 
                  key={index} 
                  className={`calendar-cell ${!day ? 'empty' : ''} ${isToday(day) ? 'today' : ''}`}
                  onClick={() => day && openAddModal(day)}
                >
                  {day && (
                    <>
                      <div className="calendar-date">{day}</div>
                      <div className="calendar-events">
                        {daySchedule.slice(0, 3).map((item, idx) => (
                          <div 
                            key={item.id} 
                            className="calendar-event"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(item);
                            }}
                          >
                            <Clock size={10} />
                            <span>{item.start_time?.slice(0, 5)}</span>
                            <span className="event-subject">{getSubjectName(item.subject_id)}</span>
                          </div>
                        ))}
                        {daySchedule.length > 3 && (
                          <div className="calendar-event-more">
                            +{daySchedule.length - 3} ещё
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly Schedule Modal */}
      {showMonthlyModal && (
        <div className="modal-overlay" onClick={() => setShowMonthlyModal(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Создать расписание на {MONTH_NAMES[currentMonth]} {currentYear}</h2>
              <button className="btn-close" onClick={() => setShowMonthlyModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleMonthlySubmit}>
              <div className="modal-body">
                <div className="section-header">
                  <h3>Занятия на месяц</h3>
                  <button type="button" className="btn btn-sm btn-outline" onClick={addMonthlyItem}>
                    <Plus size={16} />
                    Добавить занятие
                  </button>
                </div>

                <div className="monthly-items-list">
                  {monthlyItems.map((item, index) => (
                    <div key={item.id} className="bulk-schedule-item">
                      <div className="item-header">
                        <span className="item-number">Занятие {index + 1}</span>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => removeMonthlyItem(item.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Дата *</label>
                          <input
                            type="date"
                            className="form-input"
                            value={item.specific_date}
                            onChange={(e) => updateMonthlyItem(item.id, 'specific_date', e.target.value)}
                            min={`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`}
                            max={`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${new Date(currentYear, currentMonth + 1, 0).getDate()}`}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Предмет *</label>
                          <select
                            className="form-input"
                            value={item.subject_id}
                            onChange={(e) => updateMonthlyItem(item.id, 'subject_id', e.target.value)}
                            required
                          >
                            <option value="">Выберите</option>
                            {subjects.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Преподаватель *</label>
                          <select
                            className="form-input"
                            value={item.teacher_id}
                            onChange={(e) => updateMonthlyItem(item.id, 'teacher_id', e.target.value)}
                            required
                          >
                            <option value="">Выберите</option>
                            {teachers.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.last_name} {t.first_name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Аудитория *</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="301"
                            value={item.room}
                            onChange={(e) => updateMonthlyItem(item.id, 'room', e.target.value)}
                            required
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Начало *</label>
                          <select
                            className="form-input"
                            value={item.start_time}
                            onChange={(e) => {
                              const slot = timeSlots.find(s => s.start === e.target.value);
                              updateMonthlyItem(item.id, 'start_time', e.target.value);
                              if (slot) updateMonthlyItem(item.id, 'end_time', slot.end);
                            }}
                            required
                          >
                            {timeSlots.map(slot => (
                              <option key={slot.start} value={slot.start}>{slot.start}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Конец *</label>
                          <select
                            className="form-input"
                            value={item.end_time}
                            onChange={(e) => updateMonthlyItem(item.id, 'end_time', e.target.value)}
                            required
                          >
                            {timeSlots.map(slot => (
                              <option key={slot.end} value={slot.end}>{slot.end}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowMonthlyModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Check size={18} />
                  {saving ? 'Создание...' : `Создать ${monthlyItems.length} занятий`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingItem ? 'Редактировать занятие' : 'Добавить занятие'}</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {message && (
                  <div className={`alert alert-${message.type}`}>
                    {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                    {message.text}
                  </div>
                )}
                
                <div className="form-group">
                  <label className="form-label">Дата *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.specific_date}
                    onChange={(e) => setFormData({ ...formData, specific_date: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Предмет *</label>
                  <select
                    className="form-input"
                    value={formData.subject_id}
                    onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                    required
                  >
                    <option value="">Выберите предмет</option>
                    {subjects.map(subject => (
                      <option key={subject.id} value={subject.id}>{subject.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Преподаватель *</label>
                  <select
                    className="form-input"
                    value={formData.teacher_id}
                    onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                    required
                  >
                    <option value="">Выберите преподавателя</option>
                    {teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.last_name} {teacher.first_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Начало *</label>
                    <select
                      className="form-input"
                      value={formData.start_time}
                      onChange={(e) => {
                        const slot = timeSlots.find(s => s.start === e.target.value);
                        setFormData({ 
                          ...formData, 
                          start_time: e.target.value,
                          end_time: slot?.end || formData.end_time
                        });
                      }}
                      required
                    >
                      {timeSlots.map(slot => (
                        <option key={slot.start} value={slot.start}>{slot.start}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Конец *</label>
                    <select
                      className="form-input"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      required
                    >
                      {timeSlots.map(slot => (
                        <option key={slot.end} value={slot.end}>{slot.end}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Аудитория *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Например: 301"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    required
                  />
                </div>

                {editingItem && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => deleteItem(editingItem.id)}
                    style={{ width: '100%', marginTop: '1rem' }}
                  >
                    <Trash2 size={16} />
                    Удалить занятие
                  </button>
                )}
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Check size={18} />
                  {saving ? 'Сохранение...' : (editingItem ? 'Сохранить' : 'Добавить')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
