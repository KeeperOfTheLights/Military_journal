'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  BookOpen, Plus, Edit2, Trash2, Clock,
  X, Check, FileText
} from 'lucide-react';
import '@/styles/Management.css';

// Import generated hooks
import {
  useListSubjectsApiSubjectsGet,
  useCreateSubjectApiSubjectsPost,
  useUpdateSubjectApiSubjectsSubjectIdPatch,
  useDeleteSubjectApiSubjectsSubjectIdDelete
} from '@/api/client/subjects/subjects';

const subjectSchema = z.object({
  name: z.string().min(1, 'Введите название предмета'),
  code: z.string().min(1, 'Введите код предмета'),
  description: z.string().optional(),
  credits: z.coerce.number().min(1, 'Минимум 1 кредит'),
});

type SubjectForm = z.infer<typeof subjectSchema>;

export default function Subjects() {
  const { user } = useAuthStore();

  // React Query Hooks
  const {
    data: subjectsData,
    isLoading: isLoadingSubjects,
    refetch: refetchSubjects
  } = useListSubjectsApiSubjectsGet();

  const createSubjectMutation = useCreateSubjectApiSubjectsPost();
  const updateSubjectMutation = useUpdateSubjectApiSubjectsSubjectIdPatch();
  const deleteSubjectMutation = useDeleteSubjectApiSubjectsSubjectIdDelete();

  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [message, setMessage] = useState<any>(null);

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';

  const subjects = Array.isArray(subjectsData?.data) ? subjectsData.data : [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubjectForm>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      credits: 3,
    }
  });

  const openCreateModal = () => {
    setEditingSubject(null);
    reset({
      name: '',
      code: '',
      description: '',
      credits: 3,
    });
    setMessage(null);
    setShowModal(true);
  };

  const openEditModal = (subject: any) => {
    setEditingSubject(subject);
    reset({
      name: subject.name,
      code: subject.code || '',
      description: subject.description || '',
      credits: subject.credits || 0,
    });
    setMessage(null);
    setShowModal(true);
  };

  const onSubmit = async (data: SubjectForm) => {
    setMessage(null);
    try {
      if (editingSubject) {
        await updateSubjectMutation.mutateAsync({
          subjectId: editingSubject.id,
          data: {
            name: data.name,
            code: data.code,
            description: data.description || null,
            credits: data.credits,
          }
        });
        setMessage({ type: 'success', text: 'Предмет успешно обновлён!' });
      } else {
        await createSubjectMutation.mutateAsync({
          data: {
            name: data.name,
            code: data.code,
            description: data.description || null,
            credits: data.credits,
          }
        });
        setMessage({ type: 'success', text: 'Предмет успешно добавлен!' });
      }

      refetchSubjects();
      setTimeout(() => {
        setShowModal(false);
      }, 1000);
    } catch (error: any) {
      console.error('Error saving subject:', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Ошибка сохранения' });
    }
  };

  const deleteSubject = async (subjectId: any) => {
    if (!confirm('Вы уверены, что хотите удалить этот предмет?')) return;
    try {
      await deleteSubjectMutation.mutateAsync({ subjectId });
      refetchSubjects();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Ошибка удаления');
    }
  };

  return (
    <div className="management-page">
      <div className="page-header">
        <div className="page-title">
          <BookOpen size={28} />
          <h1>Предметы</h1>
          <span className="badge">{subjects.length}</span>
        </div>
        {isTeacherOrAdmin && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={18} />
            Добавить предмет
          </button>
        )}
      </div>

      {isLoadingSubjects ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Загрузка предметов...</p>
        </div>
      ) : subjects.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={48} />
          <h3>Предметы не найдены</h3>
          <p>Создайте первый предмет для начала работы</p>
          {isTeacherOrAdmin && (
            <button className="btn btn-primary" onClick={openCreateModal}>
              <Plus size={18} />
              Создать предмет
            </button>
          )}
        </div>
      ) : (
        <div className="cards-grid">
          {subjects.map(subject => (
            <div key={subject.id} className="card subject-card">
              <div className="card-header">
                <div className="subject-icon">
                  <BookOpen size={24} />
                </div>
                <div className="subject-info">
                  <h3>{subject.name}</h3>
                  {subject.code && <span className="code-badge">{subject.code}</span>}
                </div>
                {isTeacherOrAdmin && (
                  <div className="card-actions">
                    <button className="btn-icon" onClick={() => openEditModal(subject)}>
                      <Edit2 size={16} />
                    </button>
                    <button className="btn-icon danger" onClick={() => deleteSubject(subject.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div className="card-body">
                {subject.description && (
                  <p className="description">{subject.description}</p>
                )}
                <div className="stats-row">
                  <div className="stat">
                    <FileText size={16} />
                    <span>{subject.credits || 0} кредитов</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingSubject ? 'Редактировать предмет' : 'Новый предмет'}</h2>
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

                <div className="form-group">
                  <label className="form-label">Название предмета</label>
                  <input
                    type="text"
                    className={`form-input ${errors.name ? 'error' : ''}`}
                    placeholder="Например: Тактическая подготовка"
                    {...register('name')}
                  />
                  {errors.name && <span className="error-text">{errors.name.message}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Код предмета</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Например: ТП-101"
                    {...register('code')}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Описание</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Краткое описание предмета..."
                    {...register('description')}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Кредиты</label>
                  <input
                    type="number"
                    className={`form-input ${errors.credits ? 'error' : ''}`}
                    min="1"
                    {...register('credits')}
                  />
                  {errors.credits && <span className="error-text">{errors.credits.message}</span>}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  <Check size={18} />
                  {isSubmitting ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
