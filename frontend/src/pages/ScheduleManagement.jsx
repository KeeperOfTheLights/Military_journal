import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { scheduleAPI, groupsAPI, subjectsAPI, teachersAPI } from '../api/auth';
import { 
  Calendar, Plus, Edit2, Trash2, Clock, MapPin, 
  Users, BookOpen, X, Check, ChevronDown, AlertCircle,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import './Management.css';

export default function ScheduleManagement() {
  const { user } = useAuth();
  const [schedule, setSchedule] = useState([]);
  const [groups, setGroups] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    group_id: '',
    subject_id: '',
    teacher_id: '',
    day_of_week: 'monday',
    start_time: '09:00',
    end_time: '10:30',
    room: '',
    lesson_type: 'lecture',
    semester: 1,
    academic_year: '2025-2026',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';

  const daysOfWeek = [
    { value: 'monday', label: 'Понедельник', short: 'Пн' },
    { value: 'tuesday', label: 'Вторник', short: 'Вт' },
    { value: 'wednesday', label: 'Среда', short: 'Ср' },
    { value: 'thursday', label: 'Четверг', short: 'Чт' },
    { value: 'friday', label: 'Пятница', short: 'Пт' },
    { value: 'saturday', label: 'Суббота', short: 'Сб' },
  ];

  const lessonTypes = [
    { value: 'lecture', label: 'Лекция', color: '#3b82f6' },
    { value: 'seminar', label: 'Семинар', color: '#22c55e' },
    { value: 'practice', label: 'Практика', color: '#f59e0b' },
    { value: 'lab', label: 'Лабораторная', color: '#8b5cf6' },
    { value: 'exam', label: 'Экзамен', color: '#ef4444' },
  ];

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
  }, [selectedGroup]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const loadSchedule = async () => {
    try {
      const data = await scheduleAPI.getByGroup(selectedGroup);
      setSchedule(data);
    } catch (error) {
      console.error('Error loading schedule:', error);
    }
  };

  const openAddModal = (dayOfWeek = 'monday', timeSlot = null) => {
    setEditingItem(null);
    setFormData({
      group_id: selectedGroup,
      subject_id: subjects[0]?.id || '',
      teacher_id: teachers[0]?.id || '',
      day_of_week: dayOfWeek,
      start_time: timeSlot?.start || '09:00',
      end_time: timeSlot?.end || '10:30',
      room: '',
      lesson_type: 'lecture',
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
      day_of_week: item.day_of_week,
      start_time: item.start_time?.slice(0, 5) || '09:00',
      end_time: item.end_time?.slice(0, 5) || '10:30',
      room: item.room || '',
      lesson_type: item.lesson_type || 'lecture',
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
        day_of_week: formData.day_of_week,
        start_time: formData.start_time,
        end_time: formData.end_time,
        room: formData.room || 'TBD',
        semester: parseInt(formData.semester),
        academic_year: formData.academic_year,
      };
      
      if (editingItem) {
        await scheduleAPI.update(editingItem.id, payload);
        setMessage({ type: 'success', text: 'Занятие успешно обновлено!' });
      } else {
        await scheduleAPI.create(payload);
        setMessage({ type: 'success', text: 'Занятие успешно добавлено!' });
      }
      
      setTimeout(() => {
        setShowModal(false);
        loadSchedule();
      }, 1000);
    } catch (error) {
      console.error('Error saving schedule:', error);
      // Handle error message - it might be an object or array from the API
      let errorText = 'Ошибка сохранения';
      const detail = error.response?.data?.detail;
      if (typeof detail === 'string') {
        errorText = detail;
      } else if (Array.isArray(detail)) {
        errorText = detail.map(d => d.msg || String(d)).join(', ');
      } else if (detail && typeof detail === 'object') {
        errorText = detail.msg || JSON.stringify(detail);
      }
      setMessage({ type: 'error', text: errorText });
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id) => {
    if (!confirm('Удалить это занятие из расписания?')) return;
    
    try {
      await scheduleAPI.delete(id);
      loadSchedule();
    } catch (error) {
      const detail = error.response?.data?.detail;
      let errorText = 'Ошибка удаления';
      if (typeof detail === 'string') {
        errorText = detail;
      } else if (detail && typeof detail === 'object') {
        errorText = detail.msg || JSON.stringify(detail);
      }
      alert(errorText);
    }
  };

  const getScheduleForDay = (day) => {
    return schedule
      .filter(item => item.day_of_week === day)
      .sort((a, b) => a.start_time?.localeCompare(b.start_time));
  };

  const getLessonType = (type) => {
    return lessonTypes.find(t => t.value === type) || lessonTypes[0];
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
          <p>Только преподаватели и администраторы могут управлять расписанием</p>
        </div>
      </div>
    );
  }

  return (
    <div className="management-page schedule-management">
      <div className="page-header">
        <div className="page-title">
          <Calendar size={28} />
          <h1>Управление расписанием</h1>
        </div>
        <button className="btn btn-primary" onClick={() => openAddModal()}>
          <Plus size={18} />
          Добавить занятие
        </button>
      </div>

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
                {group.name} ({group.course} курс)
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="select-arrow" />
        </div>
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
          <p>Выберите группу для просмотра и редактирования расписания</p>
        </div>
      ) : (
        <div className="schedule-grid">
          {daysOfWeek.map(day => (
            <div key={day.value} className="schedule-day">
              <div className="day-header">
                <h3>{day.label}</h3>
                <button 
                  className="btn-icon" 
                  title="Добавить занятие"
                  onClick={() => openAddModal(day.value)}
                >
                  <Plus size={16} />
                </button>
              </div>
              
              <div className="day-lessons">
                {getScheduleForDay(day.value).length === 0 ? (
                  <div className="no-lessons">
                    <span>Нет занятий</span>
                  </div>
                ) : (
                  getScheduleForDay(day.value).map(item => {
                    const lessonType = getLessonType(item.lesson_type);
                    return (
                      <div 
                        key={item.id} 
                        className="lesson-card"
                        style={{ borderLeftColor: lessonType.color }}
                      >
                        <div className="lesson-time">
                          <Clock size={14} />
                          <span>{item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}</span>
                        </div>
                        <div className="lesson-subject">
                          {getSubjectName(item.subject_id)}
                        </div>
                        <div className="lesson-meta">
                          <span className="lesson-type" style={{ backgroundColor: lessonType.color }}>
                            {lessonType.label}
                          </span>
                        </div>
                        <div className="lesson-info">
                          <span><Users size={12} /> {getTeacherName(item.teacher_id)}</span>
                          {item.room && <span><MapPin size={12} /> {item.room}</span>}
                        </div>
                        <div className="lesson-actions">
                          <button className="btn-icon small" onClick={() => openEditModal(item)}>
                            <Edit2 size={14} />
                          </button>
                          <button className="btn-icon small danger" onClick={() => deleteItem(item.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
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
                    {message.type === 'success' ? <Check size={18} /> : <X size={18} />}
                    {message.text}
                  </div>
                )}
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Группа *</label>
                    <select
                      className="form-input"
                      value={formData.group_id}
                      onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                      required
                    >
                      {groups.map(group => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">День недели *</label>
                    <select
                      className="form-input"
                      value={formData.day_of_week}
                      onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                      required
                    >
                      {daysOfWeek.map(day => (
                        <option key={day.value} value={day.value}>{day.label}</option>
                      ))}
                    </select>
                  </div>
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
                        {teacher.last_name} {teacher.first_name} {teacher.middle_name || ''}
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
                
                <div className="form-row">
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
                  <div className="form-group">
                    <label className="form-label">Семестр *</label>
                    <select
                      className="form-input"
                      value={formData.semester}
                      onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                      required
                    >
                      <option value={1}>1 семестр</option>
                      <option value={2}>2 семестр</option>
                    </select>
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Учебный год *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="2025-2026"
                    value={formData.academic_year}
                    onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                    pattern="\d{4}-\d{4}"
                    required
                  />
                </div>
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





