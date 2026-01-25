import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI, studentsAPI } from '../api/auth';
import { 
  User, Mail, Phone, Calendar, Shield, 
  Lock, Save, Eye, EyeOff, Check, AlertCircle,
  Award, BookOpen 
} from 'lucide-react';
import './Profile.css';

export default function Profile() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      if (user?.role === 'student') {
        const studentProfile = await studentsAPI.getMyProfile();
        setProfile(studentProfile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage(null);
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Пароли не совпадают' });
      return;
    }
    
    if (passwordData.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Пароль должен быть не менее 8 символов' });
      return;
    }
    
    setSaving(true);
    try {
      await authAPI.changePassword(passwordData.oldPassword, passwordData.newPassword);
      setMessage({ type: 'success', text: 'Пароль успешно изменён!' });
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Ошибка смены пароля' });
    } finally {
      setSaving(false);
    }
  };

  const getRoleName = (role) => {
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
          <span>{user?.email?.[0]?.toUpperCase() || 'U'}</span>
        </div>
        <div className="profile-info">
          <h1>
            {profile ? `${profile.last_name} ${profile.first_name} ${profile.middle_name || ''}` : user?.email}
          </h1>
          <div className="profile-badges">
            <span className="badge badge-primary">
              <Shield size={14} />
              {getRoleName(user?.role)}
            </span>
            {profile?.group_name && (
              <span className="badge badge-secondary">
                <BookOpen size={14} />
                {profile.group_name}
              </span>
            )}
            {profile?.rank && (
              <span className="badge badge-gold">
                <Award size={14} />
                {profile.rank}
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
                
                {profile?.phone && (
                  <div className="info-item">
                    <div className="info-icon">
                      <Phone size={20} />
                    </div>
                    <div className="info-content">
                      <span className="label">Телефон</span>
                      <span className="value">{profile.phone}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {profile && (
              <>
                <div className="info-section">
                  <h2>Учебная информация</h2>
                  <div className="info-grid">
                    {profile.group_name && (
                      <div className="info-item">
                        <div className="info-icon">
                          <BookOpen size={20} />
                        </div>
                        <div className="info-content">
                          <span className="label">Группа</span>
                          <span className="value">{profile.group_name}</span>
                        </div>
                      </div>
                    )}
                    
                    {profile.enrollment_date && (
                      <div className="info-item">
                        <div className="info-icon">
                          <Calendar size={20} />
                        </div>
                        <div className="info-content">
                          <span className="label">Дата зачисления</span>
                          <span className="value">
                            {new Date(profile.enrollment_date).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {(profile.rank || profile.military_id) && (
                  <div className="info-section">
                    <h2>Военная информация</h2>
                    <div className="info-grid">
                      {profile.rank && (
                        <div className="info-item">
                          <div className="info-icon">
                            <Award size={20} />
                          </div>
                          <div className="info-content">
                            <span className="label">Воинское звание</span>
                            <span className="value">{profile.rank}</span>
                          </div>
                        </div>
                      )}
                      
                      {profile.military_id && (
                        <div className="info-item">
                          <div className="info-icon">
                            <Shield size={20} />
                          </div>
                          <div className="info-content">
                            <span className="label">Военный ID</span>
                            <span className="value">{profile.military_id}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
              
              <form onSubmit={handlePasswordChange} className="password-form">
                <div className="form-group">
                  <label className="form-label">Текущий пароль</label>
                  <div className="input-with-icon">
                    <Lock size={18} />
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      className="form-input"
                      value={passwordData.oldPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                      required
                    />
                    <button 
                      type="button" 
                      className="password-toggle"
                      onClick={() => setShowPasswords(!showPasswords)}
                    >
                      {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Новый пароль</label>
                  <div className="input-with-icon">
                    <Lock size={18} />
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      className="form-input"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      required
                      minLength={8}
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label className="form-label">Подтвердите новый пароль</label>
                  <div className="input-with-icon">
                    <Lock size={18} />
                    <input
                      type={showPasswords ? 'text' : 'password'}
                      className="form-input"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Save size={18} />
                  {saving ? 'Сохранение...' : 'Изменить пароль'}
                </button>
              </form>
            </div>

            <div className="security-section danger-zone">
              <h2>Опасная зона</h2>
              <p>Выход из аккаунта завершит текущую сессию</p>
              <button className="btn btn-danger" onClick={logout}>
                Выйти из аккаунта
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}






