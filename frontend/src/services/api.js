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
  pay: (id, data) => api.post(`/subscriptions/${id}/pay`, data),
  updateStatus: (id, status) => api.patch(`/subscriptions/${id}/status`, { status }),
};

export const dashboardAPI = {
  getMonthlyExpenses: () => api.get('/dashboard/monthly-expenses'),
  getUpcoming: (days = 7) => api.get(`/dashboard/upcoming?days=${days}`),
  getPaymentStats: () => api.get('/dashboard/payment-stats'),
};

export const paymentAPI = {
  getHistory: (params = {}) => {
    const { subscriptionId, startDate, endDate, page = 1, limit = 20 } = params;
    let queryString = `?page=${page}&limit=${limit}`;
    if (subscriptionId) queryString += `&subscription_id=${subscriptionId}`;
    if (startDate) queryString += `&start_date=${startDate}`;
    if (endDate) queryString += `&end_date=${endDate}`;
    return api.get(`/payments${queryString}`);
  },
};

export default api;
