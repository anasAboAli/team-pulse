import { http } from './http';

const data = (p) => p.then((r) => r.data);
const clean = (params = {}) => Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null));

export const authApi = {
  login: (body) => data(http.post('/auth/login', body)),
  logout: () => http.post('/auth/logout'),
  me: () => data(http.get('/auth/me')),
  changePassword: (body) => data(http.put('/auth/password', body)),
};

export const profileApi = {
  get: () => data(http.get('/profile')),
  update: (body) => data(http.put('/profile', body)),
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append('image', file);
    return data(http.post('/profile/avatar', form));
  },
  removeAvatar: () => data(http.delete('/profile/avatar')),
};

export const companyApi = {
  public: () => data(http.get('/company/public')),
  get: () => data(http.get('/company')),
  update: (body) => data(http.put('/company', body)),
  uploadLogo: (file) => {
    const form = new FormData();
    form.append('image', file);
    return data(http.post('/company/logo', form));
  },
};

export const departmentsApi = {
  list: () => data(http.get('/departments')),
  get: (id) => data(http.get(`/departments/${id}`)),
  create: (body) => data(http.post('/departments', body)),
  update: (id, body) => data(http.put(`/departments/${id}`, body)),
  setManager: (id, managerId) => data(http.put(`/departments/${id}/manager`, { manager_id: managerId })),
  remove: (id) => http.delete(`/departments/${id}`),
};

export const usersApi = {
  list: (params) => data(http.get('/users', { params: clean(params) })),
  options: (params) => data(http.get('/users/options', { params: clean(params) })),
  get: (id) => data(http.get(`/users/${id}`)),
  create: (body) => data(http.post('/users', body)),
  update: (id, body) => data(http.put(`/users/${id}`, body)),
  setStatus: (id, isActive) => data(http.patch(`/users/${id}/status`, { is_active: isActive })),
  transfer: (id, departmentId) => data(http.patch(`/users/${id}/department`, { department_id: departmentId })),
  resetPassword: (id) => data(http.post(`/users/${id}/reset-password`)),
  remove: (id) => http.delete(`/users/${id}`),
};

export const tasksApi = {
  list: (params) => data(http.get('/tasks', { params: clean(params) })),
  get: (id) => data(http.get(`/tasks/${id}`)),
  create: (body) => data(http.post('/tasks', body)),
  update: (id, body) => data(http.put(`/tasks/${id}`, body)),
  setStatus: (id, status, comment) => data(http.patch(`/tasks/${id}/status`, { status, comment })),
  remove: (id) => http.delete(`/tasks/${id}`),
  upload: (id, files, onProgress) => {
    const form = new FormData();
    for (const f of files) form.append('files', f);
    return data(
      http.post(`/tasks/${id}/attachments`, form, {
        onUploadProgress: (e) => onProgress?.(e.total ? Math.round((e.loaded / e.total) * 100) : 0),
      }),
    );
  },
  comments: (id) => data(http.get(`/tasks/${id}/comments`)),
  addComment: (id, body) => data(http.post(`/tasks/${id}/comments`, { body })),
};

export const attachmentsApi = {
  download: (id) => http.get(`/attachments/${id}/download`, { responseType: 'blob' }),
  remove: (id) => http.delete(`/attachments/${id}`),
};

export const evaluationsApi = {
  list: (params) => data(http.get('/evaluations', { params: clean(params) })),
  get: (id) => data(http.get(`/evaluations/${id}`)),
  create: (body) => data(http.post('/evaluations', body)),
  update: (id, body) => data(http.put(`/evaluations/${id}`, body)),
  remove: (id) => http.delete(`/evaluations/${id}`),
};

export const criteriaApi = {
  list: () => data(http.get('/evaluation-criteria')),
  create: (body) => data(http.post('/evaluation-criteria', body)),
  update: (id, body) => data(http.put(`/evaluation-criteria/${id}`, body)),
  remove: (id) => http.delete(`/evaluation-criteria/${id}`),
};

export const dashboardApi = {
  admin: () => data(http.get('/dashboard/admin')),
  manager: () => data(http.get('/dashboard/manager')),
  employee: () => data(http.get('/dashboard/employee')),
};

export const notificationsApi = {
  list: (params) => data(http.get('/notifications', { params: clean(params) })),
  unreadCount: () => data(http.get('/notifications/unread-count')),
  markRead: (id) => http.patch(`/notifications/${id}/read`),
  markAllRead: () => http.patch('/notifications/read-all'),
  remove: (id) => http.delete(`/notifications/${id}`),
};

export const activityApi = {
  list: (params) => data(http.get('/activity', { params: clean(params) })),
};

export const reportsApi = {
  download: (name) => http.get(`/reports/${name}.csv`, { responseType: 'blob' }),
};

/** حفظ Blob كملف */
export function saveBlob(response, fallbackName) {
  const disposition = response.headers['content-disposition'] || '';
  const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i);
  const name = match ? decodeURIComponent(match[1] || match[2]) : fallbackName;
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
