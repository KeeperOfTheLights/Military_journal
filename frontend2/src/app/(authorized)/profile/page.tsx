'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useChangePasswordApiAuthChangePasswordPost } from '@/api/client/authentication/authentication';
import { useGetMyStudentProfileApiStudentsMeProfileGet } from '@/api/client/students/students';
import { useGetMyTeacherProfileApiTeachersMeProfileGet } from '@/api/client/teachers/teachers';

import {
  User, Mail, Phone, Calendar, Shield,
  Lock, Save, Eye, EyeOff, Check, AlertCircle,
  Award, BookOpen, LogOut
} from 'lucide-react';
import '@/styles/Profile.css';
import { useRouter } from 'next/navigation';

const passwordSchema = z.object({
  oldPassword: z.string().min(1, 'Введите текущий пароль'),
  newPassword: z.string().min(8, 'Пароль должен быть не менее 8 символов'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
});

type PasswordForm = z.infer<typeof passwordSchema>;

export default function Profile() {
  const { user, logout } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('info');
  const [showPasswords, setShowPasswords] = useState(false);
  const [message, setMessage] = useState<any>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema)
  });

  // Profile Queries based on Role
  const { data: studentProfileData, isLoading: isLoadingStudent } = useGetMyStudentProfileApiStudentsMeProfileGet({
    query: { enabled: user?.role === 'student' }
  } as any);

  const { data: teacherProfileData, isLoading: isLoadingTeacher } = useGetMyTeacherProfileApiTeachersMeProfileGet({
    query: { enabled: user?.role === 'teacher' || user?.role === 'admin' }
  } as any);

  const profile = user?.role === 'student' ? studentProfileData?.data : teacherProfileData?.data;
  const loading = isLoadingStudent || isLoadingTeacher;

  // Change Password Mutation
  const changePasswordMutation = useChangePasswordApiAuthChangePasswordPost();

  const handlePasswordChange = async (data: PasswordForm) => {
    setMessage(null);
    try {
      await changePasswordMutation.mutateAsync({
        params: {
          old_password: data.oldPassword,
          new_password: data.newPassword
        }
      });
      setMessage({ type: 'success', text: 'Пароль успешно изменён!' });
      reset();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Ошибка смены пароля' });
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  }

  const getRoleName = (role?: string) => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'teacher': return 'Преподаватель';
      case 'student': return 'Студент';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-header-card">
        <div className="profile-avatar">
          <span>{(profile as any)?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}</span>
        </div>
        <div className="profile-info">
          <h1>
            {profile ? `${(profile as any).last_name} ${(profile as any).first_name} ${(profile as any).middle_name || ''}` : user?.email}
          </h1>
          <div className="profile-badges">
            <span className="badge badge-primary">
              <Shield size={14} />
              {getRoleName(user?.role)}
            </span>
            {(profile as any)?.group_name && (
              <span className="badge badge-secondary">
                <BookOpen size={14} />
                {(profile as any).group_name}
              </span>
            )}
            {(profile as any)?.rank && (
              <span className="badge badge-gold">
                <Award size={14} />
                {(profile as any).rank}
              </span>
            )}
            {(profile as any)?.military_rank && (
              <span className="badge badge-gold">
                <Award size={14} />
                {(profile as any).military_rank}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="profile-tabs">
        <button
          className={`tab ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          <User size={18} />
          Информация
        </button>
        <button
          className={`tab ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          <Lock size={18} />
          Безопасность
        </button>
      </div>

      <div className="profile-content">
        {activeTab === 'info' && (
          <div className="info-tab">
            <div className="info-section">
              <h2>Контактная информация</h2>
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-icon">
                    <Mail size={20} />
                  </div>
                  <div className="info-content">
                    <span className="label">Email</span>
                    <span className="value">{user?.email}</span>
                  </div>
                </div>

                {(profile as any)?.phone && (
                  <div className="info-item">
                    <div className="info-icon">
                      <Phone size={20} />
                    </div>
                    <div className="info-content">
                      <span className="label">Телефон</span>
                      <span className="value">{(profile as any).phone}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {profile && (
              <>
                {(user?.role === 'student') && (
                  <div className="info-section">
                    <h2>Учебная информация</h2>
                    <div className="info-grid">
                      {(profile as any).group_name && (
                        <div className="info-item">
                          <div className="info-icon">
                            <BookOpen size={20} />
                          </div>
                          <div className="info-content">
                            <span className="label">Группа</span>
                            <span className="value">{(profile as any).group_name}</span>
                          </div>
                        </div>
                      )}

                      {(profile as any).enrollment_date && (
                        <div className="info-item">
                          <div className="info-icon">
                            <Calendar size={20} />
                          </div>
                          <div className="info-content">
                            <span className="label">Дата зачисления</span>
                            <span className="value">
                              {new Date((profile as any).enrollment_date).toLocaleDateString('ru-RU')}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="info-section">
                  <h2>{user?.role === 'student' ? 'Военная информация' : 'Профессиональная информация'}</h2>
                  <div className="info-grid">
                    {((profile as any).rank || (profile as any).military_rank) && (
                      <div className="info-item">
                        <div className="info-icon">
                          <Award size={20} />
                        </div>
                        <div className="info-content">
                          <span className="label">{user?.role === 'student' ? 'Воинское звание' : 'Звание'}</span>
                          <span className="value">{(profile as any).rank || (profile as any).military_rank}</span>
                        </div>
                      </div>
                    )}

                    {(profile as any).position && (
                      <div className="info-item">
                        <div className="info-icon">
                          <Shield size={20} />
                        </div>
                        <div className="info-content">
                          <span className="label">Должность</span>
                          <span className="value">{(profile as any).position}</span>
                        </div>
                      </div>
                    )}

                    {(profile as any).military_id && (
                      <div className="info-item">
                        <div className="info-icon">
                          <Shield size={20} />
                        </div>
                        <div className="info-content">
                          <span className="label">Военный ID</span>
                          <span className="value">{(profile as any).military_id}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="info-section">
              <h2>Аккаунт</h2>
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-icon">
                    <Calendar size={20} />
                  </div>
                  <div className="info-content">
                    <span className="label">Дата регистрации</span>
                    <span className="value">
                      {user?.created_at
                        ? new Date(user.created_at).toLocaleDateString('ru-RU')
                        : 'Н/Д'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="security-tab">
            <div className="security-section">
              <h2>Изменить пароль</h2>

              {message && (
                <div className={`alert alert-${message.type}`}>
                  {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                  {message.text}
                </div>
              )}

              <form onSubmit={handleSubmit(handlePasswordChange)} className="password-form">
                <div className="form-group">
                  <label className="form-label">Текущий пароль</label>
                  <div className="input-with-icon">
                    <Lock size={18} />
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      className={`form-input ${errors.oldPassword ? 'error' : ''}`}
                      {...register('oldPassword')}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPasswords(!showPasswords)}
                    >
                      {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.oldPassword && <span className="error-text">{errors.oldPassword.message}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Новый пароль</label>
                  <div className="input-with-icon">
                    <Lock size={18} />
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      className={`form-input ${errors.newPassword ? 'error' : ''}`}
                      {...register('newPassword')}
                    />
                  </div>
                  {errors.newPassword && <span className="error-text">{errors.newPassword.message}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Подтвердите новый пароль</label>
                  <div className="input-with-icon">
                    <Lock size={18} />
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                      {...register('confirmPassword')}
                    />
                  </div>
                  {errors.confirmPassword && <span className="error-text">{errors.confirmPassword.message}</span>}
                </div>

                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  <Save size={18} />
                  {isSubmitting ? 'Сохранение...' : 'Изменить пароль'}
                </button>
              </form>
            </div>

            <div className="security-section danger-zone">
              <h2>Опасная зона</h2>
              <p>Выход из аккаунта завершит текущую сессию</p>
              <button className="btn btn-danger" onClick={handleLogout}>
                <LogOut size={18} />
                Выйти из аккаунта
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
