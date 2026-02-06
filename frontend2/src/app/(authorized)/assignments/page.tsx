'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import {
  useListAssignmentsApiAssignmentsGet,
  useGetMyAssignmentsApiAssignmentsMyGet,
  useCreateAssignmentApiAssignmentsPost,
  useUpdateAssignmentApiAssignmentsAssignmentIdPatch,
  useDeleteAssignmentApiAssignmentsAssignmentIdDelete
} from '@/api/client/assignments/assignments';
import { useListGroupsApiGroupsGet } from '@/api/client/groups/groups';
import { useListSubjectsApiSubjectsGet } from '@/api/client/subjects/subjects';
import { useListTeachersApiTeachersGet } from '@/api/client/teachers/teachers';
import {
  ClipboardList, Plus, Edit2, Eye, Trash2, Calendar,
  Clock, Users, BookOpen, X, Check, ChevronDown,
  FileText, Upload, CheckCircle
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import '@/styles/Management.css';

// Schema
const assignmentSchema = z.object({
  title: z.string().min(1, 'Введите название задания'),
  description: z.string().optional(),
  subject_id: z.coerce.number().min(1, 'Выберите предмет'),
  group_id: z.coerce.number().nullable().optional(),
  teacher_id: z.coerce.number().nullable().optional(),
  due_date: z.string().optional().nullable(),
  max_score: z.coerce.number().min(1).default(100),
});

type AssignmentForm = z.infer<typeof assignmentSchema>;

export default function Assignments() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';
  const isStudent = user?.role === 'student';

  // Filters
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);

  // Queries
  const { data: assignmentsData, isLoading: isLoadingAll } = useListAssignmentsApiAssignmentsGet(
    {
      group_id: selectedGroup ? parseInt(selectedGroup) : undefined,
      subject_id: selectedSubject ? parseInt(selectedSubject) : undefined
    },
    { query: { enabled: !isStudent } } as any
  );

  const { data: myAssignmentsData, isLoading: isLoadingMy } = useGetMyAssignmentsApiAssignmentsMyGet(
    undefined,
    { query: { enabled: isStudent } } as any
  );

  const { data: groupsData } = useListGroupsApiGroupsGet(undefined, { query: { enabled: !isStudent } } as any);
  const { data: subjectsData } = useListSubjectsApiSubjectsGet(undefined, { query: { enabled: !isStudent } } as any);
  const { data: teachersData } = useListTeachersApiTeachersGet(undefined, { query: { enabled: isAdmin } } as any);

  const assignments = isStudent
    ? ((myAssignmentsData?.data && Array.isArray(myAssignmentsData.data)) ? myAssignmentsData.data : [])
    : ((assignmentsData?.data && Array.isArray(assignmentsData.data)) ? assignmentsData.data : []);

  const groups = (groupsData?.data && Array.isArray(groupsData.data)) ? groupsData.data : [];
  const subjects = (subjectsData?.data && Array.isArray(subjectsData.data)) ? subjectsData.data : [];
  const teachers = (teachersData?.data && Array.isArray(teachersData.data)) ? teachersData.data : [];

  const loading = isStudent ? isLoadingMy : isLoadingAll;

  // Mutations
  const createAssignment = useCreateAssignmentApiAssignmentsPost();
  const updateAssignment = useUpdateAssignmentApiAssignmentsAssignmentIdPatch();
  const deleteAssignment = useDeleteAssignmentApiAssignmentsAssignmentIdDelete();

  // Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<AssignmentForm>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      title: '',
      description: '',
      subject_id: 0,
      group_id: null,
      teacher_id: null,
      due_date: '',
      max_score: 100,
    }
  });

  const openAddModal = () => {
    setEditingAssignment(null);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);

    reset({
      title: '',
      description: '',
      subject_id: subjects[0]?.id || 0,
      group_id: groups[0]?.id || null,
      teacher_id: isAdmin && teachers[0] ? teachers[0].id : (user && user.role === 'teacher' ? user.id : null),
      due_date: tomorrow.toISOString().split('T')[0],
      max_score: 100,
    });
    setMessage(null);
    setShowModal(true);
  };

  const openEditModal = (assignment: any) => {
    setEditingAssignment(assignment);
    reset({
      title: assignment.title,
      description: assignment.description || '',
      subject_id: assignment.subject_id,
      group_id: assignment.group_id || null,
      teacher_id: assignment.teacher_id || null,
      due_date: assignment.due_date ? assignment.due_date.split('T')[0] : '',
      max_score: assignment.max_score || 100,
    });
    setMessage(null);
    setShowModal(true);
  };

  const viewAssignment = (assignment: any) => {
    setSelectedAssignment(assignment);
    setShowDetailModal(true);
  };

  const handleFormSubmit = async (data: AssignmentForm) => {
    try {
      if (editingAssignment) {
        await updateAssignment.mutateAsync({
          assignmentId: editingAssignment.id,
          data: {
            ...data,
            description: data.description || null,
            due_date: data.due_date || null,
            group_id: data.group_id || null,
            teacher_id: data.teacher_id || null
          }
        });
        setMessage({ type: 'success', text: 'Задание успешно обновлено!' });
      } else {
        await createAssignment.mutateAsync({
          data: {
            ...data,
            description: data.description || null,
            due_date: data.due_date || null,
            group_id: data.group_id || null,
            teacher_id: isAdmin ? (data.teacher_id || null) : null
          }
        });
        setMessage({ type: 'success', text: 'Задание успешно создано!' });
      }

      await queryClient.invalidateQueries({ queryKey: ['/api/assignments/'] });

      setTimeout(() => {
        setShowModal(false);
      }, 1000);
    } catch (error: any) {
      console.error('Error saving assignment:', error);
      const detail = error.response?.data?.detail || 'Ошибка сохранения';
      setMessage({ type: 'error', text: typeof detail === 'string' ? detail : JSON.stringify(detail) });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить это задание?')) return;
    try {
      await deleteAssignment.mutateAsync({ assignmentId: id });
      await queryClient.invalidateQueries({ queryKey: ['/api/assignments/'] });
    } catch (error: any) {
      alert('Ошибка удаления');
    }
  };

  const getSubjectName = (id: number) => subjects.find((s: any) => s.id === id)?.name || '—';
  const getGroupName = (id: number) => groups.find((g: any) => g.id === id)?.name || '—';

  const getDueStatus = (dueDate: string) => {
    if (!dueDate) return { label: 'Без срока', color: 'secondary' };
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return { label: 'Просрочено', color: 'danger' };
    if (diffDays === 0) return { label: 'Сегодня', color: 'warning' };
    if (diffDays <= 3) return { label: `${diffDays} дн.`, color: 'warning' };
    return { label: `${diffDays} дн.`, color: 'success' };
  };

  return (
    <div className="management-page">
      <div className="page-header">
        <div className="page-title">
          <ClipboardList size={28} />
          <h1>Задания</h1>
          <span className="badge">{assignments.length}</span>
        </div>
        {isTeacherOrAdmin && (
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={18} />
            Создать задание
          </button>
        )}
      </div>

      {!isStudent && (
        <div className="filters-bar">
          <div className="filter-group">
            <Users size={18} />
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              <option value="">Все группы</option>
              {groups.map((group: any) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
            <ChevronDown size={16} className="select-arrow" />
          </div>

          <div className="filter-group">
            <BookOpen size={18} />
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="">Все предметы</option>
              {subjects.map((subject: any) => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
            <ChevronDown size={16} className="select-arrow" />
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Загрузка заданий...</p>
        </div>
      ) : assignments.length === 0 ? (
        <div className="empty-state">
          <ClipboardList size={48} />
          <h3>Заданий нет</h3>
          <p>{isStudent ? 'У вас пока нет заданий' : 'Создайте первое задание'}</p>
        </div>
      ) : (
        <div className="cards-grid assignments-grid">
          {assignments.map((assignment: any) => {
            const dueStatus = getDueStatus(assignment.due_date);
            return (
              <div key={assignment.id} className="card assignment-card">
                <div className="card-header">
                  <div className="assignment-icon">
                    <FileText size={24} />
                  </div>
                  <div className="assignment-info">
                    <h3>{assignment.title}</h3>
                    <span className="subject-badge">{getSubjectName(assignment.subject_id)}</span>
                  </div>
                  {isTeacherOrAdmin && (
                    <div className="card-actions">
                      <button className="btn-icon" onClick={() => openEditModal(assignment)}>
                        <Edit2 size={16} />
                      </button>
                      <button className="btn-icon danger" onClick={() => handleDelete(assignment.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="card-body">
                  <p className="assignment-description">
                    {assignment.description?.substring(0, 100)}
                    {assignment.description?.length > 100 ? '...' : ''}
                  </p>

                  <div className="assignment-meta">
                    <div className="meta-item">
                      <Users size={14} />
                      <span>{getGroupName(assignment.group_id)}</span>
                    </div>
                    <div className="meta-item">
                      <Calendar size={14} />
                      <span>
                        {assignment.due_date
                          ? new Date(assignment.due_date).toLocaleDateString('ru-RU')
                          : 'Без срока'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="card-footer">
                  <span className={`badge badge-${dueStatus.color}`}>
                    <Clock size={12} />
                    {dueStatus.label}
                  </span>
                  <button className="btn btn-outline btn-sm" onClick={() => viewAssignment(assignment)}>
                    <Eye size={16} />
                    Подробнее
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedAssignment && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedAssignment.title}</h2>
              <button className="btn-close" onClick={() => setShowDetailModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="assignment-details">
                <div className="detail-grid">
                  <div className="detail-item">
                    <BookOpen size={18} />
                    <div>
                      <span className="label">Предмет</span>
                      <span className="value">{getSubjectName(selectedAssignment.subject_id)}</span>
                    </div>
                  </div>
                  <div className="detail-item">
                    <Users size={18} />
                    <div>
                      <span className="label">Группа</span>
                      <span className="value">{getGroupName(selectedAssignment.group_id)}</span>
                    </div>
                  </div>
                  <div className="detail-item">
                    <Calendar size={18} />
                    <div>
                      <span className="label">Срок сдачи</span>
                      <span className="value">
                        {selectedAssignment.due_date
                          ? new Date(selectedAssignment.due_date).toLocaleDateString('ru-RU')
                          : 'Не указан'}
                      </span>
                    </div>
                  </div>
                  <div className="detail-item">
                    <CheckCircle size={18} />
                    <div>
                      <span className="label">Макс. балл</span>
                      <span className="value">{selectedAssignment.max_score || 100}</span>
                    </div>
                  </div>
                </div>

                <div className="description-section">
                  <h3>Описание задания</h3>
                  <p>{selectedAssignment.description || 'Описание не указано'}</p>
                </div>

                {isStudent && (
                  <div className="submission-section">
                    <h3>Ваш ответ</h3>
                    <div className="submission-form">
                      <textarea
                        className="form-input"
                        rows={4}
                        placeholder="Введите ваш ответ или комментарий..."
                      />
                      <div className="submission-actions">
                        <button className="btn btn-outline">
                          <Upload size={18} />
                          Прикрепить файл
                        </button>
                        <button className="btn btn-primary">
                          <Check size={18} />
                          Отправить
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              {isTeacherOrAdmin && (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setShowDetailModal(false);
                    openEditModal(selectedAssignment);
                  }}
                >
                  <Edit2 size={18} />
                  Редактировать
                </button>
              )}
              <button className="btn btn-outline" onClick={() => setShowDetailModal(false)}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingAssignment ? 'Редактировать задание' : 'Новое задание'}</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit(handleFormSubmit)}>
              <div className="modal-body">
                {message && (
                  <div className={`alert alert-${message.type}`}>
                    {message.type === 'success' ? <Check size={18} /> : <X size={18} />}
                    {message.text}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Название *</label>
                  <input
                    type="text"
                    className={`form-input ${errors.title ? 'error' : ''}`}
                    placeholder="Например: Домашнее задание №1"
                    {...register('title')}
                  />
                  {errors.title && <span className="error-text">{errors.title.message}</span>}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Предмет *</label>
                    <select
                      className={`form-input ${errors.subject_id ? 'error' : ''}`}
                      {...register('subject_id')}
                    >
                      <option value="0">Выберите предмет</option>
                      {subjects.map((subject: any) => (
                        <option key={subject.id} value={subject.id}>{subject.name}</option>
                      ))}
                    </select>
                    {errors.subject_id && <span className="error-text">{errors.subject_id.message}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Группа</label>
                    <select
                      className="form-input"
                      {...register('group_id')}
                    >
                      <option value="">Все группы</option>
                      {groups.map((group: any) => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {isAdmin && (
                  <div className="form-group">
                    <label className="form-label">Преподаватель</label>
                    <select
                      className="form-input"
                      {...register('teacher_id')}
                    >
                      <option value="">Выберите преподавателя</option>
                      {teachers.map((teacher: any) => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.last_name} {teacher.first_name} {teacher.middle_name || ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Срок сдачи</label>
                    <input
                      type="date"
                      className="form-input"
                      {...register('due_date')}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Макс. балл</label>
                    <input
                      type="number"
                      className="form-input"
                      min="1"
                      max="100"
                      {...register('max_score')}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Описание задания</label>
                  <textarea
                    className="form-input"
                    rows={5}
                    placeholder="Подробное описание задания, требования, критерии оценки..."
                    {...register('description')}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={createAssignment.isPending || updateAssignment.isPending}>
                  <Check size={18} />
                  {createAssignment.isPending || updateAssignment.isPending ? 'Сохранение...' : (editingAssignment ? 'Сохранить' : 'Создать')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
