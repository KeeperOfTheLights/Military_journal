'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  GraduationCap, Search, Plus, Edit2, Eye,
  Phone, BookOpen, X, Check, Trash2, Filter
} from 'lucide-react';
import '@/styles/Management.css';

// Import generated hooks
import {
  useListTeachersApiTeachersGet,
  useCreateTeacherApiTeachersPost,
  useUpdateTeacherApiTeachersTeacherIdPatch,
  useDeleteTeacherApiTeachersTeacherIdDelete
} from '@/api/client/teachers/teachers';
import { useListSubjectsApiSubjectsGet } from '@/api/client/subjects/subjects';

const phoneRegex = /^\+?[0-9\s\-\(\)]*$/;

const teacherSchema = z.object({
  first_name: z.string().min(1, 'Введите имя'),
  last_name: z.string().min(1, 'Введите фамилию'),
  middle_name: z.string().optional(),
  phone: z.string().regex(phoneRegex, 'Неверный формат телефона').optional().or(z.literal('')),
  department: z.string().optional(),
  position: z.string().optional(),
  military_rank: z.string().optional(),
  email: z.string().email('Неверный email').optional().or(z.literal('')),
  password: z.string().min(6, 'Минимум 6 символов').optional().or(z.literal('')),
});

type TeacherForm = z.infer<typeof teacherSchema>;

