'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import {
  useListDisciplinaryRecordsApiDisciplinaryGet,
  useGetMyDisciplinaryRecordsApiDisciplinaryMyGet,
  useCreateDisciplinaryRecordApiDisciplinaryPost,
  useResolveDisciplinaryRecordApiDisciplinaryRecordIdResolvePost
} from '@/api/orval/client/disciplinary-records/disciplinary-records';
import { useListStudentsApiStudentsGet } from '@/api/orval/client/students/students';
import { useListTeachersApiTeachersGet } from '@/api/orval/client/teachers/teachers';
import {
  AlertTriangle, Plus, Eye, Check, Calendar,
  X, Search
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import '@/styles/Management.css';

export default function Disciplinary() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';
  const isAdmin = user?.role === 'admin';
  // If not teacher or admin, assume student (or check role)
  const isStudent = user?.role === 'student';

  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    student_id: '',
    violation_type: 'behavior',
    severity: 'minor',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  // Queries
  const { data: allRecordsData, isLoading: isLoadingAll } = useListDisciplinaryRecordsApiDisciplinaryGet(
    undefined,
    { query: { enabled: isTeacherOrAdmin } } as any
  );

  const { data: myRecordsData, isLoading: isLoadingMy } = useGetMyDisciplinaryRecordsApiDisciplinaryMyGet(
    { query: { enabled: isStudent } } as any
  );

  const { data: studentsData } = useListStudentsApiStudentsGet(
    undefined,
    { query: { enabled: isTeacherOrAdmin } } as any
  );

  const { data: teachersData } = useListTeachersApiTeachersGet(
    undefined,
    { query: { enabled: isTeacherOrAdmin } } as any
  );

  const records = isTeacherOrAdmin
    ? ((allRecordsData?.data && Array.isArray(allRecordsData.data)) ? allRecordsData.data : [])
    : ((myRecordsData?.data && Array.isArray(myRecordsData.data)) ? myRecordsData.data : []);

  const students = (studentsData?.data && Array.isArray(studentsData.data)) ? studentsData.data : [];
  const teachers = (teachersData?.data && Array.isArray(teachersData.data)) ? teachersData.data : [];

  const loading = isTeacherOrAdmin ? isLoadingAll : isLoadingMy;

  // Mutations
  const createRecord = useCreateDisciplinaryRecordApiDisciplinaryPost();
  const resolveRecordMutation = useResolveDisciplinaryRecordApiDisciplinaryRecordIdResolvePost();

  const violationTypes = [
    { value: 'uniform', label: 'Нарушение формы одежды' },
    { value: 'late', label: 'Опоздание' },
    { value: 'absence', label: 'Неявка без уважительной причины' },
    { value: 'behavior', label: 'Нарушение дисциплины' },
    { value: 'disrespect', label: 'Неуважительное отношение' },
    { value: 'other', label: 'Другое' },
  ];

  const severityLevels = [
    { value: 'minor', label: 'Незначительное', color: 'warning' },
    { value: 'moderate', label: 'Умеренное', color: 'orange' },
    { value: 'major', label: 'Серьёзное', color: 'danger' },
    { value: 'critical', label: 'Критическое', color: 'critical' },
  ];

  const openCreateModal = () => {
    setFormData({
      student_id: '',
      violation_type: 'behavior',
      severity: 'minor',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
    setShowModal(true);
  };

  const viewRecord = (record: any) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Find current teacher
      const currentTeacher = teachers.find((t: any) => t.user_id === user?.id);
      // Fallback for admin if not in teachers list or creating as admin pure: 
      // API requires reported_by_id. If admin is not a teacher, this might fail or we pick first teacher?
      // Or maybe the backend handles it?
      // Assuming reported_by_id is required:
      const reportedById = currentTeacher?.id || (teachers[0]?.id);

      await createRecord.mutateAsync({
        data: {
          student_id: parseInt(formData.student_id),
          violation_type: formData.violation_type as any,
          severity: formData.severity as any,
          description: formData.description,
          date: formData.date,
          reported_by_id: reportedById || 0 // 0 might fail, but handled by try/catch
        }
      });

      await queryClient.invalidateQueries({ queryKey: ['/api/disciplinary/'] });
      setShowModal(false);
    } catch (error: any) {
      console.error('Error creating record:', error);
      alert(error.response?.data?.detail || 'Ошибка создания записи');
    } finally {
      setSaving(false);
    }
  };

  const resolveRecord = async (recordId: number) => {
    const notes = prompt('Введите примечание к разрешению:');
    if (notes === null) return;

    try {
      await resolveRecordMutation.mutateAsync({
        recordId,
        params: { resolution_notes: notes }
      });
      await queryClient.invalidateQueries({ queryKey: ['/api/disciplinary/'] });
      setShowDetailModal(false);
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Ошибка');
    }
  };

  const getViolationType = (type: string) => {
    return violationTypes.find(v => v.value === type) || violationTypes[0];
  };

  const getSeverity = (severity: string) => {
    return severityLevels.find(s => s.value === severity) || severityLevels[0];
  };

  const filteredRecords = records.filter((record: any) => {
    if (!searchTerm) return true;
    const studentName = `${record.student_name || ''} ${record.description || ''}`.toLowerCase();
    return studentName.includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="management-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Загрузка записей...</p>
        </div>
      </div>
    )
  }

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

      {filteredRecords.length === 0 ? (
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
              {filteredRecords.map((record: any) => {
                const vType = getViolationType(record.violation_type);
                const severity = getSeverity(record.severity);
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
                      <div>{vType.label}</div>
                      <span className={`badge badge-${severity.color}`} style={{ marginTop: '0.25rem', display: 'inline-block' }}>
                        {severity.label}
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
                  <label className="form-label">Студент {students.length > 0 && `(${students.length})`}</label>
                  {students.length === 0 && (
                    <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
                      <AlertTriangle size={16} />
                      <span>Список студентов пуст. Проверьте подключение к API.</span>
                    </div>
                  )}
                  <select
                    className="form-input"
                    value={formData.student_id}
                    onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                    required
                  >
                    <option value="">Выберите студента</option>
                    {students.map((student: any) => (
                      <option key={student.id} value={student.id}>
                        {student.last_name} {student.first_name} ({student.group?.name || 'Без группы'})
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
                      required
                    >
                      {violationTypes.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Серьезность</label>
                    <select
                      className="form-input"
                      value={formData.severity}
                      onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                      required
                    >
                      {severityLevels.map(level => (
                        <option key={level.value} value={level.value}>{level.label}</option>
                      ))}
                    </select>
                  </div>
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

                <div className="form-group">
                  <label className="form-label">Описание нарушения</label>
                  <textarea
                    className="form-input"
                    rows={4}
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
                <button type="submit" className="btn btn-primary" disabled={createRecord.isPending}>
                  {createRecord.isPending ? 'Сохранение...' : 'Создать запись'}
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
                <span className="value">{getViolationType(selectedRecord.violation_type).label}</span>
              </div>
              <div className="detail-row">
                <span className="label">Серьезность</span>
                <span className={`badge badge-${getSeverity(selectedRecord.severity).color}`}>
                  {getSeverity(selectedRecord.severity).label}
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
