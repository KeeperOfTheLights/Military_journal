import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { assessmentEventsAPI, gradesAPI, groupsAPI, subjectsAPI } from '../api/auth';
import { 
  Award, Calendar, Users, BookOpen, Save, Plus, Edit2, Trash2,
  ChevronDown, AlertCircle, Check, ArrowLeft
} from 'lucide-react';
import './Management.css';

const EVENT_TYPES = [
  { value: 'midterm_1', label: 'Рубежный контроль 1' },
  { value: 'midterm_2', label: 'Рубежный контроль 2' },
  { value: 'exam_1', label: 'Экзамен 1' },
  { value: 'exam_2', label: 'Экзамен 2' },
  { value: 'custom', label: 'Другое' },
];

export default function GradesEntry() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  
  // View state
  const [view, setView] = useState('list'); // 'list', 'create', 'grade'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventGrades, setEventGrades] = useState([]);
  
  // Create event form
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

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    // Load events whenever filters change (including empty filters for "all")
    loadEvents();
  }, [selectedGroup, selectedSubject]);

  const loadInitialData = async () => {
    try {
      const [groupsData, subjectsData] = await Promise.all([
        groupsAPI.getAll(),
        subjectsAPI.getAll()
      ]);
      setGroups(groupsData);
      setSubjects(subjectsData);
      
      // Set to "all" by default to show all events
      setSelectedGroup('');
      setSelectedSubject('');
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await assessmentEventsAPI.getAll({
        group_id: selectedGroup ? parseInt(selectedGroup) : undefined,
        subject_id: selectedSubject ? parseInt(selectedSubject) : undefined,
        limit: 100
      });
      setEvents(data);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEventGrades = async (eventId) => {
    try {
      setLoading(true);
      const data = await assessmentEventsAPI.getEventGrades(eventId);
      setEventGrades(data.grades || []);
    } catch (error) {
      console.error('Error loading event grades:', error);
      setMessage({ type: 'error', text: 'Ошибка загрузки оценок' });
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async () => {
    if (!newEvent.group_id || !newEvent.subject_id || !newEvent.name) {
      setMessage({ type: 'error', text: 'Заполните все обязательные поля (группа, предмет, название)' });
      return;
    }

    try {
      setSaving(true);
      await assessmentEventsAPI.create({
        ...newEvent,
        group_id: parseInt(newEvent.group_id),
        subject_id: parseInt(newEvent.subject_id),
      });
      
      setMessage({ type: 'success', text: 'Событие создано!' });
      
      // Set filters to match the created event (as strings for select elements)
      setSelectedGroup(String(newEvent.group_id));
      setSelectedSubject(String(newEvent.subject_id));
      
      setView('list');
      setNewEvent({
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
      
      // Load events will be triggered by useEffect when selectedGroup/selectedSubject changes
    } catch (error) {
      console.error('Error creating event:', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Ошибка создания' });
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async (eventId) => {
    if (!confirm('Удалить событие? Все оценки будут удалены!')) return;

    try {
      await assessmentEventsAPI.delete(eventId);
      setMessage({ type: 'success', text: 'Событие удалено' });
      loadEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      setMessage({ type: 'error', text: 'Ошибка удаления' });
    }
  };

  const openGradeView = async (event) => {
    setSelectedEvent(event);
    await loadEventGrades(event.id);
    setView('grade');
  };

  const updateGrade = (studentId, field, value) => {
    setEventGrades(prev => prev.map(g => 
      g.student_id === studentId 
        ? { ...g, [field]: value }
        : g
    ));
  };

  const saveGrades = async () => {
    if (!selectedEvent) return;

    setSaving(true);
    setMessage(null);

    try {
      const gradesToSave = eventGrades
        .filter(g => g.score !== null && g.score !== '' && g.score !== undefined)
        .map(g => ({
          student_id: g.student_id,
          score: parseFloat(g.score),
          comment: g.comment || null
        }));

      if (gradesToSave.length === 0) {
        setMessage({ type: 'error', text: 'Введите хотя бы одну оценку' });
        return;
      }

      const result = await assessmentEventsAPI.bulkUpdateGrades(
        selectedEvent.id,
        gradesToSave
      );

      setMessage({ 
        type: 'success', 
        text: result.message || `Оценки сохранены! (создано: ${result.created}, обновлено: ${result.updated})`
      });

      // Reload grades
      await loadEventGrades(selectedEvent.id);
    } catch (error) {
      console.error('Error saving grades:', error);
      setMessage({ type: 'error', text: 'Ошибка сохранения' });
    } finally {
      setSaving(false);
    }
  };

  const getGradeClass = (score) => {
    if (!score) return '';
    const numValue = parseFloat(score);
    if (numValue >= 90) return 'grade-excellent';
    if (numValue >= 80) return 'grade-good';
    if (numValue >= 70) return 'grade-satisfactory';
    if (numValue >= 60) return 'grade-warning';
    return 'grade-poor';
  };

  const getEventTypeLabel = (type) => {
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
          <button 
            className="btn btn-primary" 
            onClick={() => setView('create')}
          >
            <Plus size={18} />
            Создать событие
          </button>
        )}
        {view === 'grade' && (
          <>
            <button 
              className="btn btn-outline" 
              onClick={() => setView('list')}
            >
              <ArrowLeft size={18} />
              Назад
            </button>
            <button 
              className="btn btn-primary" 
              onClick={saveGrades}
              disabled={saving}
            >
              <Save size={18} />
              {saving ? 'Сохранение...' : 'Сохранить оценки'}
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

      <div className="filters-bar">
        <div className="filter-group">
          <Users size={18} />
          <select 
            value={selectedGroup} 
            onChange={(e) => setSelectedGroup(e.target.value)}
            disabled={view !== 'list'}
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
            disabled={view !== 'list'}
          >
            <option value="">Все предметы</option>
            {subjects.map(subject => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
          <ChevronDown size={16} className="select-arrow" />
        </div>
      </div>

      {view === 'list' && (
        <>
          {loading ? (
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
                    <th style={{ width: '120px' }}>Дата</th>
                    <th style={{ width: '80px' }}>Семестр</th>
                    <th style={{ width: '100px' }}>Макс. балл</th>
                    <th style={{ width: '150px' }}>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event, index) => (
                    <tr key={event.id}>
                      <td className="text-center">{index + 1}</td>
                      <td><strong>{event.name}</strong></td>
                      <td>{getEventTypeLabel(event.event_type)}</td>
                      <td>{new Date(event.date).toLocaleDateString('ru-RU')}</td>
                      <td className="text-center">{event.semester}</td>
                      <td className="text-center">{event.max_score}</td>
                      <td>
                        <div className="actions-cell">
                          <button 
                            className="btn btn-sm btn-primary"
                            onClick={() => openGradeView(event)}
                            title="Выставить оценки"
                          >
                            <Edit2 size={14} />
                            Оценки
                          </button>
                          <button 
                            className="btn btn-sm btn-danger"
                            onClick={() => deleteEvent(event.id)}
                            title="Удалить"
                          >
                            <Trash2 size={14} />
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
                <label>Группа (Взвод) *</label>
                <select
                  className="form-input"
                  value={newEvent.group_id}
                  onChange={(e) => setNewEvent({...newEvent, group_id: e.target.value})}
                  required
                >
                  <option value="">Выберите группу</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Предмет *</label>
                <select
                  className="form-input"
                  value={newEvent.subject_id}
                  onChange={(e) => setNewEvent({...newEvent, subject_id: e.target.value})}
                  required
                >
                  <option value="">Выберите предмет</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label>Название *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Например: Рубежный контроль 1"
                value={newEvent.name}
                onChange={(e) => setNewEvent({...newEvent, name: e.target.value})}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Тип события</label>
                <select
                  className="form-input"
                  value={newEvent.event_type}
                  onChange={(e) => setNewEvent({...newEvent, event_type: e.target.value})}
                >
                  {EVENT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Дата *</label>
                <input
                  type="date"
                  className="form-input"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Семестр *</label>
                <select
                  className="form-input"
                  value={newEvent.semester}
                  onChange={(e) => setNewEvent({...newEvent, semester: parseInt(e.target.value)})}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </div>

              <div className="form-group">
                <label>Учебный год *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="2024-2025"
                  value={newEvent.academic_year}
                  onChange={(e) => setNewEvent({...newEvent, academic_year: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Макс. балл</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  max="100"
                  value={newEvent.max_score}
                  onChange={(e) => setNewEvent({...newEvent, max_score: parseInt(e.target.value)})}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Описание</label>
              <textarea
                className="form-input"
                rows="3"
                placeholder="Дополнительная информация..."
                value={newEvent.description}
                onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
              ></textarea>
            </div>

            <div className="form-actions">
              <button 
                className="btn btn-outline" 
                onClick={() => setView('list')}
              >
                Отмена
              </button>
              <button 
                className="btn btn-primary" 
                onClick={createEvent}
                disabled={saving}
              >
                {saving ? 'Создание...' : 'Создать событие'}
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'grade' && selectedEvent && (
        <>
          <div className="section-header">
            <h2>{selectedEvent.name}</h2>
            <div className="section-info">
              <span className="badge">{getEventTypeLabel(selectedEvent.event_type)}</span>
              <span className="text-muted">Макс. балл: {selectedEvent.max_score}</span>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Загрузка оценок...</p>
            </div>
          ) : (
            <div className="data-table-container">
              <table className="data-table grades-table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>№</th>
                    <th>Студент</th>
                    <th style={{ width: '120px' }}>Оценка</th>
                    <th style={{ width: '80px' }}>Буква</th>
                    <th>Комментарий</th>
                  </tr>
                </thead>
                <tbody>
                  {eventGrades.map((grade, index) => (
                    <tr key={grade.student_id}>
                      <td className="text-center">{index + 1}</td>
                      <td>
                        <div className="user-cell">
                          <div className="avatar small">
                            {grade.student_name?.split(' ')[0]?.[0]}
                            {grade.student_name?.split(' ')[1]?.[0]}
                          </div>
                          <span>{grade.student_name}</span>
                        </div>
                      </td>
                      <td>
                        <input
                          type="number"
                          className={`form-input grade-input ${getGradeClass(grade.score)}`}
                          min="0"
                          max={selectedEvent.max_score}
                          placeholder={`0-${selectedEvent.max_score}`}
                          value={grade.score || ''}
                          onChange={(e) => updateGrade(grade.student_id, 'score', e.target.value)}
                        />
                      </td>
                      <td className="text-center">
                        <span className={`badge ${getGradeClass(grade.score)}`}>
                          {grade.letter_grade}
                        </span>
                      </td>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Комментарий..."
                          value={grade.comment || ''}
                          onChange={(e) => updateGrade(grade.student_id, 'comment', e.target.value)}
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
