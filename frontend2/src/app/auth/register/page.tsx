'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, User, Phone, Users } from 'lucide-react';
import '@/styles/Auth.css';
import { useListGroupsApiGroupsGet } from '@/api/orval/client/groups/groups';

const registerSchema = z.object({
  first_name: z.string().min(1, 'Введите имя'),
  last_name: z.string().min(1, 'Введите фамилию'),
  middle_name: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(['student', 'teacher']),
  group_id: z.string().optional(),
  email: z.string().email('Некорректный email'),
  password: z.string()
    .min(8, 'Минимум 8 символов')
    .regex(/[A-Z]/, 'Нужна заглавная буква')
    .regex(/[a-z]/, 'Нужна строчная буква')
    .regex(/\d/, 'Нужна цифра'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Пароли не совпадают",
  path: ["confirmPassword"],
}).refine((data) => {
  if (data.role === 'student' && !data.group_id) {
    return false;
  }
  return true;
}, {
  message: "Выберите группу",
  path: ["group_id"],
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const router = useRouter();
  const { register: registerUser } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const { data: groupsData } = useListGroupsApiGroupsGet();
  const groups = Array.isArray(groupsData?.data) ? groupsData.data : [];

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'student',
      first_name: '',
      last_name: '',
      middle_name: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
      group_id: ''
    }
  });

  const watchedRole = watch('role');
  const watchedPassword = watch('password') || '';

  const onSubmit = async (data: RegisterForm) => {
    setGlobalError('');

    try {
      const registerData: any = {
        email: data.email,
        password: data.password,
        role: data.role,
        first_name: data.first_name,
        last_name: data.last_name,
        middle_name: data.middle_name || null,
        phone: data.phone || null,
      };

      if (data.role === 'student' && data.group_id) {
        registerData.group_id = parseInt(data.group_id);
      }

      await registerUser(registerData);
      router.push('/dashboard');
    } catch (err: any) {
      setGlobalError(err.message || 'Ошибка регистрации');
    }
  };

  const passwordChecks = {
    length: watchedPassword.length >= 8,
    uppercase: /[A-Z]/.test(watchedPassword),
    lowercase: /[a-z]/.test(watchedPassword),
    number: /\d/.test(watchedPassword),
  };

  return (
    <div className="auth-page">
      <div className="auth-background">
        <div className="auth-pattern"></div>
      </div>

      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <Shield size={40} />
            </div>
            <h1>Военная Кафедра</h1>
            <p>Казахский Университет Технологии и Бизнеса</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
            <h2>Регистрация</h2>

            {globalError && (
              <div className="auth-error">
                <AlertCircle size={18} />
                <span>{globalError}</span>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Фамилия *</label>
                <div className="input-with-icon">
                  <User size={18} />
                  <input
                    type="text"
                    className={`form-input ${errors.last_name ? 'error' : ''}`}
                    placeholder="Иванов"
                    {...register('last_name')}
                  />
                </div>
                {errors.last_name && <span className="error-text">{errors.last_name.message}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Имя *</label>
                <div className="input-with-icon">
                  <User size={18} />
                  <input
                    type="text"
                    className={`form-input ${errors.first_name ? 'error' : ''}`}
                    placeholder="Иван"
                    {...register('first_name')}
                  />
                </div>
                {errors.first_name && <span className="error-text">{errors.first_name.message}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Отчество</label>
                <div className="input-with-icon">
                  <User size={18} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Иванович"
                    {...register('middle_name')}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Телефон</label>
                <div className="input-with-icon">
                  <Phone size={18} />
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="+7 (777) 123-45-67"
                    {...register('phone')}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Роль</label>
              <select
                className="form-input form-select"
                {...register('role')}
              >
                <option value="student">Студент</option>
                <option value="teacher">Преподаватель</option>
              </select>
            </div>

            {watchedRole === 'student' && (
              <div className="form-group">
                <label className="form-label">Группа *</label>
                <div className="input-with-icon">
                  <Users size={18} />
                  <select
                    className={`form-input form-select ${errors.group_id ? 'error' : ''}`}
                    {...register('group_id')}
                  >
                    <option value="">Выберите группу</option>
                    {groups.map(group => (
                      <option key={group.id} value={String(group.id)}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
                {errors.group_id && <span className="error-text">{errors.group_id.message}</span>}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email *</label>
              <div className="input-with-icon">
                <Mail size={18} />
                <input
                  type="email"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder="example@kaztbu.edu.kz"
                  {...register('email')}
                />
              </div>
              {errors.email && <span className="error-text">{errors.email.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Пароль *</label>
              <div className="input-with-icon">
                <Lock size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="Создайте пароль"
                  {...register('password')}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <span className="error-text">{errors.password.message}</span>}

              {watchedPassword && (
                <div className="password-requirements">
                  <div className={`requirement ${passwordChecks.length ? 'met' : ''}`}>
                    <CheckCircle size={14} />
                    <span>Минимум 8 символов</span>
                  </div>
                  <div className={`requirement ${passwordChecks.uppercase ? 'met' : ''}`}>
                    <CheckCircle size={14} />
                    <span>Заглавная буква</span>
                  </div>
                  <div className={`requirement ${passwordChecks.lowercase ? 'met' : ''}`}>
                    <CheckCircle size={14} />
                    <span>Строчная буква</span>
                  </div>
                  <div className={`requirement ${passwordChecks.number ? 'met' : ''}`}>
                    <CheckCircle size={14} />
                    <span>Цифра</span>
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Подтвердите пароль *</label>
              <div className="input-with-icon">
                <Lock size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                  placeholder="Повторите пароль"
                  {...register('confirmPassword')}
                />
              </div>
              {errors.confirmPassword && <span className="error-text">{errors.confirmPassword.message}</span>}
            </div>

            <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Уже есть аккаунт? <Link href="/auth/login">Войти</Link></p>
          </div>
        </div>

        <div className="auth-info">
          <h3>Электронный журнал</h3>
          <ul>
            <li>Онлайн-журнал посещаемости</li>
            <li>Электронные оценки</li>
            <li>Расписание занятий</li>
            <li>Дисциплинарный учёт</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
