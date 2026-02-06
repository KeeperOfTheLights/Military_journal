'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import './Auth.css';

export default function Login() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const loginSchema = z.object({
    email: z.string().email('Некорректный email'),
    password: z.string().min(1, 'Введите пароль'),
  });

  type LoginForm = z.infer<typeof loginSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setGlobalError('');
    try {
      await login(data);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setGlobalError(err.response?.data?.detail || err.message || 'Ошибка входа. Проверьте данные.');
    }
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
            <h2>Вход в систему</h2>

            {globalError && (
              <div className="auth-error">
                <AlertCircle size={18} />
                <span>{globalError}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="input-with-icon">
                <Mail size={18} />
                <input
                  type="email"
                  className={`form-input ${errors.email ? 'error' : ''}`}
                  placeholder="example@kaztbu.edu.kz"
                  {...register('email')}
                />
              </div>
              {errors.email && <span className="error-text" style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{errors.email.message}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Пароль</label>
              <div className="input-with-icon">
                <Lock size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="Введите пароль"
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
              {errors.password && <span className="error-text" style={{ color: 'var(--error)', fontSize: '0.875rem' }}>{errors.password.message}</span>}
            </div>

            <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={isSubmitting}>
              {isSubmitting ? 'Вход...' : 'Войти'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Нет аккаунта? <Link href="/auth/register">Зарегистрироваться</Link></p>
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
