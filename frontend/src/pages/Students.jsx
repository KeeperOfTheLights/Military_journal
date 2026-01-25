import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { studentsAPI, groupsAPI } from '../api/auth';
import { 
  Users, Search, Filter, Plus, Edit2, Eye, 
  Phone, Mail, Calendar, Award, ChevronDown, X, Check 
} from 'lucide-react';
import './Management.css';

export default function Students() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    middle_name: '',
    phone: '',
    group_id: '',
    rank: '',
    enrollment_date: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';

  useEffect(() => {
    loadData();
  }, [selectedGroup]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [studentsData, groupsData] = await Promise.all([
        studentsAPI.getAll({ group_id: selectedGroup || undefined }),
        groupsAPI.getAll()
      ]);
      setStudents(studentsData);
      setGroups(groupsData);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const fullName = `${student.last_name} ${student.first_name} ${student.middle_name || ''}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  const viewStudent = (student) => {
    setSelectedStudent(student);
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditingStudent(null);
    setFormData({
      email: '',
      password: 'Student123!',
      first_name: '',
      last_name: '',
      middle_name: '',
      phone: '',
      group_id: groups[0]?.id || '',
      rank: 'Курсант',
      enrollment_date: new Date().toISOString().split('T')[0],
    });
    setMessage(null);
    setShowEditModal(true);
  };

  const openEditModal = (student) => {
    setEditingStudent(student);
    setFormData({
      first_name: student.first_name,
      last_name: student.last_name,
      middle_name: student.middle_name || '',
      phone: student.phone || '',
      group_id: student.group_id,
      rank: student.rank || '',
      enrollment_date: student.enrollment_date,
    });
    setMessage(null);
    setShowEditModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    
    try {
      if (editingStudent) {
        // Update existing student
        await studentsAPI.update(editingStudent.id, {
          first_name: formData.first_name,
          last_name: formData.last_name,
          middle_name: formData.middle_name || null,
          phone: formData.phone || null,
          group_id: parseInt(formData.group_id),
          rank: formData.rank || null,
        });
        setMessage({ type: 'success', text: 'Студент успешно обновлён!' });
      } else {
        // Create new student
        await studentsAPI.create({
          email: formData.email,
          password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name,
          middle_name: formData.middle_name || null,
          phone: formData.phone || null,
          group_id: parseInt(formData.group_id),
          rank: formData.rank || null,
          enrollment_date: formData.enrollment_date,
        });
        setMessage({ type: 'success', text: 'Студент успешно добавлен!' });
      }
      
      setTimeout(() => {
        setShowEditModal(false);
        loadData();
      }, 1000);
    } catch (error) {
      console.error('Error saving student:', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Ошибка сохранения' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="management-page">
      <div className="page-header">
        <div className="page-title">
          <Users size={28} />
          <h1>Студенты</h1>
          <span className="badge">{filteredStudents.length}</span>
        </div>
        {isTeacherOrAdmin && (
          <button className="btn btn-primary" onClick={openAddModal}>
            <Plus size={18} />
            Добавить студента
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
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
          >
            <option value="">Все группы</option>
            {groups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="select-arrow" />
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Загрузка студентов...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <h3>Студенты не найдены</h3>
          <p>Попробуйте изменить фильтры или добавьте студентов</p>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ФИО</th>
                <th>Группа</th>
                <th>Телефон</th>
                <th>Звание</th>
                <th>Дата зачисления</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(student => (
                <tr key={student.id}>
                  <td>
                    <div className="user-cell">
                      <div className="avatar">
                        {student.first_name?.[0]}{student.last_name?.[0]}
                      </div>
                      <div>
                        <div className="name">{student.last_name} {student.first_name}</div>
                        <div className="subtitle">{student.middle_name}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-primary">
                      {student.group_name || student.group?.name || 'Н/Д'}
                    </span>
                  </td>
                  <td>
                    {student.phone ? (
                      <span className="phone-link">
                        <Phone size={14} />
                        {student.phone}
                      </span>
                    ) : '—'}
                  </td>
                  <td>{student.rank || '—'}</td>
                  <td>
                    <span className="date-cell">
                      <Calendar size={14} />
                      {student.enrollment_date ? new Date(student.enrollment_date).toLocaleDateString('ru-RU') : '—'}
                    </span>
                  </td>
                  <td>
                    <div className="actions-cell">
                      <button 
                        className="btn-icon" 
                        title="Просмотр"
                        onClick={() => viewStudent(student)}
                      >
                        <Eye size={16} />
                      </button>
                      {isTeacherOrAdmin && (
                        <button 
                          className="btn-icon" 
                          title="Редактировать"
                          onClick={() => openEditModal(student)}
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Student Detail Modal */}
      {showModal && selectedStudent && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Профиль студента</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>
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
                  <p className="subtitle">{selectedStudent.group_name || selectedStudent.group?.name}</p>
                </div>
              </div>
              <div className="profile-details">
                <div className="detail-row">
                  <span className="label">Телефон</span>
                  <span className="value">{selectedStudent.phone || 'Не указан'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Звание</span>
                  <span className="value">{selectedStudent.rank || 'Не указано'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Военный ID</span>
                  <span className="value">{selectedStudent.military_id || 'Не указан'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Дата зачисления</span>
                  <span className="value">
                    {selectedStudent.enrollment_date 
                      ? new Date(selectedStudent.enrollment_date).toLocaleDateString('ru-RU')
                      : 'Не указана'}
                  </span>
                </div>
              </div>
            </div>
            {isTeacherOrAdmin && (
              <div className="modal-footer">
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    setShowModal(false);
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

      {/* Add/Edit Student Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingStudent ? 'Редактировать студента' : 'Добавить студента'}</h2>
              <button className="btn-close" onClick={() => setShowEditModal(false)}>
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
                
                {!editingStudent && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Email *</label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="student@kaztbu.edu.kz"
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
                        placeholder="Минимум 8 символов"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        required
                      />
                      <small style={{color: 'var(--text-secondary)', fontSize: '0.75rem'}}>
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
                      className="form-input"
                      placeholder="Иванов"
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
                      placeholder="Иван"
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
                      placeholder="Иванович"
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
                    <label className="form-label">Группа *</label>
                    <select
                      className="form-input"
                      value={formData.group_id}
                      onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                      required
                    >
                      <option value="">Выберите группу</option>
                      {groups.map(group => (
                        <option key={group.id} value={group.id}>
                          {group.name} ({group.course} курс)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Звание</label>
                    <select
                      className="form-input"
                      value={formData.rank}
                      onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                    >
                      <option value="">Не указано</option>
                      <option value="Курсант">Курсант</option>
                      <option value="Сержант">Сержант</option>
                      <option value="Старший сержант">Старший сержант</option>
                    </select>
                  </div>
                </div>
                
                {!editingStudent && (
                  <div className="form-group">
                    <label className="form-label">Дата зачисления *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.enrollment_date}
                      onChange={(e) => setFormData({ ...formData, enrollment_date: e.target.value })}
                      required
                    />
                  </div>
                )}
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowEditModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Check size={18} />
                  {saving ? 'Сохранение...' : (editingStudent ? 'Сохранить' : 'Добавить')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
