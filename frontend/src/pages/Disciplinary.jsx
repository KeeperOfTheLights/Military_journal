import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { disciplinaryAPI, studentsAPI } from '../api/auth';
import { 
  AlertTriangle, Plus, Eye, Check, Calendar, 
  User, FileText, X, ChevronDown, Search 
} from 'lucide-react';
import './Management.css';

export default function Disciplinary() {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [students, setStudents] = useState([]);
  const [formData, setFormData] = useState({
    student_id: '',
    violation_type: 'minor',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';

  const violationTypes = [
    { value: 'minor', label: 'Незначительное', color: 'warning' },
    { value: 'moderate', label: 'Умеренное', color: 'orange' },
    { value: 'major', label: 'Серьёзное', color: 'danger' },
    { value: 'critical', label: 'Критическое', color: 'critical' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (isTeacherOrAdmin) {
        const [recordsData, studentsData] = await Promise.all([
          disciplinaryAPI.getAll(),
          studentsAPI.getAll()
        ]);
        setRecords(recordsData);
        setStudents(studentsData);
      } else {
        const myRecords = await disciplinaryAPI.getMy();
        setRecords(myRecords);
      }
    } catch (error) {
      console.error('Error loading disciplinary records:', error);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setFormData({
      student_id: '',
      violation_type: 'minor',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
    setShowModal(true);
  };

  const viewRecord = (record) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await disciplinaryAPI.create({
        ...formData,
        student_id: parseInt(formData.student_id)
      });
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Error creating record:', error);
      alert(error.response?.data?.detail || 'Ошибка создания записи');
    } finally {
      setSaving(false);
    }
  };

  const resolveRecord = async (recordId) => {
    const notes = prompt('Введите примечание к разрешению:');
    if (notes === null) return;
    
    try {
      await disciplinaryAPI.resolve(recordId, notes);
      loadData();
      setShowDetailModal(false);
    } catch (error) {
      alert(error.response?.data?.detail || 'Ошибка');
    }
  };

  const getViolationType = (type) => {
    return violationTypes.find(v => v.value === type) || violationTypes[0];
  };

  const filteredRecords = records.filter(record => {
    if (!searchTerm) return true;
    const studentName = `${record.student_name || ''} ${record.description || ''}`.toLowerCase();
    return studentName.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="management-page">
      <div className="page-header">
        <div className="page-title">
          <AlertTriangle size={28} />
          <h1>Дисциплинарные записи</h1>
          <span className="badge">{records.length}</span>
        </div>
        {isTeacherOrAdmin && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            <Plus size={18} />
            Новая запись
          </button>
        )}
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Поиск..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Загрузка записей...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="empty-state">
          <AlertTriangle size={48} />
          <h3>Записи не найдены</h3>
          <p>{isTeacherOrAdmin ? 'Нет дисциплинарных записей' : 'У вас нет дисциплинарных записей'}</p>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Студент</th>
                <th>Тип нарушения</th>
                <th>Описание</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map(record => {
                const vType = getViolationType(record.violation_type);
                return (
                  <tr key={record.id}>
                    <td>
                      <span className="date-cell">
                        <Calendar size={14} />
                        {new Date(record.date).toLocaleDateString('ru-RU')}
                      </span>
                    </td>
                    <td>
                      <div className="user-cell">
                        <div className="avatar small">
                          {record.student_name?.[0] || 'С'}
                        </div>
                        <span>{record.student_name || 'Студент'}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${vType.color}`}>
                        {vType.label}
                      </span>
                    </td>
                    <td className="description-cell">
                      {record.description?.substring(0, 50)}
                      {record.description?.length > 50 ? '...' : ''}
                    </td>
                    <td>
                      {record.is_resolved ? (
                        <span className="badge badge-success">Разрешено</span>
                      ) : (
                        <span className="badge badge-warning">Активно</span>
                      )}
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button 
                          className="btn-icon" 
                          title="Подробнее"
                          onClick={() => viewRecord(record)}
                        >
                          <Eye size={16} />
                        </button>
                        {isTeacherOrAdmin && !record.is_resolved && (
                          <button 
                            className="btn-icon success" 
                            title="Разрешить"
                            onClick={() => resolveRecord(record.id)}
                          >
                            <Check size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Новая дисциплинарная запись</h2>
              <button className="btn-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Студент</label>
                  <select
                    className="form-input"
                    value={formData.student_id}
                    onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                    required
                  >
                    <option value="">Выберите студента</option>
                    {students.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.last_name} {student.first_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Тип нарушения</label>
                    <select
                      className="form-input"
                      value={formData.violation_type}
                      onChange={(e) => setFormData({ ...formData, violation_type: e.target.value })}
                    >
                      {violationTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Дата</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Описание нарушения</label>
                  <textarea
                    className="form-input"
                    rows="4"
                    placeholder="Подробное описание нарушения..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Сохранение...' : 'Создать запись'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedRecord && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Дисциплинарная запись</h2>
              <button className="btn-close" onClick={() => setShowDetailModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <span className="label">Студент</span>
                <span className="value">{selectedRecord.student_name}</span>
              </div>
              <div className="detail-row">
                <span className="label">Дата</span>
                <span className="value">{new Date(selectedRecord.date).toLocaleDateString('ru-RU')}</span>
              </div>
              <div className="detail-row">
                <span className="label">Тип нарушения</span>
                <span className={`badge badge-${getViolationType(selectedRecord.violation_type).color}`}>
                  {getViolationType(selectedRecord.violation_type).label}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Описание</span>
                <p className="value">{selectedRecord.description}</p>
              </div>
              <div className="detail-row">
                <span className="label">Статус</span>
                <span className="value">
                  {selectedRecord.is_resolved ? 'Разрешено' : 'Активно'}
                </span>
              </div>
              {selectedRecord.resolution_notes && (
                <div className="detail-row">
                  <span className="label">Примечание к разрешению</span>
                  <p className="value">{selectedRecord.resolution_notes}</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              {isTeacherOrAdmin && !selectedRecord.is_resolved && (
                <button 
                  className="btn btn-success" 
                  onClick={() => resolveRecord(selectedRecord.id)}
                >
                  <Check size={18} />
                  Разрешить
                </button>
              )}
              <button className="btn btn-outline" onClick={() => setShowDetailModal(false)}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}






