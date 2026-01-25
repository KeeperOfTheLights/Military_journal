import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { gradesAPI } from '../api/auth';
import { GraduationCap, TrendingUp, Award, BookOpen } from 'lucide-react';
import './DataPages.css';

export default function Grades() {
  const { isStudent } = useAuth();
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGrades();
  }, []);

  const loadGrades = async () => {
    try {
      if (isStudent) {
        const data = await gradesAPI.getMy();
        setGrades(data);
      } else {
        const data = await gradesAPI.getAll({ limit: 50 });
        setGrades(data);
      }
    } catch (error) {
      console.error('Error loading grades:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (letterGrade) => {
    switch (letterGrade) {
      case 'A': return 'grade-a';
      case 'B': return 'grade-b';
      case 'C': return 'grade-c';
      case 'D': return 'grade-d';
      default: return 'grade-f';
    }
  };

  const getGradeTypeName = (type) => {
    const types = {
      homework: 'Домашнее задание',
      classwork: 'Классная работа',
      test: 'Контрольная',
      exam: 'Экзамен',
      project: 'Проект',
      midterm: 'Промежуточная',
      final: 'Итоговая',
    };
    return types[type] || type;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    });
  };

  // Calculate average
  const averageScore = grades.length > 0
    ? (grades.reduce((sum, g) => sum + (g.score / g.max_score * 100), 0) / grades.length).toFixed(1)
    : 0;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Загрузка оценок...</p>
      </div>
    );
  }

  return (
    <div className="data-page">
      <div className="page-header">
        <div>
          <h1>Оценки</h1>
          <p className="page-subtitle">
            {isStudent ? 'Ваши оценки по всем предметам' : 'Журнал оценок'}
          </p>
        </div>
      </div>

      <div className="stats-row">
        <div className="mini-stat">
          <div className="mini-stat-icon average">
            <TrendingUp size={20} />
          </div>
          <div>
            <span className="mini-stat-value">{averageScore}%</span>
            <span className="mini-stat-label">Средний балл</span>
          </div>
        </div>
        
        <div className="mini-stat">
          <div className="mini-stat-icon total">
            <GraduationCap size={20} />
          </div>
          <div>
            <span className="mini-stat-value">{grades.length}</span>
            <span className="mini-stat-label">Всего оценок</span>
          </div>
        </div>
        
        <div className="mini-stat">
          <div className="mini-stat-icon excellent">
            <Award size={20} />
          </div>
          <div>
            <span className="mini-stat-value">
              {grades.filter(g => (g.score / g.max_score * 100) >= 90).length}
            </span>
            <span className="mini-stat-label">Отличных оценок</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>Все оценки</h3>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Дата</th>
                <th>Предмет</th>
                {!isStudent && <th>Студент</th>}
                <th>Тип</th>
                <th>Оценка</th>
                <th>Балл</th>
              </tr>
            </thead>
            <tbody>
              {grades.length > 0 ? (
                grades.map((grade) => {
                  const percentage = (grade.score / grade.max_score * 100).toFixed(0);
                  let letterGrade = 'F';
                  if (percentage >= 90) letterGrade = 'A';
                  else if (percentage >= 80) letterGrade = 'B';
                  else if (percentage >= 70) letterGrade = 'C';
                  else if (percentage >= 60) letterGrade = 'D';

                  return (
                    <tr key={grade.id}>
                      <td>{formatDate(grade.date)}</td>
                      <td>
                        <div className="subject-cell">
                          <BookOpen size={14} />
                          {grade.subject?.name || '-'}
                        </div>
                      </td>
                      {!isStudent && (
                        <td>
                          {grade.student 
                            ? `${grade.student.last_name} ${grade.student.first_name}`
                            : '-'
                          }
                        </td>
                      )}
                      <td>
                        <span className="type-badge">{getGradeTypeName(grade.grade_type)}</span>
                      </td>
                      <td>
                        <span className={`grade-badge ${getGradeColor(letterGrade)}`}>
                          {letterGrade}
                        </span>
                      </td>
                      <td>
                        <span className="score-display">
                          {grade.score}/{grade.max_score}
                          <small>({percentage}%)</small>
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isStudent ? 5 : 6} className="empty-cell">
                    Оценки не найдены
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}






