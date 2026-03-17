import api from './api';

export const authService = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/profile'),
};

export const customerService = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  searchByPhone: (phone) => api.get(`/customers/phone/${phone}`),
  quickSearch: (query) => api.get(`/customers/quick-search/${encodeURIComponent(query)}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  getBillHistory: (id) => api.get(`/customers/${id}/bills`),
};

export const serviceService = {
  getAll: (params) => api.get('/services', { params }),
  create: (data) => api.post('/services', data),
  update: (id, data) => api.put(`/services/${id}`, data),
  delete: (id) => api.delete(`/services/${id}`),
};

export const productService = {
  getAll: (params) => api.get('/products', { params }),
  getByBarcode: (code) => api.get(`/products/barcode/${code}`),
  getLowStock: () => api.get('/products/low-stock'),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  updateStock: (id, data) => api.put(`/products/${id}/stock`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

export const billService = {
  getAll: (params) => api.get('/bills', { params }),
  getById: (id) => api.get(`/bills/${id}`),
  create: (data) => api.post('/bills', data),
  cancel: (id) => api.put(`/bills/${id}/cancel`),
  getDailySummary: () => api.get('/bills/daily-summary'),
};

export const employeeService = {
  getAll: (params) => api.get('/employees', { params }),
  getById: (id) => api.get(`/employees/${id}`),
  getPerformance: (id, params) => api.get(`/employees/${id}/performance`, { params }),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
};

export const appointmentService = {
  getAll: (params) => api.get('/appointments', { params }),
  getToday: () => api.get('/appointments/today'),
  create: (data) => api.post('/appointments', data),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  cancel: (id) => api.put(`/appointments/${id}/cancel`),
};

export const courseService = {
  getAll: () => api.get('/courses'),
  create: (data) => api.post('/courses', data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`),
};

export const studentService = {
  getAll: (params) => api.get('/students', { params }),
  getById: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  update: (id, data) => api.put(`/students/${id}`, data),
  addFeePayment: (id, data) => api.post(`/students/${id}/fee-payment`, data),
  markAttendance: (id, data) => api.post(`/students/${id}/attendance`, data),
  issueCertificate: (id) => api.post(`/students/${id}/certificate`),
  delete: (id) => api.delete(`/students/${id}`),
};

export const reportService = {
  getDashboard: () => api.get('/reports/dashboard'),
  getSalesReport: (params) => api.get('/reports/sales', { params }),
  getTopServices: (params) => api.get('/reports/top-services', { params }),
  getTopProducts: (params) => api.get('/reports/top-products', { params }),
  getPaymentMethods: (params) => api.get('/reports/payment-methods', { params }),
  getEmployeePerformance: (params) => api.get('/reports/employee-performance', { params }),
};

export const whatsappService = {
  sendReceipt: (data) => api.post('/whatsapp/send-receipt', data),
  sendReminder: (data) => api.post('/whatsapp/send-reminder', data),
  sendPromotion: (data) => api.post('/whatsapp/send-promotion', data),
};

export const paymentService = {
  createOrder: (data) => api.post('/payment/create-order', data),
  verify: (data) => api.post('/payment/verify', data),
};
