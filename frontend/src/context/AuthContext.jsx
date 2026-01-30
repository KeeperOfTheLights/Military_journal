import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authAPI } from '../api/auth';
import { setAuthToken } from '../api/config';

const AuthContext = createContext(null);

// Parse JWT token to get expiration time
const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

// Get token expiration time in milliseconds
const getTokenExpiration = (token) => {
  const payload = parseJwt(token);
  if (payload && payload.exp) {
    return payload.exp * 1000; // Convert to milliseconds
  }
  return null;
};

// Warning time before expiration (5 minutes)
const WARNING_BEFORE_EXPIRE_MS = 5 * 60 * 1000;
// Check interval (1 minute)
const CHECK_INTERVAL_MS = 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showExpirationWarning, setShowExpirationWarning] = useState(false);
  const [expiresIn, setExpiresIn] = useState(null);
  const checkIntervalRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // Track user activity
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    // Track user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });
    
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [updateActivity]);

  // Check token expiration
  const checkTokenExpiration = useCallback(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const expTime = getTokenExpiration(token);
    if (!expTime) return;

    const now = Date.now();
    const timeUntilExpire = expTime - now;

    // Token already expired
    if (timeUntilExpire <= 0) {
      console.log('Token expired');
      setShowExpirationWarning(false);
      logout();
      return;
    }

    // Show warning if token expires soon
    if (timeUntilExpire <= WARNING_BEFORE_EXPIRE_MS) {
      const minutesLeft = Math.ceil(timeUntilExpire / 60000);
      setExpiresIn(minutesLeft);
      setShowExpirationWarning(true);
    }
  }, []);

  // Start checking token expiration
  useEffect(() => {
    if (user) {
      // Initial check
      checkTokenExpiration();
      
      // Set up interval
      checkIntervalRef.current = setInterval(checkTokenExpiration, CHECK_INTERVAL_MS);
    }

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [user, checkTokenExpiration]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      // Check if token is still valid
      const expTime = getTokenExpiration(token);
      if (expTime && expTime > Date.now()) {
        setAuthToken(token);
        setUser(JSON.parse(savedUser));
      } else {
        // Token expired, clean up
        setAuthToken(null);
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const data = await authAPI.login(email, password);
    
    setAuthToken(data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    setShowExpirationWarning(false);
    
    return data;
  };

  const register = async (userData) => {
    const data = await authAPI.register(userData);
    
    setAuthToken(data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    setShowExpirationWarning(false);
    
    return data;
  };

  const logout = () => {
    setAuthToken(null);
    localStorage.removeItem('user');
    setUser(null);
    setShowExpirationWarning(false);
  };

  // Refresh token
  const refreshToken = async () => {
    try {
      const data = await authAPI.refreshToken();
      setAuthToken(data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      setShowExpirationWarning(false);
      setExpiresIn(null);
      return true;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      logout();
      return false;
    }
  };

  // Dismiss warning (user acknowledged but doesn't want to refresh now)
  const dismissWarning = () => {
    setShowExpirationWarning(false);
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
      refreshToken,
      isAdmin,
      isTeacher,
      isStudent,
      isAuthenticated: !!user,
      showExpirationWarning,
      expiresIn,
      dismissWarning,
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
