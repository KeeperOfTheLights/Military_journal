'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
// import { scheduleAPI, groupsAPI, subjectsAPI, teachersAPI } from '../api/auth';
const scheduleAPI = {
  getByGroup: async (groupId: any) => [], // MOCK
  create: async (data: any) => { },
  update: async (id: any, data: any) => { },
  delete: async (id: any) => { },
  bulkCreate: async (data: any) => ({ created: 0, skipped: 0 }),
  createMonthly: async (data: any) => ({ created: 0, skipped: 0 })
};
const groupsAPI = {
  getAll: async () => [
    { id: 1, name: 'ВК-24-1', course: 1 },
    { id: 2, name: 'ВК-24-2', course: 1 }
  ]
};
const subjectsAPI = {
  getAll: async () => [
    { id: 1, name: 'Военная топография' },
    { id: 2, name: 'Огневая подготовка' }
  ]
};
const teachersAPI = {
  getAll: async () => [
    { id: 1, first_name: 'Петр', last_name: 'Петров' },
    { id: 2, first_name: 'Сидор', last_name: 'Сидоров' }
  ]
};

import {
  Calendar, Plus, Edit2, Trash2, Clock, MapPin,
  Users, Check, X, ChevronDown, AlertCircle
} from 'lucide-react';
import '@/styles/Management.css';

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

