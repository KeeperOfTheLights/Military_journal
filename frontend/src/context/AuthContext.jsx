import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/auth';
import { setAuthToken } from '../api/config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      // Set token in axios defaults
      setAuthToken(token);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const data = await authAPI.login(email, password);
    
    // Set token FIRST before anything else
    setAuthToken(data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    
    return data;
  };

  const register = async (userData) => {
    const data = await authAPI.register(userData);
    
    // Set token FIRST before anything else
    setAuthToken(data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    
    return data;
  };

  const logout = () => {
    setAuthToken(null);
    localStorage.removeItem('user');
    setUser(null);
  };

  const isAdmin = user?.role === 'admin';
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const isStudent = user?.role === 'student';

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      logout,
      isAdmin,
      isTeacher,
      isStudent,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
