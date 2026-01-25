import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { groupsAPI } from '../api/auth';
import { 
  FolderOpen, Plus, Edit2, Trash2, Users, 
  Calendar, ChevronRight, X, Check 
} from 'lucide-react';
import './Management.css';

export default function Groups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState({ name: '', course: 1, year: new Date().getFullYear() });
  const [saving, setSaving] = useState(false);

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      const data = await groupsAPI.getAll();
      setGroups(data);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingGroup(null);
    setFormData({ name: '', course: 1, year: new Date().getFullYear() });
    setShowModal(true);
  };

  const openEditModal = (group) => {
    setEditingGroup(group);
    setFormData({ name: group.name, course: group.course, year: group.year });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingGroup) {
        // Update existing group
        await groupsAPI.update(editingGroup.id, formData);
      } else {
        // Create new group
        await groupsAPI.create(formData);
      }
      setShowModal(false);
      loadGroups();
    } catch (error) {
      console.error('Error saving group:', error);
      alert(error.response?.data?.detail || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = async (groupId) => {
    if (!confirm('Вы уверены, что хотите удалить эту группу?')) return;
    try {
      await groupsAPI.delete(groupId);
      loadGroups();
    } catch (error) {
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

      {loading ? (
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
                <div className="stat-row">
                  <Users size={16} />
                  <span>Студентов: {group.students_count || 0}</span>
                </div>
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
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Название группы</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Например: ВК-24-1"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Курс</label>
                    <select
                      className="form-input"
                      value={formData.course}
                      onChange={(e) => setFormData({ ...formData, course: parseInt(e.target.value) })}
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
                      min="2020"
                      max="2030"
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Check size={18} />
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}






