import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to set auth token directly
export const setAuthToken = (token) => {
  if (token) {
    console.log('Setting auth token:', token.substring(0, 30) + '...');
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('access_token', token);
  } else {
    console.log('Clearing auth token');
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('access_token');
  }
};

// Initialize token from localStorage on app start
const storedToken = localStorage.getItem('access_token');
if (storedToken) {
  console.log('Found stored token, setting it');
  api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
}

// Add auth token to requests
api.interceptors.request.use((config) => {
  console.log('Making request to:', config.url);
  console.log('Authorization header:', config.headers.Authorization ? 'Present' : 'Missing');
  
  // Always try to get fresh token from localStorage as backup
  if (!config.headers.Authorization) {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Added token from localStorage');
    }
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.status, error.response?.data);
    if (error.response?.status === 401) {
      console.log('Got 401, but NOT redirecting to allow debugging');
      // Don't auto-redirect for now to debug
      // setAuthToken(null);
      // localStorage.removeItem('user');
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
