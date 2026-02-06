'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import {
  useListAssessmentEventsApiAssessmentEventsGet,
  useGetEventGradesApiAssessmentEventsEventIdGradesGet,
  useCreateAssessmentEventApiAssessmentEventsPost,
  useDeleteAssessmentEventApiAssessmentEventsEventIdDelete,
  useBulkUpdateGradesApiAssessmentEventsEventIdGradesBulkPost
} from '@/api/client/assessment-events/assessment-events';
import { useListGroupsApiGroupsGet } from '@/api/client/groups/groups';
import { useListSubjectsApiSubjectsGet } from '@/api/client/subjects/subjects';

import {
  Award, Save, Plus, Edit2, Trash2,
  ChevronDown, AlertCircle, Check, ArrowLeft,
  Users, BookOpen
} from 'lucide-react';
import '@/styles/Management.css';

const EVENT_TYPES = [
  { value: 'midterm_1', label: 'Рубежный контроль 1' },
  { value: 'midterm_2', label: 'Рубежный контроль 2' },
  { value: 'exam_1', label: 'Экзамен 1' },
  { value: 'exam_2', label: 'Экзамен 2' },
  { value: 'custom', label: 'Другое' },
];

export default function GradesEntry() {
  const { user } = useAuthStore();
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [message, setMessage] = useState<any>(null);

  // View state
  const [view, setView] = useState('list'); // 'list', 'create', 'grade'
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [gradeChanges, setGradeChanges] = useState<Record<number, { score: string, comment: string }>>({});

  // Queries
  const { data: groupsData } = useListGroupsApiGroupsGet();
  const { data: subjectsData } = useListSubjectsApiSubjectsGet();

  const groups = Array.isArray(groupsData?.data) ? groupsData.data : [];
  const subjects = Array.isArray(subjectsData?.data) ? subjectsData.data : [];

  const { data: eventsData, isLoading: isLoadingEvents, refetch: refetchEvents } = useListAssessmentEventsApiAssessmentEventsGet({
    group_id: selectedGroup ? parseInt(selectedGroup) : undefined,
    subject_id: selectedSubject ? parseInt(selectedSubject) : undefined,
  });
  const events = Array.isArray(eventsData?.data) ? eventsData.data : [];

  const { data: eventGradesData, isLoading: isLoadingGrades } = useGetEventGradesApiAssessmentEventsEventIdGradesGet(
    selectedEventId || 0,
    {
      query: {
        enabled: !!selectedEventId, onSuccess: (data: any) => {
          const initialChanges: any = {};
          (data?.data?.grades || []).forEach((g: any) => {
            initialChanges[g.student_id] = { score: String(g.score || ''), comment: g.comment || '' };
          });
          setGradeChanges(initialChanges);
        }
      }
    } as any
  );

  // Note: Since I'm using onSuccess for initial state, I'll use gradeChanges as the source of truth in the table.
  // Actually, better to just map it.
  const eventGrades = (eventGradesData as any)?.data?.grades || [];
  const selectedEvent = events.find(e => e.id === selectedEventId);

  // Mutations
  const createEventMutation = useCreateAssessmentEventApiAssessmentEventsPost();
  const deleteEventMutation = useDeleteAssessmentEventApiAssessmentEventsEventIdDelete();
  const bulkUpdateGradesMutation = useBulkUpdateGradesApiAssessmentEventsEventIdGradesBulkPost();

  // Create event form state
  const [newEvent, setNewEvent] = useState({
    name: '',
    event_type: 'midterm_1',
    group_id: '',
    subject_id: '',
    date: new Date().toISOString().split('T')[0],
    semester: 1,
    academic_year: '2024-2025',
    max_score: 100,
    description: ''
  });

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';

  const handleCreateEvent = async () => {
    if (!newEvent.group_id || !newEvent.subject_id || !newEvent.name) {
      setMessage({ type: 'error', text: 'Заполните все обязательные поля' });
      return;
    }

    try {
      await createEventMutation.mutateAsync({
        data: {
          ...newEvent as any,
          group_id: parseInt(newEvent.group_id),
          subject_id: parseInt(newEvent.subject_id),
        }
      });
      setMessage({ type: 'success', text: 'Событие создано!' });
      setView('list');
      refetchEvents();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Ошибка создания' });
    }
  };

  const handleDeleteEvent = async (id: number) => {
    if (!confirm('Удалить событие? Все оценки будут удалены!')) return;
    try {
      await deleteEventMutation.mutateAsync({ eventId: id });
      setMessage({ type: 'success', text: 'Событие удалено' });
      refetchEvents();
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Ошибка удаления' });
    }
  };

  const handleSaveGrades = async () => {
    if (!selectedEventId) return;

    const gradesToSave = Object.entries(gradeChanges)
      .filter(([_, data]) => data.score !== '')
      .map(([studentId, data]) => ({
        student_id: parseInt(studentId),
        score: parseFloat(data.score),
        comment: data.comment || null
      }));

    if (gradesToSave.length === 0) {
      setMessage({ type: 'error', text: 'Введите хотя бы одну оценку' });
      return;
    }

    try {
      await bulkUpdateGradesMutation.mutateAsync({
        eventId: selectedEventId,
        data: gradesToSave as any
      });
      setMessage({ type: 'success', text: 'Оценки сохранены!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Ошибка сохранения' });
    }
  };

  const updateGradeLocal = (studentId: number, field: 'score' | 'comment', value: string) => {
    setGradeChanges(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const getGradeClass = (score: any) => {
    if (score === '' || score === null || score === undefined) return '';
    const numValue = parseFloat(score);
    if (numValue >= 90) return 'grade-excellent';
    if (numValue >= 80) return 'grade-good';
    if (numValue >= 70) return 'grade-satisfactory';
    if (numValue >= 60) return 'grade-warning';
    return 'grade-poor';
  };

  const getEventTypeLabel = (type: string) => {
    const eventType = EVENT_TYPES.find(t => t.value === type);
    return eventType ? eventType.label : type;
  };

  if (!isTeacherOrAdmin) {
    return (
      <div className="management-page">
        <div className="empty-state">
          <AlertCircle size={48} />
          <h3>Доступ ограничен</h3>
          <p>Только преподаватели могут выставлять оценки</p>
        </div>
      </div>
    );
  }

  return (
    <div className="management-page">
      <div className="page-header">
        <div className="page-title">
          <Award size={28} />
          <h1>Выставление оценок</h1>
        </div>
        {view === 'list' && (
          <button className="btn btn-primary" onClick={() => setView('create')}>
            <Plus size={18} />
            Создать событие
          </button>
        )}
        {view === 'grade' && (
          <>
            <button className="btn btn-outline" onClick={() => setView('list')}>
              <ArrowLeft size={18} />
              Назад
            </button>
            <button className="btn btn-primary" onClick={handleSaveGrades} disabled={bulkUpdateGradesMutation.isPending}>
              <Save size={18} />
              {bulkUpdateGradesMutation.isPending ? 'Сохранение...' : 'Сохранить оценки'}
            </button>
          </>
        )}
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      {view === 'list' && (
        <div className="filters-bar">
          <div className="filter-group">
            <Users size={18} />
            <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}>
              <option value="">Все группы</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
            <ChevronDown size={16} className="select-arrow" />
          </div>

          <div className="filter-group">
            <BookOpen size={18} />
            <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
              <option value="">Все предметы</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
            <ChevronDown size={16} className="select-arrow" />
          </div>
        </div>
      )}

      {view === 'list' && (
        <>
          {isLoadingEvents ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Загрузка событий...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="empty-state">
              <Award size={48} />
              <h3>Нет событий оценивания</h3>
              <p>Создайте событие для выставления оценок</p>
            </div>
          ) : (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>№</th>
                    <th>Название</th>
                    <th>Тип</th>
                    <th>Дата</th>
                    <th>Группа</th>
                    <th>Макс. балл</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event, index) => (
                    <tr key={event.id}>
                      <td className="text-center">{index + 1}</td>
                      <td><strong>{event.name}</strong></td>
                      <td>{getEventTypeLabel(event.event_type)}</td>
                      <td>{new Date((event as any).date).toLocaleDateString('ru-RU')}</td>
                      <td>{(event as any).group_name}</td>
                      <td className="text-center">{event.max_score}</td>
                      <td>
                        <div className="actions-cell">
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => {
                              setSelectedEventId(event.id);
                              setView('grade');
                            }}
                          >
                            <Edit2 size={14} />
                            Оценки
                          </button>
                          <button className="btn-icon danger" onClick={() => handleDeleteEvent(event.id)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {view === 'create' && (
        <div className="form-container">
          <div className="form-card">
            <h2>Создать событие оценивания</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Группа *</label>
                <select className="form-input" value={newEvent.group_id} onChange={(e) => setNewEvent({ ...newEvent, group_id: e.target.value })}>
                  <option value="">Выберите группу</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Предмет *</label>
                <select className="form-input" value={newEvent.subject_id} onChange={(e) => setNewEvent({ ...newEvent, subject_id: e.target.value })}>
                  <option value="">Выберите предмет</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Название *</label>
              <input type="text" className="form-input" value={newEvent.name} onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Тип события</label>
                <select className="form-input" value={newEvent.event_type} onChange={(e) => setNewEvent({ ...newEvent, event_type: e.target.value })}>
                  {EVENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Дата *</label>
                <input type="date" className="form-input" value={newEvent.date} onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })} />
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleCreateEvent} disabled={createEventMutation.isPending}>
              {createEventMutation.isPending ? 'Создание...' : 'Создать событие'}
            </button>
          </div>
        </div>
      )}

      {view === 'grade' && selectedEventId && (
        <>
          <div className="section-header">
            <h2>{selectedEvent?.name}</h2>
            <div className="section-info">
              <span className="badge">{getEventTypeLabel(selectedEvent?.event_type || '')}</span>
              <span className="text-muted">Макс. балл: {selectedEvent?.max_score}</span>
            </div>
          </div>
          {isLoadingGrades ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Загрузка списка студентов...</p>
            </div>
          ) : (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>№</th>
                    <th>Студент</th>
                    <th style={{ width: '120px' }}>Оценка</th>
                    <th>Комментарий</th>
                  </tr>
                </thead>
                <tbody>
                  {eventGrades.map((grade: any, index: number) => (
                    <tr key={grade.student_id}>
                      <td className="text-center">{index + 1}</td>
                      <td>{grade.student_name}</td>
                      <td>
                        <input
                          type="number"
                          className={`form-input ${getGradeClass(gradeChanges[grade.student_id]?.score)}`}
                          value={gradeChanges[grade.student_id]?.score || ''}
                          onChange={(e) => updateGradeLocal(grade.student_id, 'score', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          value={gradeChanges[grade.student_id]?.comment || ''}
                          onChange={(e) => updateGradeLocal(grade.student_id, 'comment', e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
