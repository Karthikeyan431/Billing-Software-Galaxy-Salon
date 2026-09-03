import api from './api';
import { CACHE_KEYS, cacheCollection, readCachedCollection } from '../lib/offlineDb';

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

// The service worker answers a catalogue GET from its own cache as an ordinary 200, so these
// marker headers are the only way the till can tell it is looking at an old price list.
const SW_CACHE_MARKER = 'x-galaxy-sw-cache';
const SW_CACHED_AT_MARKER = 'x-galaxy-sw-cached-at';

// axios 1.x returns an AxiosHeaders instance; guard the shape rather than assume either.
const readHeader = (headers, name) => {
  if (!headers) return null;
  if (typeof headers.get === 'function') return headers.get(name);
  return headers[name];
};

const isSwCacheHit = (res) => !!readHeader(res?.headers, SW_CACHE_MARKER);

// Written as an ISO string by the worker, which is what pos.js formats for the toast.
const swCachedAt = (res) => readHeader(res?.headers, SW_CACHED_AT_MARKER) || null;

// ISO strings sort chronologically, so the first is the oldest: a catalogue is only as
// fresh as its stalest part.
const oldest = (values) => values.filter(Boolean).sort()[0] || null;

export const offlineAwareService = {
  // Loads the POS catalogue exactly as the till used to (three parallel requests) but
  // mirrors every successful response into IndexedDB, so a till that loses connectivity
  // mid-shift can still be opened and sold from. Resolves with
  // { services, products, employees, fromCache, cachedAt } and only rejects when there is
  // neither a network response nor a usable cache.
  loadPosCatalogue: async () => {
    try {
      const [sRes, pRes, eRes] = await Promise.all([
        serviceService.getAll({ active: true }),
        productService.getAll({ limit: 200 }),
        employeeService.getAll({ active: true }),
      ]);

      const services = sRes.data.services || [];
      const products = pRes.data.products || [];
      const employees = eRes.data.employees || [];

      // A service-worker cache hit still arrives as a 200, so without this the till would
      // show hours-old prices with no offline warning AND re-stamp them with the current
      // time in IndexedDB, destroying the only record of how stale they are. If any of the
      // three came from the worker's cache, the whole load is treated as cached and nothing
      // is written back.
      if ([sRes, pRes, eRes].some(isSwCacheHit)) {
        let cachedAt = oldest([sRes, pRes, eRes].map(swCachedAt));
        if (!cachedAt) {
          // No stamp (an older worker, or an entry cached before stamping existed) — fall
          // back to whatever IndexedDB already recorded rather than claiming "unknown".
          try {
            const records = await Promise.all([
              readCachedCollection(CACHE_KEYS.SERVICES),
              readCachedCollection(CACHE_KEYS.PRODUCTS),
              readCachedCollection(CACHE_KEYS.EMPLOYEES),
            ]);
            cachedAt = oldest(records.map((record) => record?.cachedAt));
          } catch (cacheErr) {
            console.error('Failed to read cached POS catalogue timestamp:', cacheErr);
          }
        }
        return { services, products, employees, fromCache: true, cachedAt };
      }

      // Cache writes are best-effort: a full, blocked or private-mode IndexedDB must never
      // break a till that already has its data.
      try {
        await Promise.all([
          cacheCollection(CACHE_KEYS.SERVICES, services),
          cacheCollection(CACHE_KEYS.PRODUCTS, products),
          cacheCollection(CACHE_KEYS.EMPLOYEES, employees),
        ]);
      } catch (cacheErr) {
        console.error('Failed to cache POS catalogue:', cacheErr);
      }

      return { services, products, employees, fromCache: false, cachedAt: null };
    } catch (err) {
      let cachedServices = null;
      let cachedProducts = null;
      let cachedEmployees = null;
      try {
        [cachedServices, cachedProducts, cachedEmployees] = await Promise.all([
          readCachedCollection(CACHE_KEYS.SERVICES),
          readCachedCollection(CACHE_KEYS.PRODUCTS),
          readCachedCollection(CACHE_KEYS.EMPLOYEES),
        ]);
      } catch (cacheErr) {
        console.error('Failed to read cached POS catalogue:', cacheErr);
      }

      // Nothing cached (first run on this device) — surface the original network error so
      // the caller can show its normal failure state rather than an empty catalogue.
      if (!cachedServices && !cachedProducts && !cachedEmployees) throw err;

      const newest = cachedServices || cachedProducts || cachedEmployees;
      return {
        services: cachedServices?.items || [],
        products: cachedProducts?.items || [],
        employees: cachedEmployees?.items || [],
        fromCache: true,
        cachedAt: newest?.cachedAt || null,
      };
    }
  },
};
