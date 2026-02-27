'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Users, Search, Plus, Edit2, Eye,
  Phone, Mail, Calendar, MapPin, X, Check, Trash2, Filter
} from 'lucide-react';
import '@/styles/Management.css';

// Import generated hooks and types
import {
  useListStudentsApiStudentsGet,
  useCreateStudentApiStudentsPost,
  useUpdateStudentApiStudentsStudentIdPatch,
  useDeleteStudentApiStudentsStudentIdDelete
} from '@/api/orval/client/students/students';
import { useListGroupsApiGroupsGet } from '@/api/orval/client/groups/groups';

// Regex constants
const phoneRegex = /^\+?[0-9\s\-\(\)]*$/;

// Zod schema
const studentSchema = z.object({
  first_name: z.string().min(1, 'Введите имя'),
  last_name: z.string().min(1, 'Введите фамилию'),
  middle_name: z.string().optional(),
  platoon: z.string().min(1, 'Выберите взвод'),
  rank: z.string().optional(),
  phone: z.string().regex(phoneRegex, 'Неверный формат телефона').optional().or(z.literal('')),
  address: z.string().optional(),
  birth_date: z.string().optional(),
  email: z.string().email('Неверный email').optional().or(z.literal('')),
  password: z.string().min(6, 'Минимум 6 символов').optional().or(z.literal('')),
});

type StudentForm = z.infer<typeof studentSchema>;

