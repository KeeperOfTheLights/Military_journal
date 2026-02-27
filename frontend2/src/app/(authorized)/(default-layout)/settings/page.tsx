'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Settings as SettingsIcon, Bell, Moon, Sun, Globe,
  Shield, Database, Save, Check, AlertCircle,
  Monitor, Palette, Clock, Mail, Lock
} from 'lucide-react';
import '@/styles/Profile.css';

const settingsSchema = z.object({
  theme: z.string(),
  language: z.string(),
  notifications: z.object({
    email: z.boolean(),
    browser: z.boolean(),
    grades: z.boolean(),
    attendance: z.boolean(),
    assignments: z.boolean(),
    disciplinary: z.boolean(),
  }),
  display: z.object({
    compactMode: z.boolean(),
    showAvatars: z.boolean(),
    animationsEnabled: z.boolean(),
  })
});

type SettingsForm = z.infer<typeof settingsSchema>;

export default function Settings() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('appearance');
  const [message, setMessage] = useState<any>(null);

  const isAdmin = user?.role === 'admin';

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { isSubmitting },
  } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      theme: 'light',
      language: 'ru',
      notifications: {
        email: true,
        browser: true,
        grades: true,
        attendance: true,
        assignments: true,
        disciplinary: true,
      },
      display: {
        compactMode: false,
        showAvatars: true,
        animationsEnabled: true,
      }
    }
  });

  const currentTheme = watch('theme');
  const settings = watch(); // Watch all for local interactions if needed or relies on form state

  useEffect(() => {
    // Load settings from localStorage specific to client-side
    const storedSettings = localStorage.getItem('userSettings');
    const storedTheme = localStorage.getItem('theme');

    if (storedSettings) {
      const parsed = JSON.parse(storedSettings);
      // We need to iterate keys to set values because reset/defaultValues might be too late or cleaner to just set
      Object.keys(parsed).forEach(key => {
        setValue(key as any, parsed[key]);
      });
      if (storedTheme) setValue('theme', storedTheme);
    } else if (storedTheme) {
      setValue('theme', storedTheme);
    }
  }, [setValue]);

  const handleThemeChange = (theme: string) => {
    setValue('theme', theme);
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  };

  const onSubmit = async (data: SettingsForm) => {
    try {
      // Save to localStorage for now
      localStorage.setItem('userSettings', JSON.stringify(data));
      setMessage({ type: 'success', text: 'Настройки сохранены!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Ошибка сохранения настроек' });
    }
  };

  return (
    <div className="profile-page settings-page">
      <div className="profile-header-card">
        <div className="profile-avatar" style={{ background: 'var(--primary)' }}>
          <SettingsIcon size={32} />
        </div>
        <div className="profile-info">
          <h1>Настройки</h1>
          <p style={{ color: 'rgba(255,255,255,0.8)' }}>
            Управляйте настройками приложения
          </p>
        </div>
      </div>

      <div className="profile-tabs">
        <button
          className={`tab ${activeTab === 'appearance' ? 'active' : ''}`}
          onClick={() => setActiveTab('appearance')}
        >
          <Palette size={18} />
          Внешний вид
        </button>
        <button
          className={`tab ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          <Bell size={18} />
          Уведомления
        </button>
        {isAdmin && (
          <button
            className={`tab ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            <Database size={18} />
            Система
          </button>
        )}
      </div>

      <div className="profile-content">
        {message && (
          <div className={`alert alert-${message.type}`} style={{ marginBottom: '1.5rem', margin: '1rem' }}>
            {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
            {message.text}
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="settings-section">
            <h2>Тема оформления</h2>
            <div className="theme-selector">
              <button
                className={`theme-option ${currentTheme === 'light' ? 'active' : ''}`}
                onClick={() => handleThemeChange('light')}
              >
                <div className="theme-preview light">
                  <Sun size={24} />
                </div>
                <span>Светлая</span>
              </button>
              <button
                className={`theme-option ${currentTheme === 'dark' ? 'active' : ''}`}
                onClick={() => handleThemeChange('dark')}
              >
                <div className="theme-preview dark">
                  <Moon size={24} />
                </div>
                <span>Тёмная</span>
              </button>
              <button
                className={`theme-option ${currentTheme === 'system' ? 'active' : ''}`}
                onClick={() => handleThemeChange('system')}
              >
                <div className="theme-preview system">
                  <Monitor size={24} />
                </div>
                <span>Системная</span>
              </button>
            </div>

            <h2>Язык интерфейса</h2>
            <div className="form-group">
              <select
                className="form-input"
                style={{ maxWidth: '300px' }}
                {...register('language')}
              >
                <option value="ru">🇷🇺 Русский</option>
                <option value="kk">🇰🇿 Қазақша</option>
                <option value="en">🇬🇧 English</option>
              </select>
            </div>

            <h2>Отображение</h2>
            <div className="settings-toggles">
              <label className="toggle-item">
                <span>
                  <strong>Компактный режим</strong>
                  <small>Уменьшенные отступы и размеры элементов</small>
                </span>
                <input
                  type="checkbox"
                  {...register('display.compactMode')}
                />
              </label>
              <label className="toggle-item">
                <span>
                  <strong>Показывать аватары</strong>
                  <small>Отображать аватары пользователей</small>
                </span>
                <input
                  type="checkbox"
                  {...register('display.showAvatars')}
                />
              </label>
              <label className="toggle-item">
                <span>
                  <strong>Анимации</strong>
                  <small>Включить анимации интерфейса</small>
                </span>
                <input
                  type="checkbox"
                  {...register('display.animationsEnabled')}
                />
              </label>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="settings-section">
            <h2>Способы уведомлений</h2>
            <div className="settings-toggles">
              <label className="toggle-item">
                <span>
                  <Mail size={18} />
                  <div>
                    <strong>Email уведомления</strong>
                    <small>Получать уведомления на почту</small>
                  </div>
                </span>
                <input
                  type="checkbox"
                  {...register('notifications.email')}
                />
              </label>
              <label className="toggle-item">
                <span>
                  <Bell size={18} />
                  <div>
                    <strong>Push уведомления</strong>
                    <small>Уведомления в браузере</small>
                  </div>
                </span>
                <input
                  type="checkbox"
                  {...register('notifications.browser')}
                />
              </label>
            </div>

            <h2>Типы уведомлений</h2>
            <div className="settings-toggles">
              <label className="toggle-item">
                <span>
                  <strong>Новые оценки</strong>
                  <small>Уведомлять о выставленных оценках</small>
                </span>
                <input
                  type="checkbox"
                  {...register('notifications.grades')}
                />
              </label>
              <label className="toggle-item">
                <span>
                  <strong>Посещаемость</strong>
                  <small>Уведомлять об отметках посещаемости</small>
                </span>
                <input
                  type="checkbox"
                  {...register('notifications.attendance')}
                />
              </label>
              <label className="toggle-item">
                <span>
                  <strong>Задания</strong>
                  <small>Уведомлять о новых заданиях</small>
                </span>
                <input
                  type="checkbox"
                  {...register('notifications.assignments')}
                />
              </label>
              <label className="toggle-item">
                <span>
                  <strong>Дисциплинарные записи</strong>
                  <small>Уведомлять о дисциплинарных записях</small>
                </span>
                <input
                  type="checkbox"
                  {...register('notifications.disciplinary')}
                />
              </label>
            </div>
          </div>
        )}

        {activeTab === 'system' && isAdmin && (
          <div className="settings-section">
            <h2>Системная информация</h2>
            <div className="system-info-grid">
              <div className="system-info-card">
                <Database size={24} />
                <div>
                  <strong>База данных</strong>
                  <span>PostgreSQL</span>
                </div>
              </div>
              <div className="system-info-card">
                <Shield size={24} />
                <div>
                  <strong>Версия API</strong>
                  <span>v1.0.0</span>
                </div>
              </div>
              <div className="system-info-card">
                <Clock size={24} />
                <div>
                  <strong>Время сервера</strong>
                  <span>{new Date().toLocaleString('ru-RU')}</span>
                </div>
              </div>
              <div className="system-info-card">
                <Globe size={24} />
                <div>
                  <strong>Регион</strong>
                  <span>Казахстан (KZ)</span>
                </div>
              </div>
            </div>

            <h2>Действия администратора</h2>
            <div className="admin-actions">
              <button className="btn btn-outline">
                <Database size={18} />
                Резервное копирование БД
              </button>
              <button className="btn btn-outline">
                <Lock size={18} />
                Сбросить кэш
              </button>
            </div>

            <div className="danger-zone" style={{ marginTop: '2rem' }}>
              <h2>⚠️ Опасная зона</h2>
              <p>Эти действия могут привести к потере данных</p>
              <button className="btn btn-danger">
                Очистить все данные
              </button>
            </div>
          </div>
        )}

        <div className="settings-footer">
          <button className="btn btn-primary" onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
            <Save size={18} />
            {isSubmitting ? 'Сохранение...' : 'Сохранить настройки'}
          </button>
        </div>
      </div>
    </div>
  );
}