export default function Teachers() {
  const { user } = useAuthStore();

  // React Query Hooks
  const {
    data: teachersData,
    isLoading: isLoadingTeachers,
    refetch: refetchTeachers
  } = useListTeachersApiTeachersGet();

  const {
    data: subjectsData,
  } = useListSubjectsApiSubjectsGet();

  const createTeacherMutation = useCreateTeacherApiTeachersPost();
  const updateTeacherMutation = useUpdateTeacherApiTeachersTeacherIdPatch();
  const deleteTeacherMutation = useDeleteTeacherApiTeachersTeacherIdDelete();

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
  const [editingTeacher, setEditingTeacher] = useState<any>(null);
  const [message, setMessage] = useState<any>(null);

  const isAdmin = user?.role === 'admin';

  const teachers = Array.isArray(teachersData?.data) ? teachersData.data : [];
  // const subjects = subjectsData?.data || []; // Keep this if needed later

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TeacherForm>({
    resolver: zodResolver(teacherSchema),
    defaultValues: {
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      middle_name: '',
      phone: '',
      department: 'Военная кафедра',
      position: 'Преподаватель',
      military_rank: '',
    }
  });

  const filteredTeachers = teachers.filter(teacher => {
    const fullName = `${teacher.last_name} ${teacher.first_name} ${teacher.middle_name || ''}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  const viewTeacher = (teacher: any) => {
    setSelectedTeacher(teacher);
    setShowDetailModal(true);
  };

  const openAddModal = () => {
    setEditingTeacher(null);
    reset({
      email: '',
      password: 'Teacher123!',
      first_name: '',
      last_name: '',
      middle_name: '',
      phone: '',
      department: 'Военная кафедра',
      position: 'Преподаватель',
      military_rank: '',
    });
    setMessage(null);
    setShowModal(true);
  };

  const openEditModal = (teacher: any) => {
    setEditingTeacher(teacher);
    reset({
      email: teacher.email || '',
      password: '',
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      middle_name: teacher.middle_name || '',
      phone: teacher.phone || '',
      department: teacher.department || 'Военная кафедра',
      position: teacher.position || 'Преподаватель',
      military_rank: teacher.military_rank || '',
    });
    setMessage(null);
    setShowModal(true);
  };

  const onSubmit = async (data: TeacherForm) => {
    setMessage(null);

    // Manual validation for create mode
    if (!editingTeacher) {
      let hasError = false;
      if (!data.email) {
        setError('email', { type: 'manual', message: 'Email обязателен' });
        hasError = true;
      }
      if (!data.password) {
        setError('password', { type: 'manual', message: 'Пароль обязателен' });
        hasError = true;
      }
      if (hasError) return;
    }

    try {
      if (editingTeacher) {
        await updateTeacherMutation.mutateAsync({
          teacherId: editingTeacher.id,
          data: {
            first_name: data.first_name,
            last_name: data.last_name,
            middle_name: data.middle_name || null,
            phone: data.phone || null,
            department: data.department,
            position: data.position,
            military_rank: data.military_rank || null,
          }
        });
        setMessage({ type: 'success', text: 'Преподаватель успешно обновлён!' });
      } else {
        await createTeacherMutation.mutateAsync({
          data: {
            email: data.email!,
            password: data.password!,
            first_name: data.first_name,
            last_name: data.last_name,
            middle_name: data.middle_name || null,
            phone: data.phone || null,
            department: data.department,
            position: data.position,
            military_rank: data.military_rank || null,
          }
        });
        setMessage({ type: 'success', text: 'Преподаватель успешно добавлен!' });
      }

      refetchTeachers();
      setTimeout(() => {
        setShowModal(false);
      }, 1000);
    } catch (error: any) {
      console.error('Error saving teacher:', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Ошибка сохранения' });
    }
  };

  const deleteTeacher = async (teacherId: any) => {
    if (!confirm('Вы уверены, что хотите удалить этого преподавателя?')) return;

    try {
      await deleteTeacherMutation.mutateAsync({ teacherId });
      refetchTeachers();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Ошибка удаления');
    }
  };

  const militaryRanks = [
    'Лейтенант', 'Старший лейтенант', 'Капитан',
    'Майор', 'Подполковник', 'Полковник'
  ];

  const positions = [
    'Преподаватель', 'Старший преподаватель',
    'Доцент', 'Профессор', 'Заведующий кафедрой'
  ];

  return (
    <div className="management-page">
      <div className="page-header">
        <div className="page-title">
          <GraduationCap size={28} />
          <h1>Преподаватели</h1>
          <span className="badge">{filteredTeachers.length}</span>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={18} />
            Добавить преподавателя
          </button>
        )}
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Поиск по ФИО..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoadingTeachers ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Загрузка преподавателей...</p>
        </div>
      ) : filteredTeachers.length === 0 ? (
        <div className="empty-state">
          <GraduationCap size={48} />
          <h3>Преподаватели не найдены</h3>
          <p>Добавьте преподавателей для начала работы</p>
        </div>
      ) : (
        <div className="cards-grid teachers-grid">
          {filteredTeachers.map(teacher => (
            <div key={teacher.id} className="card teacher-card">
              <div className="card-header">
                <div className="avatar large">
                  {teacher.first_name?.[0]}{teacher.last_name?.[0]}
                </div>
                <div className="teacher-info">
                  <h3>{teacher.last_name} {teacher.first_name}</h3>
                  <span className="position">{teacher.position || 'Преподаватель'}</span>
                </div>
                {isAdmin && (
                  <div className="card-actions">
                    <button className="btn-icon" onClick={() => openEditModal(teacher)}>
                      <Edit2 size={16} />
                    </button>
                    <button className="btn-icon danger" onClick={() => deleteTeacher(teacher.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div className="card-body">
                {teacher.military_rank && (
                  <div className="stat-row">
                    <GraduationCap size={16} />
                    <span>{teacher.military_rank}</span>
                  </div>
                )}
                <div className="stat-row">
                  <BookOpen size={16} />
                  <span>{teacher.department || 'Военная кафедра'}</span>
                </div>
                {teacher.phone && (
                  <div className="stat-row">
                    <Phone size={16} />
                    <span>{teacher.phone}</span>
                  </div>
                )}
              </div>

              <div className="card-footer">
                <button className="btn btn-outline btn-sm" onClick={() => viewTeacher(teacher)}>
                  <Eye size={16} />
                  Подробнее
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedTeacher && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Профиль преподавателя</h2>
              <button className="btn-close" onClick={() => setShowDetailModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="profile-header">
                <div className="avatar large">
                  {selectedTeacher.first_name?.[0]}{selectedTeacher.last_name?.[0]}
                </div>
                <div>
                  <h3>{selectedTeacher.last_name} {selectedTeacher.first_name} {selectedTeacher.middle_name}</h3>
                  <p className="subtitle">{selectedTeacher.position}</p>
                </div>
              </div>
              <div className="profile-details">
                <div className="detail-row">
                  <span className="label">Кафедра</span>
                  <span className="value">{selectedTeacher.department || 'Военная кафедра'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Воинское звание</span>
                  <span className="value">{selectedTeacher.military_rank || 'Не указано'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Телефон</span>
                  <span className="value">{selectedTeacher.phone || 'Не указан'}</span>
                </div>
                {selectedTeacher.subjects?.length > 0 && (
                  <div className="detail-row">
                    <span className="label">Предметы</span>
                    <div className="value">
                      {selectedTeacher.subjects.map((s: any) => (
                        <span key={s.id} className="badge badge-secondary" style={{ marginRight: '0.5rem' }}>
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {isAdmin && (
              <div className="modal-footer">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setShowDetailModal(false);
                    openEditModal(selectedTeacher);
                  }}
                >
                  <Edit2 size={18} />
                  Редактировать
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingTeacher ? 'Редактировать преподавателя' : 'Добавить преподавателя'}</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="modal-body">
                {message && (
                  <div className={`alert alert-${message.type}`}>
                    {message.type === 'success' ? <Check size={18} /> : <X size={18} />}
                    {message.text}
                  </div>
                )}

                {!editingTeacher && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Email *</label>
                      <input
                        type="email"
                        className={`form-input ${errors.email ? 'error' : ''}`}
                        placeholder="teacher@kaztbu.edu.kz"
                        {...register('email')}
                      />
                      {errors.email && <span className="error-text" style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{errors.email.message}</span>}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Пароль *</label>
                      <input
                        type="text"
                        className={`form-input ${errors.password ? 'error' : ''}`}
                        {...register('password')}
                      />
                      {errors.password && <span className="error-text" style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{errors.password.message}</span>}
                      <small style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                        По умолчанию: Teacher123!
                      </small>
                    </div>
                  </>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Фамилия *</label>
                    <input
                      type="text"
                      className={`form-input ${errors.last_name ? 'error' : ''}`}
                      {...register('last_name')}
                    />
                    {errors.last_name && <span className="error-text" style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{errors.last_name.message}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Имя *</label>
                    <input
                      type="text"
                      className={`form-input ${errors.first_name ? 'error' : ''}`}
                      {...register('first_name')}
                    />
                    {errors.first_name && <span className="error-text" style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{errors.first_name.message}</span>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Отчество</label>
                    <input
                      type="text"
                      className="form-input"
                      {...register('middle_name')}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Телефон</label>
                    <input
                      type="tel"
                      className={`form-input ${errors.phone ? 'error' : ''}`}
                      placeholder="+7 (777) 123-45-67"
                      {...register('phone')}
                    />
                    {errors.phone && <span className="error-text" style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{errors.phone.message}</span>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Должность</label>
                    <select
                      className="form-input"
                      {...register('position')}
                    >
                      {positions.map(pos => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Воинское звание</label>
                    <select
                      className="form-input"
                      {...register('military_rank')}
                    >
                      <option value="">Не указано</option>
                      {militaryRanks.map(rank => (
                        <option key={rank} value={rank}>{rank}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Кафедра</label>
                  <input
                    type="text"
                    className="form-input"
                    {...register('department')}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  <Check size={18} />
                  {isSubmitting ? 'Сохранение...' : (editingTeacher ? 'Сохранить' : 'Добавить')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
