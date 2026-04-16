import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const subscriptionAPI = {
  getAll: () => api.get('/subscriptions'),
  getById: (id) => api.get(`/subscriptions/${id}`),
  create: (data) => api.post('/subscriptions', data),
  update: (id, data) => api.put(`/subscriptions/${id}`, data),
  delete: (id) => api.delete(`/subscriptions/${id}`),
};

export const dashboardAPI = {
  getMonthlyExpenses: () => api.get('/dashboard/monthly-expenses'),
  getUpcoming: (days = 7) => api.get(`/dashboard/upcoming?days=${days}`),
};

export default api;
