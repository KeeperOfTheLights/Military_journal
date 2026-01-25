import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { subjectsAPI } from '../api/auth';
import { 
  BookOpen, Plus, Edit2, Trash2, Clock, 
  X, Check, FileText 
} from 'lucide-react';
import './Management.css';

export default function Subjects() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [formData, setFormData] = useState({ 
    name: '', 
    code: '', 
    description: '',
    credits: 3,
    hours_total: 90
  });
  const [saving, setSaving] = useState(false);

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const data = await subjectsAPI.getAll();
      setSubjects(data);
    } catch (error) {
      console.error('Error loading subjects:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingSubject(null);
    setFormData({ name: '', code: '', description: '', credits: 3, hours_total: 90 });
    setShowModal(true);
  };

  const openEditModal = (subject) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      code: subject.code || '',
      description: subject.description || '',
      credits: subject.credits || 3,
      hours_total: subject.hours_total || 90
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingSubject) {
        await subjectsAPI.update(editingSubject.id, formData);
      } else {
        await subjectsAPI.create(formData);
      }
      setShowModal(false);
      loadSubjects();
    } catch (error) {
      console.error('Error saving subject:', error);
      alert(error.response?.data?.detail || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const deleteSubject = async (subjectId) => {
    if (!confirm('Вы уверены, что хотите удалить этот предмет?')) return;
    try {
      await subjectsAPI.delete(subjectId);
      loadSubjects();
    } catch (error) {
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

      {loading ? (
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
                    <Clock size={16} />
                    <span>{subject.hours_total || 0} часов</span>
                  </div>
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
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Название предмета</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Например: Тактическая подготовка"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Код предмета</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Например: ТП-101"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Описание</label>
                  <textarea
                    className="form-input"
                    rows="3"
                    placeholder="Краткое описание предмета..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Кредиты</label>
                    <input
                      type="number"
                      className="form-input"
                      min="1"
                      max="10"
                      value={formData.credits}
                      onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Всего часов</label>
                    <input
                      type="number"
                      className="form-input"
                      min="1"
                      value={formData.hours_total}
                      onChange={(e) => setFormData({ ...formData, hours_total: parseInt(e.target.value) })}
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






