import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import TokenExpirationWarning from './components/TokenExpirationWarning';

// Layout
import Layout from './components/layout/Layout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import Attendance from './pages/Attendance';
import Grades from './pages/Grades';
import Students from './pages/Students';
import Groups from './pages/Groups';
import Subjects from './pages/Subjects';
import Teachers from './pages/Teachers';
import AttendanceMarking from './pages/AttendanceMarking';
import GradesEntry from './pages/GradesEntry';
import ScheduleManagement from './pages/ScheduleManagement';
import ScheduleCalendar from './pages/ScheduleCalendar';
import Assignments from './pages/Assignments';
import Disciplinary from './pages/Disciplinary';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TokenExpirationWarning />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected routes */}
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/grades" element={<Grades />} />
              <Route path="/assignments" element={<Assignments />} />
              
              {/* Management pages */}
              <Route path="/students" element={<Students />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/subjects" element={<Subjects />} />
              <Route path="/teachers" element={<Teachers />} />
              
              {/* Teacher/Admin pages */}
              <Route path="/attendance/mark" element={<AttendanceMarking />} />
              <Route path="/grades/entry" element={<GradesEntry />} />
              <Route path="/schedule/manage" element={<ScheduleManagement />} />
              <Route path="/schedule/calendar" element={<ScheduleCalendar />} />
              <Route path="/disciplinary" element={<Disciplinary />} />
              <Route path="/analytics" element={<Analytics />} />
              
              {/* Profile & Settings */}
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
            </Route>

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
