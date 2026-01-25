import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { attendanceAPI, groupsAPI, scheduleAPI } from '../api/auth';
import { 
  ClipboardCheck, Calendar, Users, Check, X, 
  Clock, Save, ChevronDown, AlertCircle 
} from 'lucide-react';
import './Management.css';

export default function AttendanceMarking() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadStudents();
    }
  }, [selectedGroup, selectedDate]);

  const loadGroups = async () => {
    try {
      const data = await groupsAPI.getAll();
      setGroups(data);
      if (data.length > 0) {
        setSelectedGroup(data[0].id);
      }
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await groupsAPI.getStudents(selectedGroup);
      setStudents(data);
      
      // Initialize attendance data for each student
      const initialData = {};
      data.forEach(student => {
        initialData[student.id] = { 
          status: 'present', 
          notes: '' 
        };
      });
      setAttendanceData(initialData);
      
      // TODO: Load existing attendance for this date if any
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAttendance = (studentId, field, value) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const markAllPresent = () => {
    const updated = {};
    students.forEach(student => {
      updated[student.id] = { status: 'present', notes: '' };
    });
    setAttendanceData(updated);
  };

  const saveAttendance = async () => {
    if (!selectedGroup || students.length === 0) return;
    
    setSaving(true);
    setMessage(null);
    
    try {
      const records = students.map(student => ({
        student_id: student.id,
        date: selectedDate,
        status: attendanceData[student.id]?.status || 'present',
        notes: attendanceData[student.id]?.notes || null
      }));
      
      await attendanceAPI.createBulk({ records });
      setMessage({ type: 'success', text: 'Посещаемость успешно сохранена!' });
    } catch (error) {
      console.error('Error saving attendance:', error);
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
          <p>Только преподаватели могут отмечать посещаемость</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'success';
      case 'absent': return 'danger';
      case 'late': return 'warning';
      case 'excused': return 'info';
      default: return '';
    }
  };

  return (
    <div className="management-page">
      <div className="page-header">
        <div className="page-title">
          <ClipboardCheck size={28} />
          <h1>Отметка посещаемости</h1>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={saveAttendance}
          disabled={saving || students.length === 0}
        >
          <Save size={18} />
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
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
          >
            <option value="">Выберите группу</option>
            {groups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
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

        <button className="btn btn-outline" onClick={markAllPresent}>
          <Check size={18} />
          Все присутствуют
        </button>
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
          <p>Выберите группу для отметки посещаемости</p>
        </div>
      ) : (
        <div className="attendance-grid">
          {students.map((student, index) => (
            <div key={student.id} className="attendance-card">
              <div className="student-info">
                <span className="student-number">{index + 1}</span>
                <div className="avatar">
                  {student.first_name?.[0]}{student.last_name?.[0]}
                </div>
                <div className="student-name">
                  <span className="name">{student.last_name} {student.first_name}</span>
                  <span className="subtitle">{student.middle_name}</span>
                </div>
              </div>
              
              <div className="attendance-controls">
                <div className="status-buttons">
                  {[
                    { value: 'present', label: 'П', title: 'Присутствует' },
                    { value: 'absent', label: 'Н', title: 'Отсутствует' },
                    { value: 'late', label: 'О', title: 'Опоздал' },
                    { value: 'excused', label: 'У', title: 'Уважительная причина' }
                  ].map(status => (
                    <button
                      key={status.value}
                      className={`status-btn ${status.value} ${attendanceData[student.id]?.status === status.value ? 'active' : ''}`}
                      title={status.title}
                      onClick={() => updateAttendance(student.id, 'status', status.value)}
                    >
                      {status.label}
                    </button>
                  ))}
                </div>
                
                <input
                  type="text"
                  className="notes-input"
                  placeholder="Примечание..."
                  value={attendanceData[student.id]?.notes || ''}
                  onChange={(e) => updateAttendance(student.id, 'notes', e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}






