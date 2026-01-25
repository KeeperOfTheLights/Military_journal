import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { assignmentsAPI, groupsAPI, subjectsAPI, teachersAPI } from '../api/auth';
import { 
  ClipboardList, Plus, Edit2, Eye, Trash2, Calendar, 
  Clock, Users, BookOpen, X, Check, ChevronDown, 
  AlertCircle, FileText, Upload, Download, CheckCircle, UserCog
} from 'lucide-react';
import './Management.css';

export default function Assignments() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subject_id: '',
    group_id: '',
    teacher_id: '',
    due_date: '',
    max_score: 100,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';
  const isStudent = user?.role === 'student';

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [selectedGroup, selectedSubject]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [groupsData, subjectsData, teachersData] = await Promise.all([
        groupsAPI.getAll(),
        subjectsAPI.getAll(),
        isTeacherOrAdmin ? teachersAPI.getAll() : Promise.resolve([])
      ]);
      setGroups(groupsData);
      setSubjects(subjectsData);
      setTeachers(teachersData);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssignments = async () => {
    try {
      let data;
      if (isStudent) {
        data = await assignmentsAPI.getMy();
      } else {
        data = await assignmentsAPI.getAll({
          group_id: selectedGroup || undefined,
          subject_id: selectedSubject || undefined
        });
      }
      setAssignments(data);
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  };

  const openAddModal = () => {
    setEditingAssignment(null);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    
    setFormData({
      title: '',
      description: '',
      subject_id: subjects[0]?.id || '',
      group_id: groups[0]?.id || '',
      teacher_id: teachers[0]?.id || '',
      due_date: tomorrow.toISOString().split('T')[0],
      max_score: 100,
    });
    setMessage(null);
    setShowModal(true);
  };

  const openEditModal = (assignment) => {
    setEditingAssignment(assignment);
    setFormData({
      title: assignment.title,
      description: assignment.description || '',
      subject_id: assignment.subject_id,
      group_id: assignment.group_id || '',
      teacher_id: assignment.teacher_id || '',
      due_date: assignment.due_date?.split('T')[0] || '',
      max_score: assignment.max_score || 100,
    });
    setMessage(null);
    setShowModal(true);
  };

  const viewAssignment = (assignment) => {
    setSelectedAssignment(assignment);
    setShowDetailModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    
    // Validate required fields
    if (!formData.subject_id) {
      setMessage({ type: 'error', text: 'Выберите предмет' });
      setSaving(false);
      return;
    }
    
    if (!formData.title.trim()) {
      setMessage({ type: 'error', text: 'Введите название задания' });
      setSaving(false);
      return;
    }
    
    // Admin must select a teacher
    if (isAdmin && !formData.teacher_id) {
      setMessage({ type: 'error', text: 'Выберите преподавателя' });
      setSaving(false);
      return;
    }
    
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description || null,
        subject_id: parseInt(formData.subject_id),
        group_id: formData.group_id ? parseInt(formData.group_id) : null,
        teacher_id: formData.teacher_id ? parseInt(formData.teacher_id) : null,
        due_date: formData.due_date || null,
        max_score: parseFloat(formData.max_score) || 100,
      };
      
      if (editingAssignment) {
        await assignmentsAPI.update(editingAssignment.id, payload);
        setMessage({ type: 'success', text: 'Задание успешно обновлено!' });
      } else {
        await assignmentsAPI.create(payload);
        setMessage({ type: 'success', text: 'Задание успешно создано!' });
      }
      
      setTimeout(() => {
        setShowModal(false);
        loadAssignments();
      }, 1000);
    } catch (error) {
      console.error('Error saving assignment:', error);
      // Handle error message - it might be an object or array from the API
      let errorText = 'Ошибка сохранения';
      const detail = error.response?.data?.detail;
      if (typeof detail === 'string') {
        errorText = detail;
      } else if (Array.isArray(detail)) {
        errorText = detail.map(d => d.msg || String(d)).join(', ');
      } else if (detail && typeof detail === 'object') {
        errorText = detail.msg || JSON.stringify(detail);
      }
      setMessage({ type: 'error', text: errorText });
    } finally {
      setSaving(false);
    }
  };

  const deleteAssignment = async (id) => {
    if (!confirm('Удалить это задание?')) return;
    
    try {
      await assignmentsAPI.delete(id);
      loadAssignments();
    } catch (error) {
      const detail = error.response?.data?.detail;
      let errorText = 'Ошибка удаления';
      if (typeof detail === 'string') {
        errorText = detail;
      } else if (Array.isArray(detail)) {
        errorText = detail.map(d => d.msg || String(d)).join(', ');
      } else if (detail && typeof detail === 'object') {
        errorText = detail.msg || JSON.stringify(detail);
      }
      alert(errorText);
    }
  };

  const getSubjectName = (id) => subjects.find(s => s.id === id)?.name || '—';
  const getGroupName = (id) => groups.find(g => g.id === id)?.name || '—';

  const getDueStatus = (dueDate) => {
    if (!dueDate) return { label: 'Без срока', color: 'secondary' };
    
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
    
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
              {groups.map(group => (
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
              {subjects.map(subject => (
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
          {assignments.map(assignment => {
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
                      <button className="btn-icon danger" onClick={() => deleteAssignment(assignment.id)}>
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
                        rows="4"
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
            <form onSubmit={handleSubmit}>
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
                    className="form-input"
                    placeholder="Например: Домашнее задание №1"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                
                <div className="form-row">
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
                    <label className="form-label">Группа</label>
                    <select
                      className="form-input"
                      value={formData.group_id}
                      onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                    >
                      <option value="">Все группы</option>
                      {groups.map(group => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {isAdmin && (
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
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Макс. балл</label>
                    <input
                      type="number"
                      className="form-input"
                      min="1"
                      max="100"
                      value={formData.max_score}
                      onChange={(e) => setFormData({ ...formData, max_score: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Описание задания</label>
                  <textarea
                    className="form-input"
                    rows="5"
                    placeholder="Подробное описание задания, требования, критерии оценки..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Check size={18} />
                  {saving ? 'Сохранение...' : (editingAssignment ? 'Сохранить' : 'Создать')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

