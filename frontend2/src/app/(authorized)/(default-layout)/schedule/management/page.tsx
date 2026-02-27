'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useGetScheduleByGroupApiScheduleGroupGroupIdGet,
  useCreateScheduleApiSchedulePost,
  useUpdateScheduleApiScheduleScheduleIdPatch,
  useDeleteScheduleApiScheduleScheduleIdDelete,
  useCreateMonthlyScheduleApiScheduleCreateMonthlyPost
} from '@/api/orval/client/schedule/schedule';
import { useListGroupsApiGroupsGet } from '@/api/orval/client/groups/groups';
import { useListSubjectsApiSubjectsGet } from '@/api/orval/client/subjects/subjects';
import { useListTeachersApiTeachersGet } from '@/api/orval/client/teachers/teachers';
import { useQueryClient } from '@tanstack/react-query';

import {
  Calendar, Plus, Edit2, Trash2, Clock, MapPin,
  Users, Check, X, ChevronDown, AlertCircle
} from 'lucide-react';
import '@/styles/Management.css';
import { handleError, handleFormError } from '@/lib/api/error';

const scheduleSchema = z.object({
  group_id: z.string().min(1, 'Выберите группу'),
  subject_id: z.string().min(1, 'Выберите предмет'),
  teacher_id: z.string().min(1, 'Выберите преподавателя'),
  specific_date: z.string().min(1, 'Выберите дату'),
  start_time: z.string().min(1, 'Выберите время начала'),
  end_time: z.string().min(1, 'Выберите время окончания'),
  room: z.string().min(1, 'Укажите аудиторию'),
  semester: z.number().min(1).max(2),
  academic_year: z.string().regex(/^\d{4}-\d{4}$/, 'Формат: 2025-2026'),
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

const bulkItemSchema = z.object({
  subject_id: z.string().min(1),
  teacher_id: z.string().min(1),
  day_of_week: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  room: z.string(),
});

const bulkScheduleSchema = z.object({
  group_id: z.string().min(1, 'Выберите группу'),
  academic_year: z.string().regex(/^\d{4}-\d{4}$/, 'Формат: 2025-2026'),
  semesters: z.array(z.number()),
  schedule_items: z.array(bulkItemSchema),
});

type BulkScheduleFormValues = z.infer<typeof bulkScheduleSchema>;

const monthlyItemSchema = z.object({
  subject_id: z.string().min(1),
  teacher_id: z.string().min(1),
  specific_date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  room: z.string(),
});

const monthlyScheduleSchema = z.object({
  group_id: z.string().min(1),
  year: z.number(),
  month: z.number(),
  semester: z.number(),
  academic_year: z.string(),
  schedule_items: z.array(monthlyItemSchema),
});

type MonthlyScheduleFormValues = z.infer<typeof monthlyScheduleSchema>;

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
  const queryClient = useQueryClient();

  const [selectedGroup, setSelectedGroup] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<any>(null);

  // Bulk creation state
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Monthly creation state
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const mainForm = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      group_id: '',
      subject_id: '',
      teacher_id: '',
      specific_date: new Date().toISOString().split('T')[0],
      start_time: '09:00',
      end_time: '10:30',
      room: '',
      semester: 1,
      academic_year: '2025-2026',
    }
  });

  const bulkForm = useForm<BulkScheduleFormValues>({
    resolver: zodResolver(bulkScheduleSchema),
    defaultValues: {
      group_id: '',
      academic_year: '2025-2026',
      semesters: [1, 2],
      schedule_items: [],
    }
  });

  const monthlyForm = useForm<MonthlyScheduleFormValues>({
    resolver: zodResolver(monthlyScheduleSchema),
    defaultValues: {
      group_id: '',
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      semester: 1,
      academic_year: '2025-2026',
      schedule_items: [],
    }
  });

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';

  // Queries
  const { data: groupsRes } = useListGroupsApiGroupsGet();
  const { data: subjectsRes } = useListSubjectsApiSubjectsGet();
  const { data: teachersRes } = useListTeachersApiTeachersGet();

  const groups = Array.isArray(groupsRes?.data) ? groupsRes.data : [];
  const subjects = Array.isArray(subjectsRes?.data) ? subjectsRes.data : [];
  const teachers = Array.isArray(teachersRes?.data) ? teachersRes.data : [];

  const { data: scheduleRes, isLoading: scheduleLoading } = useGetScheduleByGroupApiScheduleGroupGroupIdGet(
    parseInt(selectedGroup),
    undefined,
    { query: { enabled: !!selectedGroup } }
  );

  const schedule = Array.isArray(scheduleRes?.data) ? scheduleRes.data : [];

  // Mutations
  const createMutation = useCreateScheduleApiSchedulePost({
    mutation: {
      onError: (err) => handleFormError(err, mainForm)
    }
  });
  const updateMutation = useUpdateScheduleApiScheduleScheduleIdPatch({
    mutation: {
      onError: (err) => handleFormError(err, mainForm)
    }
  });
  const deleteMutation = useDeleteScheduleApiScheduleScheduleIdDelete({
    mutation: {
      onError: (err) => {
        const msg = handleError(err);
        alert(msg);
      }
    }
  });
  const createMonthlyMutation = useCreateMonthlyScheduleApiScheduleCreateMonthlyPost({
    mutation: {
      onError: (err) => handleFormError(err, monthlyForm)
    }
  });

  const { fields: bulkFields, append: bulkAppend, remove: bulkRemove } = useFieldArray({
    control: bulkForm.control,
    name: "schedule_items"
  });

  const { fields: monthlyFields, append: monthlyAppend, remove: monthlyRemove } = useFieldArray({
    control: monthlyForm.control,
    name: "schedule_items"
  });

  useEffect(() => {
    if (groups.length > 0 && !selectedGroup) {
      setSelectedGroup(String(groups[0].id));
    }
  }, [groups, selectedGroup]);

  const openAddModal = (specificDate: string | null = null, timeSlot: any = null) => {
    setEditingItem(null);
    mainForm.reset({
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
    mainForm.reset({
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

  const onSubmit = async (data: ScheduleFormValues) => {
    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        ...data,
        group_id: parseInt(data.group_id),
        subject_id: parseInt(data.subject_id),
        teacher_id: parseInt(data.teacher_id),
        semester: Number(data.semester),
        room: data.room || 'TBD',
      };

      if (editingItem) {
        await updateMutation.mutateAsync({
          scheduleId: editingItem.id,
          data: payload
        });
        setMessage({ type: 'success', text: 'Занятие успешно обновлено!' });
      } else {
        await createMutation.mutateAsync({
          data: payload
        });
        setMessage({ type: 'success', text: 'Занятие успешно добавлено!' });
      }

      queryClient.invalidateQueries({ queryKey: ['getScheduleByGroupApiScheduleGroupGroupIdGet'] });
      setTimeout(() => {
        setShowModal(false);
      }, 1000);
    } catch (error: any) {
      // Form errors handled via mutation onError
      setMessage({ type: 'error', text: handleError(error) });
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id: number) => {
    if (!confirm('Удалить это занятие из расписания?')) return;

    try {
      await deleteMutation.mutateAsync({ scheduleId: id });
      queryClient.invalidateQueries({ queryKey: ['getScheduleByGroupApiScheduleGroupGroupIdGet'] });
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
    bulkForm.reset({
      group_id: selectedGroup || '',
      academic_year: '2025-2026',
      semesters: [1, 2],
      schedule_items: [],
    });
    setMessage(null);
    setShowBulkModal(true);
  };

  const onBulkSubmit = async (data: BulkScheduleFormValues) => {
    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        ...data,
        group_id: parseInt(data.group_id),
        schedule_items: data.schedule_items.map(item => ({
          ...item,
          subject_id: parseInt(item.subject_id),
          teacher_id: parseInt(item.teacher_id),
          room: item.room || 'TBD',
        })),
      };

      if (payload.schedule_items.length === 0) {
        setMessage({ type: 'error', text: 'Добавьте хотя бы одно занятие в шаблон' });
        return;
      }

      console.error('bulkCreate is not implemented in backend');
      setMessage({ type: 'error', text: 'Функция массового создания не поддерживается бэкендом' });
      return;
    } catch (error: any) {
      setMessage({ type: 'error', text: handleError(error) });
    } finally {
      setSaving(false);
    }
  };

  const openMonthlyModal = () => {
    monthlyForm.reset({
      group_id: selectedGroup || '',
      year: selectedYear,
      month: selectedMonth,
      semester: selectedMonth >= 9 || selectedMonth <= 1 ? 1 : 2,
      academic_year: '2025-2026',
      schedule_items: [{
        subject_id: subjects[0]?.id ? String(subjects[0].id) : '',
        teacher_id: teachers[0]?.id ? String(teachers[0].id) : '',
        specific_date: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`,
        start_time: '09:00',
        end_time: '10:30',
        room: '',
      }],
    });
    setMessage(null);
    setShowMonthlyModal(true);
  };

  const onMonthlySubmit = async (data: MonthlyScheduleFormValues) => {
    setSaving(true);
    setMessage(null);

    try {
      const payload = {
        ...data,
        group_id: parseInt(data.group_id),
        schedule_items: data.schedule_items.map(item => ({
          ...item,
          subject_id: parseInt(item.subject_id),
          teacher_id: parseInt(item.teacher_id),
          room: item.room || 'TBD',
        })),
      };

      const resultRes = await createMonthlyMutation.mutateAsync({ data: payload });
      const result = resultRes.data as any;
      setMessage({
        type: 'success',
        text: `Создано ${result.created} занятий, пропущено ${result.skipped}`
      });

      queryClient.invalidateQueries({ queryKey: ['getScheduleByGroupApiScheduleGroupGroupIdGet'] });
      setTimeout(() => {
        setShowMonthlyModal(false);
      }, 2000);
    } catch (error: any) {
      setMessage({ type: 'error', text: handleError(error) });
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

      {scheduleLoading ? (
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
            <form onSubmit={mainForm.handleSubmit(onSubmit)}>
              <div className="modal-body">
                {message && (
                  <div className={`alert alert-${message.type}`}>
                    {message.type === 'success' ? <Check size={18} /> : <X size={18} />}
                    {message.text}
                  </div>
                )}

                {mainForm.formState.errors.root && (
                  <div className="alert alert-error">
                    <AlertCircle size={18} />
                    {mainForm.formState.errors.root.message}
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Группа *</label>
                    <select
                      className={`form-input ${mainForm.formState.errors.group_id ? 'error' : ''}`}
                      {...mainForm.register('group_id')}
                      required
                    >
                      {groups.map(group => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                      ))}
                    </select>
                    {mainForm.formState.errors.group_id && (
                      <span className="error-text">{mainForm.formState.errors.group_id.message}</span>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Дата *</label>
                    <input
                      type="date"
                      className={`form-input ${mainForm.formState.errors.specific_date ? 'error' : ''}`}
                      {...mainForm.register('specific_date')}
                      required
                    />
                    {mainForm.formState.errors.specific_date && (
                      <span className="error-text">{mainForm.formState.errors.specific_date.message}</span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Предмет *</label>
                  <select
                    className={`form-input ${mainForm.formState.errors.subject_id ? 'error' : ''}`}
                    {...mainForm.register('subject_id')}
                    required
                  >
                    <option value="">Выберите предмет</option>
                    {subjects.map(subject => (
                      <option key={subject.id} value={subject.id}>{subject.name}</option>
                    ))}
                  </select>
                  {mainForm.formState.errors.subject_id && (
                    <span className="error-text">{mainForm.formState.errors.subject_id.message}</span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Преподаватель *</label>
                  <select
                    className={`form-input ${mainForm.formState.errors.teacher_id ? 'error' : ''}`}
                    {...mainForm.register('teacher_id')}
                    required
                  >
                    <option value="">Выберите преподавателя</option>
                    {teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.last_name} {teacher.first_name}
                      </option>
                    ))}
                  </select>
                  {mainForm.formState.errors.teacher_id && (
                    <span className="error-text">{mainForm.formState.errors.teacher_id.message}</span>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Начало *</label>
                    <select
                      className={`form-input ${mainForm.formState.errors.start_time ? 'error' : ''}`}
                      {...mainForm.register('start_time', {
                        onChange: (e) => {
                          const slot = timeSlots.find(s => s.start === e.target.value);
                          if (slot) mainForm.setValue('end_time', slot.end);
                        }
                      })}
                      required
                    >
                      {timeSlots.map(slot => (
                        <option key={slot.start} value={slot.start}>{slot.start}</option>
                      ))}
                    </select>
                    {mainForm.formState.errors.start_time && (
                      <span className="error-text">{mainForm.formState.errors.start_time.message}</span>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Конец *</label>
                    <select
                      className={`form-input ${mainForm.formState.errors.end_time ? 'error' : ''}`}
                      {...mainForm.register('end_time')}
                      required
                    >
                      {timeSlots.map(slot => (
                        <option key={slot.end} value={slot.end}>{slot.end}</option>
                      ))}
                    </select>
                    {mainForm.formState.errors.end_time && (
                      <span className="error-text">{mainForm.formState.errors.end_time.message}</span>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Аудитория *</label>
                    <input
                      type="text"
                      className={`form-input ${mainForm.formState.errors.room ? 'error' : ''}`}
                      placeholder="Например: 301"
                      {...mainForm.register('room')}
                      required
                    />
                    {mainForm.formState.errors.room && (
                      <span className="error-text">{mainForm.formState.errors.room.message}</span>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Семестр *</label>
                    <select
                      className={`form-input ${mainForm.formState.errors.semester ? 'error' : ''}`}
                      {...mainForm.register('semester', { valueAsNumber: true })}
                      required
                    >
                      <option value={1}>1 семестр</option>
                      <option value={2}>2 семестр</option>
                    </select>
                    {mainForm.formState.errors.semester && (
                      <span className="error-text">{mainForm.formState.errors.semester.message}</span>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Учебный год *</label>
                  <input
                    type="text"
                    className={`form-input ${mainForm.formState.errors.academic_year ? 'error' : ''}`}
                    placeholder="2025-2026"
                    {...mainForm.register('academic_year')}
                    required
                  />
                  {mainForm.formState.errors.academic_year && (
                    <span className="error-text">{mainForm.formState.errors.academic_year.message}</span>
                  )}
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

      {/* Monthly Modal */}
      {showMonthlyModal && (
        <div className="modal-overlay" onClick={() => setShowMonthlyModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Создать расписание на месяц</h2>
              <button className="btn-close" onClick={() => setShowMonthlyModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={monthlyForm.handleSubmit(onMonthlySubmit)}>
              <div className="modal-body">
                {message && (
                  <div className={`alert alert-${message.type}`}>
                    {message.text}
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Группа</label>
                    <select className="form-input" {...monthlyForm.register('group_id')}>
                      {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Учебный год</label>
                    <input type="text" className="form-input" {...monthlyForm.register('academic_year')} />
                  </div>
                </div>

                <div className="monthly-items-list" style={{ marginTop: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                    <h3>Занятия месяца</h3>
                    <button type="button" className="btn btn-outline btn-sm" onClick={() => monthlyAppend({
                      subject_id: subjects[0]?.id ? String(subjects[0].id) : '',
                      teacher_id: teachers[0]?.id ? String(teachers[0].id) : '',
                      specific_date: `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`,
                      start_time: '09:00',
                      end_time: '10:30',
                      room: '',
                    })}>
                      <Plus size={14} /> Добавить
                    </button>
                  </div>

                  {monthlyFields.map((field, index) => (
                    <div key={field.id} className="monthly-item-row" style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 2fr 1.5fr 1fr 1fr 1fr 40px',
                      gap: '0.5rem',
                      marginBottom: '0.5rem',
                      alignItems: 'end'
                    }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Предмет</label>
                        <select className="form-input small" {...monthlyForm.register(`schedule_items.${index}.subject_id`)}>
                          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Преподаватель</label>
                        <select className="form-input small" {...monthlyForm.register(`schedule_items.${index}.teacher_id`)}>
                          {teachers.map(t => <option key={t.id} value={t.id}>{t.last_name}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Дата</label>
                        <input type="date" className="form-input small" {...monthlyForm.register(`schedule_items.${index}.specific_date`)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Начало</label>
                        <input type="time" className="form-input small" {...monthlyForm.register(`schedule_items.${index}.start_time`)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Конец</label>
                        <input type="time" className="form-input small" {...monthlyForm.register(`schedule_items.${index}.end_time`)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem' }}>Ауд.</label>
                        <input type="text" className="form-input small" {...monthlyForm.register(`schedule_items.${index}.room`)} />
                      </div>
                      <button type="button" className="btn-icon danger small" onClick={() => monthlyRemove(index)} style={{ marginBottom: '5px' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowMonthlyModal(false)}>Отмена</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Создание...' : 'Создать на месяц'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
