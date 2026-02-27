'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FolderOpen, Plus, Edit2, Trash2, Users,
  Calendar, ChevronRight, X, Check
} from 'lucide-react';
import '@/styles/Management.css';

// Import generated hooks
import {
  useListGroupsApiGroupsGet,
  useCreateGroupApiGroupsPost,
  useUpdateGroupApiGroupsGroupIdPatch,
  useDeleteGroupApiGroupsGroupIdDelete
} from '@/api/orval/client/groups/groups';

const groupSchema = z.object({
  name: z.string().min(1, 'Введите название группы'),
  course: z.coerce.number().min(1).max(5),
  year: z.coerce.number().min(2000).max(2100),
});

type GroupForm = z.infer<typeof groupSchema>;

export default function Groups() {
  const { user } = useAuthStore();

  // React Query Hooks
  const {
    data: groupsData,
    isLoading: isLoadingGroups,
    refetch: refetchGroups
  } = useListGroupsApiGroupsGet();

  const createGroupMutation = useCreateGroupApiGroupsPost();
  const updateGroupMutation = useUpdateGroupApiGroupsGroupIdPatch();
  const deleteGroupMutation = useDeleteGroupApiGroupsGroupIdDelete();

  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [message, setMessage] = useState<any>(null);

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';

  const groups = Array.isArray(groupsData?.data) ? groupsData.data : [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GroupForm>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: '',
      course: 1,
      year: new Date().getFullYear(),
    }
  });

  const openCreateModal = () => {
    setEditingGroup(null);
    reset({ name: '', course: 1, year: new Date().getFullYear() });
    setMessage(null);
    setShowModal(true);
  };

  const openEditModal = (group: any) => {
    setEditingGroup(group);
    reset({ name: group.name, course: group.course, year: group.year });
    setMessage(null);
    setShowModal(true);
  };

  const onSubmit = async (data: GroupForm) => {
    setMessage(null);
    try {
      if (editingGroup) {
        // Update existing group
        await updateGroupMutation.mutateAsync({
          groupId: editingGroup.id,
          data: {
            name: data.name,
            course: data.course,
            year: data.year
          }
        });
        setMessage({ type: 'success', text: 'Группа успешно обновлена!' });
      } else {
        // Create new group
        await createGroupMutation.mutateAsync({
          data: {
            name: data.name,
            course: data.course,
            year: data.year
          }
        });
        setMessage({ type: 'success', text: 'Группа успешно создана!' });
      }

      refetchGroups();
      setTimeout(() => {
        setShowModal(false);
      }, 1000);
    } catch (error: any) {
      console.error('Error saving group:', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Ошибка сохранения' });
    }
  };

  const deleteGroup = async (groupId: any) => {
    if (!confirm('Вы уверены, что хотите удалить эту группу?')) return;
    try {
      await deleteGroupMutation.mutateAsync({ groupId });
      refetchGroups();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Ошибка удаления');
    }
  };

  return (
    <div className="management-page">
      <div className="page-header">
        <div className="page-title">
          <FolderOpen size={28} />
          <h1>Группы</h1>
          <span className="badge">{groups.length}</span>
        </div>
        {isTeacherOrAdmin && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={18} />
            Добавить группу
          </button>
        )}
      </div>

      {isLoadingGroups ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Загрузка групп...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="empty-state">
          <FolderOpen size={48} />
          <h3>Группы не найдены</h3>
          <p>Создайте первую группу для начала работы</p>
          {isTeacherOrAdmin && (
            <button className="btn btn-primary" onClick={openCreateModal}>
              <Plus size={18} />
              Создать группу
            </button>
          )}
        </div>
      ) : (
        <div className="cards-grid">
          {groups.map(group => (
            <div key={group.id} className="card group-card">
              <div className="card-header">
                <div className="group-icon">
                  <Users size={24} />
                </div>
                <div className="group-info">
                  <h3>{group.name}</h3>
                  <span className="course-badge">{group.course} курс</span>
                </div>
                {isTeacherOrAdmin && (
                  <div className="card-actions">
                    <button className="btn-icon" onClick={() => openEditModal(group)}>
                      <Edit2 size={16} />
                    </button>
                    <button className="btn-icon danger" onClick={() => deleteGroup(group.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div className="card-body">
                <div className="stat-row">
                  <Calendar size={16} />
                  <span>Год набора: {group.year}</span>
                </div>
                {/* <div className="stat-row">
                  <Users size={16} />
                  <span>Студентов: {group.students_count || 0}</span>
                </div> */}
              </div>
              <div className="card-footer">
                <button className="btn btn-outline btn-sm">
                  Подробнее
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingGroup ? 'Редактировать группу' : 'Новая группа'}</h2>
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
                  <label className="form-label">Название группы</label>
                  <input
                    type="text"
                    className={`form-input ${errors.name ? 'error' : ''}`}
                    placeholder="Например: ВК-24-1"
                    {...register('name')}
                  />
                  {errors.name && <span className="error-text" style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{errors.name.message}</span>}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Курс</label>
                    <select
                      className="form-input"
                      {...register('course', { valueAsNumber: true })}
                    >
                      <option value={1}>1 курс</option>
                      <option value={2}>2 курс</option>
                      <option value={3}>3 курс</option>
                      <option value={4}>4 курс</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Год набора</label>
                    <input
                      type="number"
                      className="form-input"
                      {...register('year', { valueAsNumber: true })}
                    />
                  </div>
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
