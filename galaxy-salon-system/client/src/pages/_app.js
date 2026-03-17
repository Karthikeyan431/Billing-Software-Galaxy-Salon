import '../styles/globals.css';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../hooks/useAuth';
import ErrorBoundary from '../components/ErrorBoundary';
import Script from 'next/script';

export default function App({ Component, pageProps }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
        <Component {...pageProps} />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { borderRadius: '10px', background: '#333', color: '#fff', fontSize: '14px' },
          }}
        />
      </AuthProvider>
    </ErrorBoundary>
  );
}
