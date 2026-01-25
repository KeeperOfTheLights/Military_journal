import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Settings as SettingsIcon, Bell, Moon, Sun, Globe, 
  Shield, Database, Save, Check, AlertCircle, 
  Monitor, Palette, Clock, Mail, Lock
} from 'lucide-react';
import './Profile.css';

export default function Settings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('appearance');
  const [settings, setSettings] = useState({
    theme: localStorage.getItem('theme') || 'light',
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
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const isAdmin = user?.role === 'admin';

  const handleThemeChange = (theme) => {
    setSettings({ ...settings, theme });
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  };

  const handleNotificationChange = (key, value) => {
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: value
      }
    });
  };

  const handleDisplayChange = (key, value) => {
    setSettings({
      ...settings,
      display: {
        ...settings.display,
        [key]: value
      }
    });
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // Save to localStorage for now
      localStorage.setItem('userSettings', JSON.stringify(settings));
      setMessage({ type: 'success', text: 'Настройки сохранены!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Ошибка сохранения настроек' });
    } finally {
      setSaving(false);
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
          <p style={{ color: 'var(--text-secondary)' }}>
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
          <div className={`alert alert-${message.type}`} style={{ marginBottom: '1.5rem' }}>
            {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
            {message.text}
          </div>
        )}

        {activeTab === 'appearance' && (
          <div className="settings-section">
            <h2>Тема оформления</h2>
            <div className="theme-selector">
              <button 
                className={`theme-option ${settings.theme === 'light' ? 'active' : ''}`}
                onClick={() => handleThemeChange('light')}
              >
                <div className="theme-preview light">
                  <Sun size={24} />
                </div>
                <span>Светлая</span>
              </button>
              <button 
                className={`theme-option ${settings.theme === 'dark' ? 'active' : ''}`}
                onClick={() => handleThemeChange('dark')}
              >
                <div className="theme-preview dark">
                  <Moon size={24} />
                </div>
                <span>Тёмная</span>
              </button>
              <button 
                className={`theme-option ${settings.theme === 'system' ? 'active' : ''}`}
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
                value={settings.language}
                onChange={(e) => setSettings({ ...settings, language: e.target.value })}
                style={{ maxWidth: '300px' }}
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
                  checked={settings.display.compactMode}
                  onChange={(e) => handleDisplayChange('compactMode', e.target.checked)}
                />
              </label>
              <label className="toggle-item">
                <span>
                  <strong>Показывать аватары</strong>
                  <small>Отображать аватары пользователей</small>
                </span>
                <input 
                  type="checkbox" 
                  checked={settings.display.showAvatars}
                  onChange={(e) => handleDisplayChange('showAvatars', e.target.checked)}
                />
              </label>
              <label className="toggle-item">
                <span>
                  <strong>Анимации</strong>
                  <small>Включить анимации интерфейса</small>
                </span>
                <input 
                  type="checkbox" 
                  checked={settings.display.animationsEnabled}
                  onChange={(e) => handleDisplayChange('animationsEnabled', e.target.checked)}
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
                  checked={settings.notifications.email}
                  onChange={(e) => handleNotificationChange('email', e.target.checked)}
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
                  checked={settings.notifications.browser}
                  onChange={(e) => handleNotificationChange('browser', e.target.checked)}
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
                  checked={settings.notifications.grades}
                  onChange={(e) => handleNotificationChange('grades', e.target.checked)}
                />
              </label>
              <label className="toggle-item">
                <span>
                  <strong>Посещаемость</strong>
                  <small>Уведомлять об отметках посещаемости</small>
                </span>
                <input 
                  type="checkbox" 
                  checked={settings.notifications.attendance}
                  onChange={(e) => handleNotificationChange('attendance', e.target.checked)}
                />
              </label>
              <label className="toggle-item">
                <span>
                  <strong>Задания</strong>
                  <small>Уведомлять о новых заданиях</small>
                </span>
                <input 
                  type="checkbox" 
                  checked={settings.notifications.assignments}
                  onChange={(e) => handleNotificationChange('assignments', e.target.checked)}
                />
              </label>
              <label className="toggle-item">
                <span>
                  <strong>Дисциплинарные записи</strong>
                  <small>Уведомлять о дисциплинарных записях</small>
                </span>
                <input 
                  type="checkbox" 
                  checked={settings.notifications.disciplinary}
                  onChange={(e) => handleNotificationChange('disciplinary', e.target.checked)}
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
          <button className="btn btn-primary" onClick={saveSettings} disabled={saving}>
            <Save size={18} />
            {saving ? 'Сохранение...' : 'Сохранить настройки'}
          </button>
        </div>
      </div>
    </div>
  );
}





