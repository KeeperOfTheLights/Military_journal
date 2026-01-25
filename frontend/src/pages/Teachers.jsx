import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { teachersAPI, subjectsAPI } from '../api/auth';
import { 
  GraduationCap, Search, Plus, Edit2, Eye, 
  Phone, Mail, BookOpen, X, Check, Trash2
} from 'lucide-react';
import './Management.css';

export default function Teachers() {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: 'Teacher123!',
    first_name: '',
    last_name: '',
    middle_name: '',
    phone: '',
    department: 'Военная кафедра',
    position: 'Преподаватель',
    military_rank: '',
    subject_ids: [],
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [teachersData, subjectsData] = await Promise.all([
        teachersAPI.getAll(),
        subjectsAPI.getAll()
      ]);
      setTeachers(teachersData);
      setSubjects(subjectsData);
    } catch (error) {
      console.error('Error loading teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeachers = teachers.filter(teacher => {
    const fullName = `${teacher.last_name} ${teacher.first_name} ${teacher.middle_name || ''}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  const viewTeacher = (teacher) => {
    setSelectedTeacher(teacher);
    setShowDetailModal(true);
  };

  const openAddModal = () => {
    setEditingTeacher(null);
    setFormData({
      email: '',
      password: 'Teacher123!',
      first_name: '',
      last_name: '',
      middle_name: '',
      phone: '',
      department: 'Военная кафедра',
      position: 'Преподаватель',
      military_rank: '',
      subject_ids: [],
    });
    setMessage(null);
    setShowModal(true);
  };

  const openEditModal = (teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      first_name: teacher.first_name,
      last_name: teacher.last_name,
      middle_name: teacher.middle_name || '',
      phone: teacher.phone || '',
      department: teacher.department || 'Военная кафедра',
      position: teacher.position || 'Преподаватель',
      military_rank: teacher.military_rank || '',
      subject_ids: teacher.subjects?.map(s => s.id) || [],
    });
    setMessage(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    
    try {
      if (editingTeacher) {
        await teachersAPI.update(editingTeacher.id, {
          first_name: formData.first_name,
          last_name: formData.last_name,
          middle_name: formData.middle_name || null,
          phone: formData.phone || null,
          department: formData.department,
          position: formData.position,
          military_rank: formData.military_rank || null,
        });
        setMessage({ type: 'success', text: 'Преподаватель успешно обновлён!' });
      } else {
        await teachersAPI.create({
          email: formData.email,
          password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name,
          middle_name: formData.middle_name || null,
          phone: formData.phone || null,
          department: formData.department,
          position: formData.position,
          military_rank: formData.military_rank || null,
        });
        setMessage({ type: 'success', text: 'Преподаватель успешно добавлен!' });
      }
      
      setTimeout(() => {
        setShowModal(false);
        loadData();
      }, 1000);
    } catch (error) {
      console.error('Error saving teacher:', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Ошибка сохранения' });
    } finally {
      setSaving(false);
    }
  };

  const deleteTeacher = async (teacherId) => {
    if (!confirm('Вы уверены, что хотите удалить этого преподавателя?')) return;
    
    try {
      await teachersAPI.delete(teacherId);
      loadData();
    } catch (error) {
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

      {loading ? (
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
                      {selectedTeacher.subjects.map(s => (
                        <span key={s.id} className="badge badge-secondary" style={{marginRight: '0.5rem'}}>
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
            <form onSubmit={handleSubmit}>
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
                        className="form-input"
                        placeholder="teacher@kaztbu.edu.kz"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Пароль *</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                      />
                      <small style={{color: 'var(--text-secondary)', fontSize: '0.75rem'}}>
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
                      className="form-input"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Имя *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Отчество</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.middle_name}
                      onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Телефон</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="+7 (777) 123-45-67"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Должность</label>
                    <select
                      className="form-input"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
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
                      value={formData.military_rank}
                      onChange={(e) => setFormData({ ...formData, military_rank: e.target.value })}
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
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Check size={18} />
                  {saving ? 'Сохранение...' : (editingTeacher ? 'Сохранить' : 'Добавить')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}





