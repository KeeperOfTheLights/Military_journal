import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { gradesAPI, groupsAPI, subjectsAPI } from '../api/auth';
import { 
  Award, Calendar, Users, BookOpen, Save, 
  ChevronDown, AlertCircle, Check, Plus 
} from 'lucide-react';
import './Management.css';

export default function GradesEntry() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [gradeType, setGradeType] = useState('homework');
  const [gradesData, setGradesData] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';

  const gradeTypes = [
    { value: 'homework', label: 'Домашнее задание' },
    { value: 'classwork', label: 'Классная работа' },
    { value: 'test', label: 'Контрольная' },
    { value: 'exam', label: 'Экзамен' },
    { value: 'project', label: 'Проект' },
  ];

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadStudents();
    }
  }, [selectedGroup]);

  const loadInitialData = async () => {
    try {
      const [groupsData, subjectsData] = await Promise.all([
        groupsAPI.getAll(),
        subjectsAPI.getAll()
      ]);
      setGroups(groupsData);
      setSubjects(subjectsData);
      
      if (groupsData.length > 0) setSelectedGroup(groupsData[0].id);
      if (subjectsData.length > 0) setSelectedSubject(subjectsData[0].id);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await groupsAPI.getStudents(selectedGroup);
      setStudents(data);
      
      // Initialize grades data
      const initialData = {};
      data.forEach(student => {
        initialData[student.id] = { value: '', comment: '' };
      });
      setGradesData(initialData);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateGrade = (studentId, field, value) => {
    setGradesData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const saveGrades = async () => {
    if (!selectedGroup || !selectedSubject || students.length === 0) return;
    
    setSaving(true);
    setMessage(null);
    
    try {
      // Filter only students with grades
      const gradesToSave = students
        .filter(student => gradesData[student.id]?.value)
        .map(student => ({
          student_id: student.id,
          subject_id: parseInt(selectedSubject),
          grade_type: gradeType,
          value: parseInt(gradesData[student.id].value),
          date: selectedDate,
          comment: gradesData[student.id]?.comment || null
        }));
      
      if (gradesToSave.length === 0) {
        setMessage({ type: 'warning', text: 'Введите хотя бы одну оценку' });
        return;
      }
      
      // Save grades one by one (could be optimized with bulk endpoint)
      for (const grade of gradesToSave) {
        await gradesAPI.create(grade);
      }
      
      setMessage({ type: 'success', text: `Сохранено ${gradesToSave.length} оценок!` });
      
      // Clear grades after saving
      const clearedData = {};
      students.forEach(student => {
        clearedData[student.id] = { value: '', comment: '' };
      });
      setGradesData(clearedData);
    } catch (error) {
      console.error('Error saving grades:', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Ошибка сохранения' });
    } finally {
      setSaving(false);
    }
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
        <button 
          className="btn btn-primary" 
          onClick={saveGrades}
          disabled={saving || students.length === 0}
        >
          <Save size={18} />
          {saving ? 'Сохранение...' : 'Сохранить оценки'}
        </button>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          {message.text}
        </div>
      )}

      <div className="filters-bar filters-wrap">
        <div className="filter-group">
          <Users size={18} />
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
          >
            <option value="">Группа</option>
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
            <option value="">Предмет</option>
            {subjects.map(subject => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
          </select>
          <ChevronDown size={16} className="select-arrow" />
        </div>

        <div className="filter-group">
          <Award size={18} />
          <select
            value={gradeType}
            onChange={(e) => setGradeType(e.target.value)}
          >
            {gradeTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <ChevronDown size={16} className="select-arrow" />
        </div>

        <div className="filter-group">
          <Calendar size={18} />
          <input
            type="date"
            className="form-input"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Загрузка студентов...</p>
        </div>
      ) : students.length === 0 ? (
        <div className="empty-state">
          <Users size={48} />
          <h3>Выберите группу</h3>
          <p>Выберите группу и предмет для выставления оценок</p>
        </div>
      ) : (
        <div className="data-table-container">
          <table className="data-table grades-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>№</th>
                <th>Студент</th>
                <th style={{ width: '100px' }}>Оценка</th>
                <th>Комментарий</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => (
                <tr key={student.id}>
                  <td className="text-center">{index + 1}</td>
                  <td>
                    <div className="user-cell">
                      <div className="avatar small">
                        {student.first_name?.[0]}{student.last_name?.[0]}
                      </div>
                      <span>{student.last_name} {student.first_name}</span>
                    </div>
                  </td>
                  <td>
                    <input
                      type="number"
                      className="form-input grade-input"
                      min="0"
                      max="100"
                      placeholder="0-100"
                      value={gradesData[student.id]?.value || ''}
                      onChange={(e) => updateGrade(student.id, 'value', e.target.value)}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Комментарий..."
                      value={gradesData[student.id]?.comment || ''}
                      onChange={(e) => updateGrade(student.id, 'comment', e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}