export default function ScheduleManagementPage() {
  const { user } = useAuthStore();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    group_id: '',
    subject_id: '',
    teacher_id: '',
    specific_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '10:30',
    room: '',
    semester: 1,
    academic_year: '2025-2026',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<any>(null);

  // Bulk creation state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFormData, setBulkFormData] = useState({
    group_id: '',
    academic_year: '2025-2026',
    semesters: [1, 2], // Both semesters by default
    schedule_items: [] as any[],
  });
  const [weekTemplate, setWeekTemplate] = useState<any[]>([]);

  // Monthly creation state
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyItems, setMonthlyItems] = useState<any[]>([]);

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';

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
        setSelectedGroup(String(groupsData[0].id));
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

  const openAddModal = (specificDate: string | null = null, timeSlot: any = null) => {
    setEditingItem(null);
    setFormData({
      group_id: selectedGroup,
      subject_id: subjects[0]?.id ? String(subjects[0].id) : '',
      teacher_id: teachers[0]?.id ? String(teachers[0].id) : '',
      specific_date: specificDate || new Date().toISOString().split('T')[0],
      start_time: timeSlot?.start || '09:00',
      end_time: timeSlot?.end || '10:30',
      room: '',
      semester: 1,
      academic_year: '2025-2026',
    });
    setMessage(null);
    setShowModal(true);
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setFormData({
      group_id: String(item.group_id),
      subject_id: String(item.subject_id),
      teacher_id: String(item.teacher_id),
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

  const handleSubmit = async (e: any) => {
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
        semester: Number(formData.semester),
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
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      let errorText = 'Ошибка сохранения';
      const detail = error.response?.data?.detail;
      if (typeof detail === 'string') {
        errorText = detail;
      } else if (Array.isArray(detail)) {
        errorText = detail.map((d: any) => d.msg || String(d)).join(', ');
      } else if (detail && typeof detail === 'object') {
        errorText = detail.msg || JSON.stringify(detail);
      }
      setMessage({ type: 'error', text: errorText });
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: number) => {
    if (!confirm('Удалить это занятие из расписания?')) return;

    try {
      await scheduleAPI.delete(id);
      loadSchedule();
    } catch (error: any) {
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

  const openBulkModal = () => {
    setBulkFormData({
      group_id: selectedGroup || '',
      academic_year: '2025-2026',
      semesters: [1, 2],
      schedule_items: [],
    });
    setWeekTemplate([]);
    setMessage(null);
    setShowBulkModal(true);
  };

  const addWeekTemplateItem = () => {
    setWeekTemplate([...weekTemplate, {
      subject_id: subjects[0]?.id ? String(subjects[0].id) : '',
      teacher_id: teachers[0]?.id ? String(teachers[0].id) : '',
      day_of_week: 'monday',
      start_time: '09:00',
      end_time: '10:30',
      room: '',
    }]);
  };

  const updateWeekTemplateItem = (index: number, field: string, value: any) => {
    const updated = [...weekTemplate];
    updated[index] = { ...updated[index], [field]: value };
    setWeekTemplate(updated);
  };

  const removeWeekTemplateItem = (index: number) => {
    setWeekTemplate(weekTemplate.filter((_, i) => i !== index));
  };

  const handleBulkSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        group_id: parseInt(bulkFormData.group_id),
        academic_year: bulkFormData.academic_year,
        semesters: bulkFormData.semesters,
        schedule_items: weekTemplate.map(item => ({
          subject_id: parseInt(item.subject_id),
          teacher_id: parseInt(item.teacher_id),
          day_of_week: item.day_of_week,
          start_time: item.start_time,
          end_time: item.end_time,
          room: item.room || 'TBD',
        })),
      };

      if (payload.schedule_items.length === 0) {
        setMessage({ type: 'error', text: 'Добавьте хотя бы одно занятие в шаблон' });
        return;
      }

      const result = await scheduleAPI.bulkCreate(payload);

      setMessage({
        type: 'success',
        text: `Расписание создано! Создано: ${result.created}, Пропущено: ${result.skipped}`
      });

      setTimeout(() => {
        setShowBulkModal(false);
        loadSchedule();
      }, 2000);
    } catch (error: any) {
      console.error('Error creating bulk schedule:', error);
      let errorText = 'Ошибка создания расписания';
      const detail = error.response?.data?.detail;
      if (typeof detail === 'string') {
        errorText = detail;
      }
      setMessage({ type: 'error', text: errorText });
    } finally {
      setSaving(false);
    }
  };

  const openMonthlyModal = () => {
    setMonthlyItems([{
      id: Date.now(),
      subject_id: subjects[0]?.id ? String(subjects[0].id) : '',
      teacher_id: teachers[0]?.id ? String(teachers[0].id) : '',
      specific_date: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`,
      start_time: '09:00',
      end_time: '10:30',
      room: '',
    }]);
    setMessage(null);
    setShowMonthlyModal(true);
  };

  const addMonthlyItem = () => {
    setMonthlyItems([...monthlyItems, {
      id: Date.now(),
      subject_id: subjects[0]?.id ? String(subjects[0].id) : '',
      teacher_id: teachers[0]?.id ? String(teachers[0].id) : '',
      specific_date: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`,
      start_time: '09:00',
      end_time: '10:30',
      room: '',
    }]);
  };

  const updateMonthlyItem = (id: number, field: string, value: any) => {
    setMonthlyItems(monthlyItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeMonthlyItem = (id: number) => {
    setMonthlyItems(monthlyItems.filter(item => item.id !== id));
  };

  const handleMonthlySubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        group_id: parseInt(selectedGroup || bulkFormData.group_id),
        year: selectedYear,
        month: selectedMonth,
        semester: selectedMonth >= 9 || selectedMonth <= 1 ? 1 : 2,
        academic_year: bulkFormData.academic_year || '2025-2026',
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
      setMessage({
        type: 'success',
        text: `Создано ${result.created} занятий, пропущено ${result.skipped}`
      });

      setTimeout(() => {
        setShowMonthlyModal(false);
        loadSchedule();
      }, 2000);
    } catch (error: any) {
      console.error('Error creating monthly schedule:', error);
      setMessage({
        type: 'error',
        text: error.response?.data?.detail || 'Ошибка создания расписания'
      });
    } finally {
      setSaving(false);
    }
  };

  const getSortedSchedule = () => {
    return schedule
      .slice()
      .sort((a, b) => {
        const dateCompare = (a.specific_date || '').localeCompare(b.specific_date || '');
        if (dateCompare !== 0) return dateCompare;
        return (a.start_time || '').localeCompare(b.start_time || '');
      });
  };

  const getSubjectName = (id: number) => subjects.find(s => s.id === id)?.name || '—';
  const getTeacherName = (id: number) => {
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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-outline" onClick={openMonthlyModal}>
            <Calendar size={18} />
            Создать на месяц
          </button>
          <button className="btn btn-primary" onClick={() => openAddModal()}>
            <Plus size={18} />
            Добавить занятие
          </button>
        </div>
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
      ) : schedule.length === 0 ? (
        <div className="empty-state">
          <Calendar size={48} />
          <h3>Нет расписания</h3>
          <p>Добавьте занятия для этой группы</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {getSortedSchedule().map(item => {
            const [year, month, day] = item.specific_date.split('-').map(Number);
            const date = new Date(year, month - 1, day);
            const dateStr = date.toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            });

            return (
              <div
                key={item.id}
                className="lesson-card"
                style={{
                  borderLeft: '4px solid var(--primary-color)',
                  padding: '1rem',
                  backgroundColor: '#f9fafb'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                      <div className="lesson-time">
                        <Calendar size={14} />
                        <span>{dateStr}</span>
                      </div>
                      <div className="lesson-time">
                        <Clock size={14} />
                        <span>{item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}</span>
                      </div>
                    </div>
                    <div className="lesson-subject" style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                      {getSubjectName(item.subject_id)}
                    </div>
                    <div className="lesson-info">
                      <span><Users size={12} /> {getTeacherName(item.teacher_id)}</span>
                      {item.room && <span><MapPin size={12} /> Ауд. {item.room}</span>}
                      <span>Семестр {item.semester}</span>
                    </div>
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
              </div>
            );
          })}
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
                    <label className="form-label">Дата *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.specific_date}
                      onChange={(e) => setFormData({ ...formData, specific_date: e.target.value })}
                      required
                    />
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