export default function Students() {
  const { user } = useAuthStore();

  // React Query Hooks
  const {
    data: studentsData,
    isLoading: isLoadingStudents,
    refetch: refetchStudents
  } = useListStudentsApiStudentsGet();

  const {
    data: groupsData,
    isLoading: isLoadingGroups
  } = useListGroupsApiGroupsGet();

  const createStudentMutation = useCreateStudentApiStudentsPost();
  const updateStudentMutation = useUpdateStudentApiStudentsStudentIdPatch();
  const deleteStudentMutation = useDeleteStudentApiStudentsStudentIdDelete();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlatoon, setFilterPlatoon] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [message, setMessage] = useState<any>(null);

  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';
  const canEdit = isAdmin || isTeacher;

  const students = Array.isArray(studentsData?.data) ? studentsData.data : [];
  const groups = Array.isArray(groupsData?.data) ? groupsData.data : [];

  // Extract unique platoons/groups for filter
  const platoons = Array.from(new Set(groups.map(g => g.name)));

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<StudentForm>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      middle_name: '',
      platoon: '',
      rank: 'Рядовой',
      phone: '',
      address: '',
      birth_date: '',
    }
  });

  const filteredStudents = students.filter(student => {
    const fullName = `${student.last_name} ${student.first_name} ${student.middle_name || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase());
    const matchesPlatoon = filterPlatoon === 'all' || student.group?.name === filterPlatoon;
    return matchesSearch && matchesPlatoon;
  });

  const viewStudent = (student: any) => {
    setSelectedStudent(student);
    setShowDetailModal(true);
  };

  const openAddModal = () => {
    setEditingStudent(null);
    reset({
      email: '',
      password: 'Student123!',
      first_name: '',
      last_name: '',
      middle_name: '',
      platoon: '',
      rank: 'Рядовой',
      phone: '',
      address: '',
      birth_date: '',
    });
    setMessage(null);
    setShowModal(true);
  };

  const openEditModal = (student: any) => {
    setEditingStudent(student);
    reset({
      email: student.email || '',
      password: '',
      first_name: student.first_name,
      last_name: student.last_name,
      middle_name: student.middle_name || '',
      platoon: student.group?.id?.toString() || '',
      rank: student.rank || 'Рядовой',
      phone: student.phone || '',
      address: student.address || '',
      birth_date: student.birth_date ? new Date(student.birth_date).toISOString().split('T')[0] : '',
    });
    setMessage(null);
    setShowModal(true);
  };

  const onSubmit = async (data: StudentForm) => {
    setMessage(null);

    // Manual validation for create mode
    if (!editingStudent) {
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
      if (editingStudent) {
        await updateStudentMutation.mutateAsync({
          studentId: editingStudent.id,
          data: {
            first_name: data.first_name,
            last_name: data.last_name,
            middle_name: data.middle_name || null,
            phone: data.phone || null,
            address: data.address || null,
            birth_date: data.birth_date ? new Date(data.birth_date).toISOString() : null,
            group_id: parseInt(data.platoon),
            rank: data.rank || null,
          }
        });
        setMessage({ type: 'success', text: 'Курсант успешно обновлён!' });
      } else {
        await createStudentMutation.mutateAsync({
          data: {
            email: data.email!,
            password: data.password!,
            first_name: data.first_name,
            last_name: data.last_name,
            middle_name: data.middle_name || null,
            phone: data.phone || null,
            address: data.address || null,
            birth_date: data.birth_date ? new Date(data.birth_date).toISOString() : null,
            group_id: parseInt(data.platoon),
            rank: data.rank || null,
          }
        });
        setMessage({ type: 'success', text: 'Курсант успешно добавлен!' });
      }

      refetchStudents();
      setTimeout(() => {
        setShowModal(false);
      }, 1000);
    } catch (error: any) {
      console.error('Error saving student:', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Ошибка сохранения' });
    }
  };

  const deleteStudent = async (studentId: any) => {
    if (!confirm('Вы уверены, что хотите удалить этого курсанта?')) return;

    try {
      await deleteStudentMutation.mutateAsync({ studentId });
      refetchStudents();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Ошибка удаления');
    }
  };

  const ranks = [
    'Рядовой', 'Ефрейтор', 'Младший сержант', 'Сержант'
  ];

  return (
    <div className="management-page">
      <div className="page-header">
        <div className="page-title">
          <Users size={28} />
          <h1>Курсанты</h1>
          <span className="badge">{filteredStudents.length}</span>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={18} />
            Добавить курсанта
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
        <div className="filter-group">
          <Filter size={18} />
          <select value={filterPlatoon} onChange={(e) => setFilterPlatoon(e.target.value)}>
            <option value="all">Все взводы</option>
            {platoons.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoadingStudents ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Загрузка курсантов...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <h3>Курсанты не найдены</h3>
          <p>Попробуйте изменить параметры поиска или добавить курсантов</p>
        </div>
      ) : (
        <div className="cards-grid">
          {filteredStudents.map(student => (
            <div key={student.id} className="card student-card">
              <div className="card-header">
                <div className="avatar">
                  {student.first_name?.[0]}{student.last_name?.[0]}
                </div>
                <div className="student-info">
                  <h3>{student.last_name} {student.first_name}</h3>
                  <span className="rank">{student.rank || 'Рядовой'}</span>
                </div>
                {canEdit && (
                  <div className="card-actions">
                    <button className="btn-icon" onClick={() => openEditModal(student)}>
                      <Edit2 size={16} />
                    </button>
                    <button className="btn-icon danger" onClick={() => deleteStudent(student.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div className="card-body">
                <div className="stat-row">
                  <Users size={16} />
                  <span>Взвод {student.group?.name || 'Не назначен'}</span>
                </div>
                {student.phone && (
                  <div className="stat-row">
                    <Phone size={16} />
                    <span>{student.phone}</span>
                  </div>
                )}
              </div>

              <div className="card-footer">
                <button className="btn btn-outline btn-sm" onClick={() => viewStudent(student)}>
                  <Eye size={16} />
                  Подробнее
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedStudent && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Профиль курсанта</h2>
              <button className="btn-close" onClick={() => setShowDetailModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="profile-header">
                <div className="avatar large">
                  {selectedStudent.first_name?.[0]}{selectedStudent.last_name?.[0]}
                </div>
                <div>
                  <h3>{selectedStudent.last_name} {selectedStudent.first_name} {selectedStudent.middle_name}</h3>
                  <p className="subtitle">{selectedStudent.rank}</p>
                </div>
              </div>
              <div className="profile-details">
                <div className="detail-row">
                  <span className="label">Взвод</span>
                  <span className="value">{selectedStudent.group?.name || 'Не назначен'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Телефон</span>
                  <span className="value">{selectedStudent.phone || 'Не указан'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Email</span>
                  <span className="value">{selectedStudent.email}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Адрес</span>
                  <span className="value">{selectedStudent.address || 'Не указан'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Дата рождения</span>
                  <span className="value">
                    {selectedStudent.birth_date
                      ? new Date(selectedStudent.birth_date).toLocaleDateString()
                      : 'Не указана'}
                  </span>
                </div>
              </div>
            </div>
            {canEdit && (
              <div className="modal-footer">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setShowDetailModal(false);
                    openEditModal(selectedStudent);
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
              <h2>{editingStudent ? 'Редактировать курсанта' : 'Добавить курсанта'}</h2>
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

                {!editingStudent && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Email *</label>
                      <input
                        type="email"
                        className={`form-input ${errors.email ? 'error' : ''}`}
                        placeholder="student@kaztbu.edu.kz"
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
                        По умолчанию: Student123!
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
                    <label className="form-label">Взвод *</label>
                    <select
                      className={`form-input ${errors.platoon ? 'error' : ''}`}
                      {...register('platoon')}
                    >
                      <option value="">Выберите взвод</option>
                      {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                    {errors.platoon && <span className="error-text" style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{errors.platoon.message}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Звание</label>
                    <select
                      className="form-input"
                      {...register('rank')}
                    >
                      {ranks.map(rank => (
                        <option key={rank} value={rank}>{rank}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Адрес</label>
                  <input
                    type="text"
                    className="form-input"
                    {...register('address')}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Дата рождения</label>
                  <input
                    type="date"
                    className="form-input"
                    {...register('birth_date')}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  <Check size={18} />
                  {isSubmitting ? 'Сохранение...' : (editingStudent ? 'Сохранить' : 'Добавить')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
