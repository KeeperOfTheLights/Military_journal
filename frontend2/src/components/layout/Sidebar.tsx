'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
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
  LucideIcon,
} from 'lucide-react';
import './Sidebar.css';

interface MenuItem {
  path?: string;
  icon?: LucideIcon;
  label?: string;
  divider?: boolean;
}

const studentMenu: MenuItem[] = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Главная' },
  { path: '/schedule', icon: Calendar, label: 'Расписание' },
  { path: '/attendance', icon: ClipboardCheck, label: 'Посещаемость' },
  { path: '/grades', icon: GraduationCap, label: 'Оценки' },
  { path: '/assignments', icon: FileText, label: 'Задания' },
  { path: '/disciplinary', icon: AlertTriangle, label: 'Дисциплина' },
  { path: '/profile', icon: User, label: 'Профиль' },
  { path: '/settings', icon: Settings, label: 'Настройки' },
];

const teacherMenu: MenuItem[] = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Главная' },
  { divider: true, label: 'Учебный процесс' },
  { path: '/schedule', icon: Calendar, label: 'Расписание' },
  { path: '/schedule/manage', icon: CalendarCog, label: 'Упр. расписанием' },
  { path: '/assignments', icon: FileText, label: 'Задания' },
  { divider: true, label: 'Журнал' },
  { path: '/attendance/marking', icon: ClipboardList, label: 'Посещаемость' },
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

const adminMenu: MenuItem[] = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Главная' },
  { divider: true, label: 'Учебный процесс' },
  { path: '/schedule', icon: Calendar, label: 'Расписание' },
  { path: '/schedule/manage', icon: CalendarCog, label: 'Упр. расписанием' },
  { path: '/assignments', icon: FileText, label: 'Задания' },
  { divider: true, label: 'Журнал' },
  { path: '/attendance/marking', icon: ClipboardList, label: 'Посещаемость' },
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

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuthStore();
  const pathname = usePathname();

  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher';

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

            if (!item.path || !item.icon || !item.label) return null;

            const isActive = pathname === item.path || (item.path !== '/' && pathname?.startsWith(item.path));
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                href={item.path}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
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
