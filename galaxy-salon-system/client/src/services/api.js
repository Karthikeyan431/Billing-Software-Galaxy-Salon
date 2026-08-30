import axios from 'axios';

// NEXT_PUBLIC_API_URL is inlined at BUILD time by Next.js. If it is not set in the Vercel
// project settings, the deployed frontend ships with the localhost fallback baked in and
// every request fails with a bare "Network Error".
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production'
    && /localhost|127\.0\.0\.1/.test(process.env.NEXT_PUBLIC_API_URL || '')) {
  console.error(
    '[config] NEXT_PUBLIC_API_URL points at localhost in a production build. ' +
    'Set it to your Render URL (https://<service>.onrender.com/api) and redeploy.'
  );
}

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  // A cold Render free instance takes ~50s to wake. Without a timeout the UI hangs
  // indefinitely; with one that is too short, the first request after idle always fails.
  timeout: 60000,
});

// Attach token on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Distinguish "server is asleep / unreachable" from a real auth failure, so a cold
    // start does not look like a mysterious blank error.
    if (!error.response) {
      error.friendlyMessage =
        error.code === 'ECONNABORTED'
          ? 'The server took too long to respond. It may be waking up — please try again.'
          : 'Cannot reach the server. Check your connection and try again.';
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
