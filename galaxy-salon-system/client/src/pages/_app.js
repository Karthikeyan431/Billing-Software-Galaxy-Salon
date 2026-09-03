import '../styles/globals.css';
import Head from 'next/head';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../hooks/useAuth';
import ErrorBoundary from '../components/ErrorBoundary';
import PwaProvider from '../components/pwa/PwaProvider';
import Script from 'next/script';

export default function App({ Component, pageProps }) {
  return (
    <ErrorBoundary>
      <Head>
        {/* viewport-fit=cover lets the page paint under the notch and home indicator, which
            is what makes the install banner's safe-area padding line up on iPhones. */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>Galaxy Salon | Unisex Saloon &amp; Beauty Academy</title>
        <meta
          name="description"
          content="Billing, appointments, inventory and reports for Galaxy Unisex Saloon and Beauty Academy. Works offline and installs like an app."
        />
      </Head>
      <AuthProvider>
        {/* PwaProvider needs no auth, but it sits inside AuthProvider so the install banner
            and update toast render above the page content rather than beside it. */}
        <PwaProvider>
          <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
          <Component {...pageProps} />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: { borderRadius: '10px', background: '#333', color: '#fff', fontSize: '14px' },
            }}
          />
        </PwaProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
