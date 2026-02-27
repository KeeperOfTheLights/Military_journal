'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useGetMyAttendanceApiAttendanceMyGet, useListAttendanceApiAttendanceGet } from '@/api/orval/client/attendance/attendance';
import { ClipboardCheck, Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import '@/styles/DataPages.css';

export default function Attendance() {
  const { user } = useAuthStore();
  const isStudent = user?.role === 'student';

  const { data: myAttendanceData, isLoading: isLoadingMy } = useGetMyAttendanceApiAttendanceMyGet(
    undefined,
    { query: { enabled: isStudent } as any }
  );

  const { data: allAttendanceData, isLoading: isLoadingAll } = useListAttendanceApiAttendanceGet(
    { limit: 50 }, // Assuming limit is supported, if not, remove or adjust params
    { query: { enabled: !isStudent } as any }
  );

  const attendance = isStudent
    ? ((myAttendanceData?.data && Array.isArray(myAttendanceData.data)) ? myAttendanceData.data : [])
    : ((allAttendanceData?.data && Array.isArray(allAttendanceData.data)) ? allAttendanceData.data : []);

  const loading = isStudent ? isLoadingMy : isLoadingAll;

  const getStatusBadge = (status: string) => {
    const statusConfig: any = {
      present: { label: 'Присутствует', class: 'badge-success' },
      absent: { label: 'Отсутствует', class: 'badge-error' },
      late: { label: 'Опоздал', class: 'badge-warning' },
      excused: { label: 'Ув. причина', class: 'badge-info' },
    };
    const config = statusConfig[status] || { label: status, class: 'badge-info' };
    return <span className={`badge ${config.class}`}>{config.label}</span>;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Calculate stats
  const totalRecords = attendance.length;
  const presentCount = attendance.filter((a: any) => a.status === 'present' || a.status === 'late').length;
  const attendanceRate = totalRecords > 0 ? ((presentCount / totalRecords) * 100).toFixed(1) : 0;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Загрузка данных посещаемости...</p>
      </div>
    );
  }

  return (
    <div className="data-page">
      <div className="page-header">
        <div>
          <h1>Посещаемость</h1>
          <p className="page-subtitle">
            {isStudent ? 'Ваша статистика посещаемости' : 'Журнал посещаемости'}
          </p>
        </div>
      </div>

      <div className="stats-row">
        <div className="mini-stat">
          <div className="mini-stat-icon present">
            <TrendingUp size={20} />
          </div>
          <div>
            <span className="mini-stat-value">{attendanceRate}%</span>
            <span className="mini-stat-label">Посещаемость</span>
          </div>
        </div>

        <div className="mini-stat">
          <div className="mini-stat-icon total">
            <ClipboardCheck size={20} />
          </div>
          <div>
            <span className="mini-stat-value">{totalRecords}</span>
            <span className="mini-stat-label">Всего записей</span>
          </div>
        </div>

        <div className="mini-stat">
          <div className="mini-stat-icon absent">
            <TrendingDown size={20} />
          </div>
          <div>
            <span className="mini-stat-value">{attendance.filter((a: any) => a.status === 'absent').length}</span>
            <span className="mini-stat-label">Пропусков</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>История посещаемости</h3>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Дата</th>
                {!isStudent && <th>Студент</th>}
                <th>Статус</th>
                <th>Причина</th>
              </tr>
            </thead>
            <tbody>
              {attendance.length > 0 ? (
                attendance.map((record: any) => (
                  <tr key={record.id}>
                    <td>{formatDate(record.date)}</td>
                    {!isStudent && (
                      <td>
                        {record.student
                          ? `${record.student.last_name} ${record.student.first_name}`
                          : '-'
                        }
                      </td>
                    )}
                    <td>{getStatusBadge(record.status)}</td>
                    <td>{record.reason || '-'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isStudent ? 3 : 4} className="empty-cell">
                    Записи не найдены
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
