import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('millpro_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 → redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('millpro_token');
      localStorage.removeItem('millpro_user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──
export const authAPI = {
  lookup:       (code) => api.get('/auth/lookup', { params: { code } }),
  companyUsers: (id)   => api.get(`/auth/company-users/${id}`),
  register:     (data) => api.post('/auth/register', data),
  login:        (data) => api.post('/auth/login', data),
  me:           ()     => api.get('/auth/me'),
};

// ── Company ──
export const companyAPI = {
  get: () => api.get('/company'),
  update: (data) => api.put('/company', data),
};

// ── Users ──
export const usersAPI = {
  list: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// ── Employees ──
export const employeesAPI = {
  list: () => api.get('/employees'),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  statement: (id, from, to) => api.get(`/employees/${id}/statement`, { params: { from, to } }),
};

// ── Task Types ──
export const taskTypesAPI = {
  list: () => api.get('/task-types'),
  create: (data) => api.post('/task-types', data),
  update: (id, data) => api.put(`/task-types/${id}`, data),
  delete: (id) => api.delete(`/task-types/${id}`),
};

// ── Work Logs ──
export const workLogsAPI = {
  list: (params) => api.get('/work-logs', { params }),
  create: (data) => api.post('/work-logs', data),
  delete: (id) => api.delete(`/work-logs/${id}`),
};

// ── Payments ──
export const paymentsAPI = {
  list: (params) => api.get('/payments', { params }),
  create: (data) => api.post('/payments', data),
  delete: (id) => api.delete(`/payments/${id}`),
};

// ── Production Batches ──
export const batchesAPI = {
  list: (params) => api.get('/batches', { params }),
  create: (data) => api.post('/batches', data),
  delete: (id) => api.delete(`/batches/${id}`),
};

// ── Purchases ──
export const purchasesAPI = {
  list: () => api.get('/purchases'),
  create: (data) => api.post('/purchases', data),
  delete: (id) => api.delete(`/purchases/${id}`),
};

// ── Expenses ──
export const expensesAPI = {
  list: () => api.get('/expenses'),
  create: (data) => api.post('/expenses', data),
  delete: (id) => api.delete(`/expenses/${id}`),
};

// ── Sales ──
export const salesAPI = {
  list: () => api.get('/sales'),
  create: (data) => api.post('/sales', data),
  delete: (id) => api.delete(`/sales/${id}`),
  receipt: (id) => api.get(`/sales/${id}/receipt`),
};

// ── Orders ──
export const ordersAPI = {
  list: () => api.get('/orders'),
  create: (data) => api.post('/orders', data),
  update: (id, data) => api.put(`/orders/${id}`, data),
  delete: (id) => api.delete(`/orders/${id}`),
};

// ── Dashboard ──
export const dashboardAPI = {
  get: () => api.get('/dashboard'),
};

// ── Finance ──
export const financeAPI = {
  get: (params) => api.get('/finance', { params }),
};

// ── Audit ──
export const auditAPI = {
  list: () => api.get('/audit'),
};

// ── Backup ──
export const backupAPI = {
  export: () => api.get('/backup/export'),
};

// ── Customers ──
export const customersAPI = {
  list: () => api.get('/customers'),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

// ── Stock Adjustments ──
export const stockAdjAPI = {
  list: () => api.get('/stock-adjustments'),
  create: (data) => api.post('/stock-adjustments', data),
};

// ── Inventory (computed) ──
export const inventoryAPI = {
  get: () => api.get('/inventory'),
};

// ── Pending Approvals ──
export const pendingAPI = {
  list:    ()       => api.get('/pending'),
  count:   ()       => api.get('/pending/count'),
  approve: (id, note) => api.put(`/pending/${id}/approve`, { note }),
  reject:  (id, note) => api.put(`/pending/${id}/reject`,  { note }),
};

// ── Reports / Analytics ──
export const reportsAPI = {
  monthly:   () => api.get('/reports/monthly'),
  customers: () => api.get('/reports/customers'),
  employees: () => api.get('/reports/employees'),
  expenses:  (params) => api.get('/reports/expenses', { params }),
};

export default api;
