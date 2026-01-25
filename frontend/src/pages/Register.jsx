import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle, User, Phone, Users } from 'lucide-react';
import api from '../api/config';
import './Auth.css';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
    first_name: '',
    last_name: '',
    middle_name: '',
    phone: '',
    group_id: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  
  // Load available groups for students
  useEffect(() => {
    const loadGroups = async () => {
      try {
        const response = await api.get('/groups');
        setGroups(response.data);
      } catch (err) {
        console.log('Could not load groups:', err);
      }
    };
    loadGroups();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const validatePassword = (password) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
    };
    return checks;
  };

  const passwordChecks = validatePassword(formData.password);
  const allChecksPass = Object.values(passwordChecks).every(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (!allChecksPass) {
      setError('Пароль не соответствует требованиям');
      return;
    }

    setLoading(true);

    if (!formData.first_name || !formData.last_name) {
      setError('Введите имя и фамилию');
      setLoading(false);
      return;
    }

    try {
      const registerData = {
        email: formData.email,
        password: formData.password,
        role: formData.role,
        first_name: formData.first_name,
        last_name: formData.last_name,
        middle_name: formData.middle_name || null,
        phone: formData.phone || null,
      };
      
      // Add group_id for students
      if (formData.role === 'student' && formData.group_id) {
        registerData.group_id = parseInt(formData.group_id);
      }
      
      await register(registerData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Ошибка регистрации');
    } finally {
      setLoading(false);
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

          <form onSubmit={handleSubmit} className="auth-form">
            <h2>Регистрация</h2>
            
            {error && (
              <div className="auth-error">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Фамилия *</label>
                <div className="input-with-icon">
                  <User size={18} />
                  <input
                    type="text"
                    name="last_name"
                    className="form-input"
                    placeholder="Иванов"
                    value={formData.last_name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Имя *</label>
                <div className="input-with-icon">
                  <User size={18} />
                  <input
                    type="text"
                    name="first_name"
                    className="form-input"
                    placeholder="Иван"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Отчество</label>
                <div className="input-with-icon">
                  <User size={18} />
                  <input
                    type="text"
                    name="middle_name"
                    className="form-input"
                    placeholder="Иванович"
                    value={formData.middle_name}
                    onChange={handleChange}
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label className="form-label">Телефон</label>
                <div className="input-with-icon">
                  <Phone size={18} />
                  <input
                    type="tel"
                    name="phone"
                    className="form-input"
                    placeholder="+7 (777) 123-45-67"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Роль</label>
              <select
                name="role"
                className="form-input form-select"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="student">Студент</option>
                <option value="teacher">Преподаватель</option>
              </select>
            </div>

            {formData.role === 'student' && groups.length > 0 && (
              <div className="form-group">
                <label className="form-label">Группа</label>
                <div className="input-with-icon">
                  <Users size={18} />
                  <select
                    name="group_id"
                    className="form-input form-select"
                    value={formData.group_id}
                    onChange={handleChange}
                  >
                    <option value="">Выберите группу</option>
                    {groups.map(group => (
                      <option key={group.id} value={group.id}>
                        {group.name} ({group.course} курс)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Email *</label>
              <div className="input-with-icon">
                <Mail size={18} />
                <input
                  type="email"
                  name="email"
                  className="form-input"
                  placeholder="example@kaztbu.edu.kz"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Пароль *</label>
              <div className="input-with-icon">
                <Lock size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="form-input"
                  placeholder="Создайте пароль"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              
              {formData.password && (
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
              <label className="form-label">Подтвердите пароль</label>
              <div className="input-with-icon">
                <Lock size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  className="form-input"
                  placeholder="Повторите пароль"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
          </form>

          <div className="auth-footer">
            <p>Уже есть аккаунт? <Link to="/login">Войти</Link></p>
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

