import api from './config';

export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  changePassword: async (oldPassword, newPassword) => {
    const response = await api.post('/auth/change-password', null, {
      params: { old_password: oldPassword, new_password: newPassword },
    });
    return response.data;
  },
};

export const studentsAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/students', { params });
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/students/${id}`);
    return response.data;
  },
  
  getMyProfile: async () => {
    const response = await api.get('/students/me/profile');
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/students', data);
    return response.data;
  },
  
  update: async (id, data) => {
    const response = await api.patch(`/students/${id}`, data);
    return response.data;
  },
};

export const groupsAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/groups', { params });
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/groups/${id}`);
    return response.data;
  },
  
  getStudents: async (id) => {
    const response = await api.get(`/groups/${id}/students`);
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/groups', data);
    return response.data;
  },
  
  update: async (id, data) => {
    const response = await api.patch(`/groups/${id}`, data);
    return response.data;
  },
  
  delete: async (id) => {
    await api.delete(`/groups/${id}`);
  },
};

export const subjectsAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/subjects', { params });
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/subjects/${id}`);
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/subjects', data);
    return response.data;
  },
  
  update: async (id, data) => {
    const response = await api.patch(`/subjects/${id}`, data);
    return response.data;
  },
  
  delete: async (id) => {
    await api.delete(`/subjects/${id}`);
  },
};

export const teachersAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/teachers', { params });
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/teachers/${id}`);
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/teachers', data);
    return response.data;
  },
  
  update: async (id, data) => {
    const response = await api.patch(`/teachers/${id}`, data);
    return response.data;
  },
  
  delete: async (id) => {
    await api.delete(`/teachers/${id}`);
  },
};

export const scheduleAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/schedule', { params });
    return response.data;
  },
  
  getMy: async (params = {}) => {
    const response = await api.get('/schedule/my', { params });
    return response.data;
  },
  
  getByGroup: async (groupId, params = {}) => {
    const response = await api.get(`/schedule/group/${groupId}`, { params });
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/schedule', data);
    return response.data;
  },
  
  update: async (id, data) => {
    const response = await api.patch(`/schedule/${id}`, data);
    return response.data;
  },
  
  delete: async (id) => {
    await api.delete(`/schedule/${id}`);
  },
};

export const attendanceAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/attendance', { params });
    return response.data;
  },
  
  getMy: async (params = {}) => {
    const response = await api.get('/attendance/my', { params });
    return response.data;
  },
  
  getStudentStats: async (studentId, params = {}) => {
    const response = await api.get(`/attendance/stats/student/${studentId}`, { params });
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/attendance', data);
    return response.data;
  },
  
  createBulk: async (data) => {
    const response = await api.post('/attendance/bulk', data);
    return response.data;
  },
  
  update: async (id, data) => {
    const response = await api.patch(`/attendance/${id}`, data);
    return response.data;
  },
};

export const gradesAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/grades', { params });
    return response.data;
  },
  
  getMy: async (params = {}) => {
    const response = await api.get('/grades/my', { params });
    return response.data;
  },
  
  getStudentStats: async (studentId, params = {}) => {
    const response = await api.get(`/grades/stats/student/${studentId}`, { params });
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/grades', data);
    return response.data;
  },
  
  update: async (id, data) => {
    const response = await api.patch(`/grades/${id}`, data);
    return response.data;
  },
};

export const disciplinaryAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/disciplinary', { params });
    return response.data;
  },
  
  getMy: async () => {
    const response = await api.get('/disciplinary/my');
    return response.data;
  },
  
  getStudentStats: async (studentId) => {
    const response = await api.get(`/disciplinary/stats/student/${studentId}`);
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/disciplinary', data);
    return response.data;
  },
  
  resolve: async (id, notes) => {
    const response = await api.post(`/disciplinary/${id}/resolve`, null, {
      params: { resolution_notes: notes },
    });
    return response.data;
  },
};

export const assignmentsAPI = {
  getAll: async (params = {}) => {
    const response = await api.get('/assignments', { params });
    return response.data;
  },
  
  getMy: async () => {
    const response = await api.get('/assignments/my');
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/assignments/${id}`);
    return response.data;
  },
  
  create: async (data) => {
    const response = await api.post('/assignments', data);
    return response.data;
  },
  
  update: async (id, data) => {
    const response = await api.patch(`/assignments/${id}`, data);
    return response.data;
  },
  
  delete: async (id) => {
    await api.delete(`/assignments/${id}`);
  },
  
  submit: async (id, data) => {
    const response = await api.post(`/assignments/${id}/submit`, data);
    return response.data;
  },
};

export const analyticsAPI = {
  getDashboard: async () => {
    const response = await api.get('/analytics/dashboard');
    return response.data;
  },
  
  getGroupAnalytics: async (groupId, params = {}) => {
    const response = await api.get(`/analytics/groups/${groupId}`, { params });
    return response.data;
  },
  
  getStudentAnalytics: async (studentId, params = {}) => {
    const response = await api.get(`/analytics/students/${studentId}`, { params });
    return response.data;
  },
  
  getAttendanceByDate: async (params = {}) => {
    const response = await api.get('/analytics/attendance/by-date', { params });
    return response.data;
  },
  
  getGradesDistribution: async (params = {}) => {
    const response = await api.get('/analytics/grades/distribution', { params });
    return response.data;
  },
};

