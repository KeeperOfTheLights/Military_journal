'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useListGradesApiGradesGet } from '@/api/orval/client/grades/grades';
import { GraduationCap, TrendingUp, Award, BookOpen } from 'lucide-react';
import '@/styles/DataPages.css';

export default function Grades() {
  const { user } = useAuthStore();
  const isStudent = user?.role === 'student';

  const { data: gradesData, isLoading } = useListGradesApiGradesGet(
    { limit: 50 },
    { query: { enabled: true } as any }
  );

  const grades = (gradesData?.data && Array.isArray(gradesData.data)) ? gradesData.data : [];

  const getGradeColor = (letterGrade: string) => {
    switch (letterGrade) {
      case 'A': return 'grade-a';
      case 'B': return 'grade-b';
      case 'C': return 'grade-c';
      case 'D': return 'grade-d';
      default: return 'grade-f';
    }
  };

  const getGradeTypeName = (type: string) => {
    const types: any = {
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    });
  };

  // Calculate average
  // Using any to access potential fields like max_score that might be absent in generated type but present in response or need fallback
  const averageScore = grades.length > 0
    ? (grades.reduce((sum, g: any) => sum + ((g.score || 0) / (g.max_score || 100) * 100), 0) / grades.length).toFixed(1)
    : 0;

  if (isLoading) {
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
              {grades.filter((g: any) => ((g.score || 0) / (g.max_score || 100) * 100) >= 90).length}
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
                grades.map((grade: any) => {
                  const score = grade.score || 0;
                  const maxScore = grade.max_score || 100;
                  const percentage = (score / maxScore * 100).toFixed(0);

                  let letterGrade = grade.letter_grade || 'F';
                  // Fallback calculation if letter_grade not provided
                  if (!grade.letter_grade) {
                    if (Number(percentage) >= 90) letterGrade = 'A';
                    else if (Number(percentage) >= 80) letterGrade = 'B';
                    else if (Number(percentage) >= 70) letterGrade = 'C';
                    else if (Number(percentage) >= 60) letterGrade = 'D';
                  }

                  return (
                    <tr key={grade.id}>
                      <td>{formatDate(grade.date || grade.created_at)}</td>
                      <td>
                        <div className="subject-cell">
                          <BookOpen size={14} />
                          {grade.subject?.name || grade.assessment_event?.name || '-'}
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
                        <span className="type-badge">{getGradeTypeName(grade.grade_type || grade.assessment_event?.event_type || 'task')}</span>
                      </td>
                      <td>
                        <span className={`grade-badge ${getGradeColor(letterGrade)}`}>
                          {letterGrade}
                        </span>
                      </td>
                      <td>
                        <span className="score-display">
                          {score}/{maxScore}
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
