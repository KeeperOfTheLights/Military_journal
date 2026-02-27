'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import {
  useGetScheduleByDateRangeApiScheduleByDateRangeGet,
  useCreateScheduleApiSchedulePost,
  useUpdateScheduleApiScheduleScheduleIdPatch,
  useDeleteScheduleApiScheduleScheduleIdDelete,
  useCopyWeekScheduleApiScheduleCopyWeekPost,
  useCreateMonthlyScheduleApiScheduleCreateMonthlyPost
} from '@/api/orval/client/schedule/schedule';
import { useListGroupsApiGroupsGet } from '@/api/orval/client/groups/groups';
import { useListSubjectsApiSubjectsGet } from '@/api/orval/client/subjects/subjects';
import { useListTeachersApiTeachersGet } from '@/api/orval/client/teachers/teachers';
import { useQueryClient } from '@tanstack/react-query';



import {
  Calendar as LucideCalendar, Plus, Edit2, Trash2, Clock, MapPin,
  Users, BookOpen, X, Check, ChevronDown, AlertCircle,
  ChevronLeft, ChevronRight, Copy
} from 'lucide-react';
import '@/styles/Management.css';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { handleError, handleFormError } from '@/lib/api/error';

const scheduleSchema = z.object({
  group_id: z.string().min(1),
  subject_id: z.string().min(1),
  teacher_id: z.string().min(1),
  specific_date: z.string().min(1),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  room: z.string().min(1),
  semester: z.number().min(1).max(2),
  academic_year: z.string(),
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

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

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export default function ScheduleCalendarPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [message, setMessage] = useState<any>(null);
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);

  const mainForm = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      group_id: '',
      subject_id: '',
      teacher_id: '',
      specific_date: '',
      start_time: '09:00',
      end_time: '10:30',
      room: '',
      semester: 1,
      academic_year: '2025-2026',
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

  const timeSlots = [
    { start: '08:00', end: '09:30' },
    { start: '09:40', end: '11:10' },
    { start: '11:20', end: '12:50' },
    { start: '13:30', end: '15:00' },
    { start: '15:10', end: '16:40' },
    { start: '16:50', end: '18:20' },
  ];

  // Queries
  const { data: groupsRes } = useListGroupsApiGroupsGet();
  const { data: subjectsRes } = useListSubjectsApiSubjectsGet();
  const { data: teachersRes } = useListTeachersApiTeachersGet();

  const groups = Array.isArray(groupsRes?.data) ? groupsRes.data : [];
  const subjects = Array.isArray(subjectsRes?.data) ? subjectsRes.data : [];
  const teachers = Array.isArray(teachersRes?.data) ? teachersRes.data : [];

  const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
  const endOfMonth = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0];

  const { data: scheduleRes, isLoading: scheduleLoading } = useGetScheduleByDateRangeApiScheduleByDateRangeGet(
    {
      group_id: parseInt(selectedGroup),
      date_from: startOfMonth,
      date_to: endOfMonth
    },
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
  const copyWeekMutation = useCopyWeekScheduleApiScheduleCopyWeekPost({
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

  const { fields: monthlyFields, append: monthlyAppend, remove: monthlyRemove } = useFieldArray({
    control: monthlyForm.control,
    name: "schedule_items"
  });

  useEffect(() => {
    if (groups.length > 0 && !selectedGroup) {
      setSelectedGroup(String(groups[0].id));
    }
  }, [groups, selectedGroup]);

  const getDaysInMonth = () => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

    // Create array with nulls for empty slots
    const days: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const getScheduleForDate = (day: number) => {
    if (!day) return [];
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return schedule
      .filter(item => item.specific_date === dateStr)
      .sort((a, b) => a.start_time?.localeCompare(b.start_time));
  };

  const navigateMonth = (direction: number) => {
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

  const openAddModal = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setEditingItem(null);
    mainForm.reset({
      group_id: selectedGroup,
      subject_id: subjects[0]?.id ? String(subjects[0].id) : '',
      teacher_id: teachers[0]?.id ? String(teachers[0].id) : '',
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
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          scheduleId: editingItem.id,
          data: {
            ...data,
            group_id: parseInt(data.group_id),
            subject_id: parseInt(data.subject_id),
            teacher_id: parseInt(data.teacher_id),
          }
        });
        setMessage({ type: 'success', text: 'Занятие обновлено!' });
      } else {
        await createMutation.mutateAsync({
          data: {
            ...data,
            group_id: parseInt(data.group_id),
            subject_id: parseInt(data.subject_id),
            teacher_id: parseInt(data.teacher_id),
          }
        });
        setMessage({ type: 'success', text: 'Занятие добавлено!' });
      }

      queryClient.invalidateQueries({ queryKey: ['getScheduleByDateRangeApiScheduleByDateRangeGet'] });
      setTimeout(() => setShowModal(false), 1000);
    } catch (error) {
      // Form errors handled via mutation onError
    }
  };

  const deleteItem = async (id: number) => {
    if (!confirm('Удалить это занятие?')) return;

    try {
      await deleteMutation.mutateAsync({ scheduleId: id });
      queryClient.invalidateQueries({ queryKey: ['getScheduleByDateRangeApiScheduleByDateRangeGet'] });
    } catch (error) {
      alert('Ошибка удаления');
    }
  };

  // const copyWeek = async () => ... (omitted as not used in render or simplified)

  const openMonthlyModal = () => {
    monthlyForm.reset({
      group_id: selectedGroup,
      year: currentYear,
      month: currentMonth + 1,
      semester: currentMonth >= 8 || currentMonth <= 0 ? 1 : 2,
      academic_year: '2025-2026',
      schedule_items: []
    });
    setShowMonthlyModal(true);
    setMessage(null);
  };

  const onMonthlySubmit = async (data: MonthlyScheduleFormValues) => {
    try {
      await createMonthlyMutation.mutateAsync({
        data: {
          ...data,
          group_id: parseInt(data.group_id),
          schedule_items: data.schedule_items.map(item => ({
            ...item,
            subject_id: parseInt(item.subject_id),
            teacher_id: parseInt(item.teacher_id),
          })),
        }
      });
      setMessage({ type: 'success', text: 'Расписание на месяц успешно создано' });
      queryClient.invalidateQueries({ queryKey: ['getScheduleByDateRangeApiScheduleByDateRangeGet'] });
      setTimeout(() => setShowMonthlyModal(false), 1500);
    } catch (error) {
      // Form errors handled via mutation onError
    }
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
          <p>Только преподаватели могут управлять расписанием</p>
        </div>
      </div>
    );
  }

  const days = getDaysInMonth();
  const today = new Date();
  const isToday = (day: number | null) => {
    return day &&
      currentYear === today.getFullYear() &&
      currentMonth === today.getMonth() &&
      day === today.getDate();
  };

  return (
    <div className="management-page">
      <div className="page-header">
        <div className="page-title">
          <LucideCalendar size={28} />
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

      {scheduleLoading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Загрузка расписания...</p>
        </div>
      ) : !selectedGroup ? (
        <div className="empty-state">
          <LucideCalendar size={48} />
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
      )
      }

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
                    {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                    {message.text}
                  </div>
                )}

                {mainForm.formState.errors.root && (
                  <div className="alert alert-error">
                    <AlertCircle size={18} />
                    {mainForm.formState.errors.root.message}
                  </div>
                )}

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
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending || updateMutation.isPending}>
                  <Check size={18} />
                  {(createMutation.isPending || updateMutation.isPending) ? 'Сохранение...' : (editingItem ? 'Сохранить' : 'Добавить')}
                </button>
              </div>
            </form>
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
            <form onSubmit={monthlyForm.handleSubmit(onMonthlySubmit)}>
              <div className="modal-body">
                <div className="section-header">
                  <h3>Занятия на месяц</h3>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => monthlyAppend({
                      subject_id: subjects[0]?.id ? String(subjects[0].id) : '',
                      teacher_id: teachers[0]?.id ? String(teachers[0].id) : '',
                      specific_date: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`,
                      start_time: '09:00',
                      end_time: '10:30',
                      room: '',
                    })}
                  >
                    <Plus size={16} />
                    Добавить занятие
                  </button>
                </div>

                <div className="monthly-items-list">
                  {monthlyFields.map((field, index) => (
                    <div key={field.id} className="bulk-schedule-item">
                      <div className="item-header">
                        <span className="item-number">Занятие {index + 1}</span>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => monthlyRemove(index)}
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
                            {...monthlyForm.register(`schedule_items.${index}.specific_date`)}
                            min={`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`}
                            max={`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${new Date(currentYear, currentMonth + 1, 0).getDate()}`}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Предмет *</label>
                          <select
                            className="form-input"
                            {...monthlyForm.register(`schedule_items.${index}.subject_id`)}
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
                            {...monthlyForm.register(`schedule_items.${index}.teacher_id`)}
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
                            {...monthlyForm.register(`schedule_items.${index}.room`)}
                            required
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Начало *</label>
                          <select
                            className="form-input"
                            {...monthlyForm.register(`schedule_items.${index}.start_time`)}
                            onChange={(e) => {
                              const slot = timeSlots.find(s => s.start === e.target.value);
                              monthlyForm.setValue(`schedule_items.${index}.start_time`, e.target.value);
                              if (slot) monthlyForm.setValue(`schedule_items.${index}.end_time`, slot.end);
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
                            {...monthlyForm.register(`schedule_items.${index}.end_time`)}
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
                <button type="submit" className="btn btn-primary" disabled={createMonthlyMutation.isPending}>
                  <Check size={18} />
                  {createMonthlyMutation.isPending ? 'Создание...' : `Создать ${monthlyFields.length} занятий`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
