import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Menu,
  X,
  User,
  LogOut,
  Settings,
  Bell,
  ChevronDown,
  Shield,
} from 'lucide-react';
import './Header.css';

export default function Header({ onMenuToggle }) {
  const { user, logout, isTeacher } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleName = (role) => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'teacher': return 'Преподаватель';
      case 'student': return 'Студент';
      default: return role;
    }
  };

  return (
    <header className="header">
      <div className="header-left">
        <button className="menu-toggle" onClick={onMenuToggle}>
          <Menu size={24} />
        </button>
        
        <Link to="/" className="header-logo">
          <div className="logo-icon">
            <Shield size={28} />
          </div>
          <div className="logo-text">
            <span className="logo-title">Военная Кафедра</span>
            <span className="logo-subtitle">КазУТБ</span>
          </div>
        </Link>
      </div>

      <div className="header-center">
        <nav className="header-nav">
          <Link to="/dashboard" className="nav-link">Главная</Link>
          <Link to="/schedule" className="nav-link">Расписание</Link>
          <Link to="/grades" className="nav-link">Оценки</Link>
          <Link to="/attendance" className="nav-link">Посещаемость</Link>
          {isTeacher && (
            <Link to="/analytics" className="nav-link">Аналитика</Link>
          )}
        </nav>
      </div>

      <div className="header-right">
        <button 
          className="header-icon-btn"
          onClick={() => setShowNotifications(!showNotifications)}
        >
          <Bell size={20} />
          <span className="notification-badge">3</span>
        </button>

        <div className="user-menu-container">
          <button 
            className="user-menu-trigger"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="user-avatar">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <span className="user-email">{user?.email}</span>
              <span className="user-role">{getRoleName(user?.role)}</span>
            </div>
            <ChevronDown size={16} />
          </button>

          {showUserMenu && (
            <div className="user-dropdown">
              <Link to="/profile" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                <User size={16} />
                <span>Профиль</span>
              </Link>
              <Link to="/settings" className="dropdown-item" onClick={() => setShowUserMenu(false)}>
                <Settings size={16} />
                <span>Настройки</span>
              </Link>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item logout" onClick={handleLogout}>
                <LogOut size={16} />
                <span>Выйти</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}






