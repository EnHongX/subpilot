import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401 && error.response.data?.needLogin) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (username, password) => 
    api.post('/auth/register', { username, password }),
  
  login: (username, password) => 
    api.post('/auth/login', { username, password }),
  
  logout: () => 
    api.post('/auth/logout'),
  
  getCurrentUser: () => 
    api.get('/auth/me'),
  
  updateProfile: (data) => 
    api.put('/auth/profile', data),
};

export const subscriptionAPI = {
  getAll: () => api.get('/subscriptions'),
  getById: (id) => api.get(`/subscriptions/${id}`),
  create: (data) => api.post('/subscriptions', data),
  update: (id, data) => api.put(`/subscriptions/${id}`, data),
  delete: (id) => api.delete(`/subscriptions/${id}`),
  pay: (id, data) => api.post(`/subscriptions/${id}/pay`, data),
  updateStatus: (id, status) => api.patch(`/subscriptions/${id}/status`, { status }),
  getPriceHistory: (id) => api.get(`/subscriptions/${id}/price-history`),
  getLatestPriceChange: (id) => api.get(`/subscriptions/${id}/latest-price-change`),
};

export const dashboardAPI = {
  getMonthlyExpenses: () => api.get('/dashboard/monthly-expenses'),
  getUpcoming: (days = 7) => api.get(`/dashboard/upcoming?days=${days}`),
  getPaymentStats: () => api.get('/dashboard/payment-stats'),
  getRecentPriceIncreases: (days = 30, limit = 20) => 
    api.get(`/dashboard/recent-price-increases?days=${days}&limit=${limit}`),
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

export const priceHistoryAPI = {
  getHistory: (params = {}) => {
    const { subscriptionId, startDate, endDate, page = 1, limit = 20 } = params;
    let queryString = `?page=${page}&limit=${limit}`;
    if (subscriptionId) queryString += `&subscription_id=${subscriptionId}`;
    if (startDate) queryString += `&start_date=${startDate}`;
    if (endDate) queryString += `&end_date=${endDate}`;
    return api.get(`/price-history${queryString}`);
  },
};

export default api;
