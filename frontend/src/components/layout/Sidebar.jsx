import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  CalendarCog,
  ClipboardCheck,
  ClipboardList,
  GraduationCap,
  Edit3,
  Users,
  FolderOpen,
  BookOpen,
  FileText,
  BarChart3,
  AlertTriangle,
  Settings,
  User,
  X,
  UserCog,
} from 'lucide-react';
import './Sidebar.css';

const studentMenu = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Главная' },
  { path: '/schedule', icon: Calendar, label: 'Расписание' },
  { path: '/attendance', icon: ClipboardCheck, label: 'Посещаемость' },
  { path: '/grades', icon: GraduationCap, label: 'Оценки' },
  { path: '/assignments', icon: FileText, label: 'Задания' },
  { path: '/disciplinary', icon: AlertTriangle, label: 'Дисциплина' },
  { path: '/profile', icon: User, label: 'Профиль' },
  { path: '/settings', icon: Settings, label: 'Настройки' },
];

const teacherMenu = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Главная' },
  { divider: true, label: 'Учебный процесс' },
  { path: '/schedule', icon: Calendar, label: 'Расписание' },
  { path: '/schedule/manage', icon: CalendarCog, label: 'Упр. расписанием' },
  { path: '/assignments', icon: FileText, label: 'Задания' },
  { divider: true, label: 'Журнал' },
  { path: '/attendance/mark', icon: ClipboardList, label: 'Посещаемость' },
  { path: '/grades/entry', icon: Edit3, label: 'Оценки' },
  { path: '/disciplinary', icon: AlertTriangle, label: 'Дисциплина' },
  { divider: true, label: 'Справочники' },
  { path: '/students', icon: Users, label: 'Студенты' },
  { path: '/groups', icon: FolderOpen, label: 'Группы' },
  { path: '/subjects', icon: BookOpen, label: 'Предметы' },
  { divider: true, label: 'Отчёты' },
  { path: '/analytics', icon: BarChart3, label: 'Аналитика' },
  { divider: true },
  { path: '/profile', icon: User, label: 'Профиль' },
  { path: '/settings', icon: Settings, label: 'Настройки' },
];

const adminMenu = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Главная' },
  { divider: true, label: 'Учебный процесс' },
  { path: '/schedule', icon: Calendar, label: 'Расписание' },
  { path: '/schedule/manage', icon: CalendarCog, label: 'Упр. расписанием' },
  { path: '/assignments', icon: FileText, label: 'Задания' },
  { divider: true, label: 'Журнал' },
  { path: '/attendance/mark', icon: ClipboardList, label: 'Посещаемость' },
  { path: '/grades/entry', icon: Edit3, label: 'Оценки' },
  { path: '/disciplinary', icon: AlertTriangle, label: 'Дисциплина' },
  { divider: true, label: 'Управление' },
  { path: '/students', icon: Users, label: 'Студенты' },
  { path: '/teachers', icon: UserCog, label: 'Преподаватели' },
  { path: '/groups', icon: FolderOpen, label: 'Группы' },
  { path: '/subjects', icon: BookOpen, label: 'Предметы' },
  { divider: true, label: 'Отчёты' },
  { path: '/analytics', icon: BarChart3, label: 'Аналитика' },
  { divider: true },
  { path: '/profile', icon: User, label: 'Профиль' },
  { path: '/settings', icon: Settings, label: 'Настройки' },
];

export default function Sidebar({ isOpen, onClose }) {
  const { isAdmin, isTeacher, isStudent } = useAuth();

  const getMenu = () => {
    if (isAdmin) return adminMenu;
    if (isTeacher) return teacherMenu;
    return studentMenu;
  };

  const menu = getMenu();

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'active' : ''}`} onClick={onClose} />
      
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h3>Навигация</h3>
          <button className="sidebar-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {menu.map((item, index) => {
            if (item.divider) {
              return (
                <div key={index} className="sidebar-divider">
                  {item.label && <span>{item.label}</span>}
                </div>
              );
            }
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-info">
            <p>Военная Кафедра КазУТБ</p>
            <span>© 2024</span>
          </div>
        </div>
      </aside>
    </>
  );
}
