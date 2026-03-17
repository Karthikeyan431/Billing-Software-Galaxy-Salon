import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../utils/helpers';

const menuItems = [
  { name: 'Dashboard', path: '/', icon: '📊' },
  { name: 'POS Billing', path: '/pos', icon: '🧾' },
  { name: 'Appointments', path: '/appointments', icon: '📅' },
  { name: 'Customers', path: '/customers', icon: '👥' },
  { name: 'Services', path: '/services', icon: '✂️' },
  { name: 'Products', path: '/products', icon: '📦' },
  { name: 'Inventory', path: '/inventory', icon: '🏪' },
  { name: 'Employees', path: '/employees', icon: '👨‍💼' },
  { name: 'Bills', path: '/bills', icon: '💰' },
  { name: 'Academy', path: '/academy', icon: '🎓' },
  { name: 'Reports', path: '/reports', icon: '📈' },
];

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-5 py-5 border-b">
            <h1 className="text-lg font-bold text-gray-900">✨ Galaxy Salon</h1>
            <p className="text-xs text-gray-500 mt-0.5">Unisex Saloon & Beauty Academy</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
            {menuItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <div
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors',
                    router.pathname === item.path
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.name}
                </div>
              </Link>
            ))}
          </nav>

          {/* User */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-bold">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <button onClick={logout} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600" title="Logout">
                🚪
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 lg:px-6">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div className="flex-1" />
          <span className="text-xs text-gray-400">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
