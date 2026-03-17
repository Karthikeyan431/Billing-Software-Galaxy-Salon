import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../layouts/DashboardLayout';
import { StatCard } from '../components/ui/StatCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { reportService } from '../services/dataService';
import { formatCurrency } from '../utils/helpers';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (user) {
      reportService.getDashboard()
        .then(({ data }) => setStats(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  if (authLoading || !user) return <LoadingSpinner />;

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back, {user.name}!</p>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : stats ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
            <StatCard title="Today's Revenue" value={formatCurrency(stats.todayRevenue || 0)} icon="💰" color="green" />
            <StatCard title="Today's Bills" value={stats.todayBillCount || 0} icon="🧾" color="primary" />
            <StatCard title="Monthly Revenue" value={formatCurrency(stats.monthRevenue || 0)} icon="📈" color="purple" />
            <StatCard title="Monthly Bills" value={stats.monthBillCount || 0} icon="📋" color="blue" />
            <StatCard title="Today's Appointments" value={stats.todayAppointments || 0} icon="📅" color="orange" />
            <StatCard title="Low Stock Alerts" value={stats.lowStockCount || 0} icon="⚠️" color="red" />
            <StatCard title="Total Customers" value={stats.totalCustomers || 0} icon="👥" color="primary" />
            <StatCard title="Active Staff" value={stats.activeEmployees || 0} icon="👨‍💼" color="green" />
          </div>

          {/* Quick Actions */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Actions</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'New Bill', path: '/pos', icon: '🧾', color: 'bg-green-50 hover:bg-green-100 text-green-700' },
                { label: 'New Appointment', path: '/appointments', icon: '📅', color: 'bg-blue-50 hover:bg-blue-100 text-blue-700' },
                { label: 'Add Customer', path: '/customers', icon: '👥', color: 'bg-purple-50 hover:bg-purple-100 text-purple-700' },
                { label: 'View Reports', path: '/reports', icon: '📈', color: 'bg-orange-50 hover:bg-orange-100 text-orange-700' },
              ].map(action => (
                <button
                  key={action.path}
                  onClick={() => router.push(action.path)}
                  className={`${action.color} p-4 rounded-xl text-center transition-colors`}
                >
                  <span className="text-2xl block mb-1">{action.icon}</span>
                  <span className="text-sm font-medium">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <p className="text-gray-500">Failed to load dashboard data.</p>
      )}
    </DashboardLayout>
  );
}
