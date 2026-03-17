import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../layouts/DashboardLayout';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { StatCard } from '../components/ui/StatCard';
import { useAuth } from '../hooks/useAuth';
import { reportService } from '../services/dataService';
import { formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Title, Tooltip, Legend, Filler);

export default function ReportsPage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [dashboard, setDashboard] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [topServices, setTopServices] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState([]);
  const [empPerformance, setEmpPerformance] = useState([]);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (user) loadReports();
  }, [user, authLoading, period]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [dashRes, salesRes, svcRes, prodRes, payRes, empRes] = await Promise.all([
        reportService.getDashboard(),
        reportService.getSalesReport({ groupBy: period === 'week' ? 'day' : period === 'year' ? 'month' : 'day', period }),
        reportService.getTopServices({ limit: 8 }),
        reportService.getTopProducts({ limit: 8 }),
        reportService.getPaymentMethods(),
        reportService.getEmployeePerformance()
      ]);
      setDashboard(dashRes.data);
      setSalesData(salesRes.data?.data || []);
      setTopServices(svcRes.data?.data || []);
      setTopProducts(prodRes.data?.data || []);
      setPaymentBreakdown(payRes.data?.data || []);
      setEmpPerformance(empRes.data?.data || []);
    } catch (err) { toast.error('Failed to load reports'); } finally { setLoading(false); }
  };

  if (authLoading || !user) return <LoadingSpinner />;
  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  // Chart configs
  const salesChart = {
    labels: salesData.map(d => d._id || d.date || d.label),
    datasets: [{
      label: 'Revenue (₹)',
      data: salesData.map(d => d.totalRevenue || d.total || 0),
      backgroundColor: 'rgba(99, 102, 241, 0.2)',
      borderColor: 'rgba(99, 102, 241, 1)',
      borderWidth: 2,
      fill: true,
      tension: 0.4
    }]
  };

  const servicesChart = {
    labels: topServices.map(s => s.serviceName || s._id),
    datasets: [{
      label: 'Times Booked',
      data: topServices.map(s => s.count || s.totalCount || 0),
      backgroundColor: ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#a5b4fc', '#e0e7ff', '#c7d2fe'],
      borderRadius: 6
    }]
  };

  const productsChart = {
    labels: topProducts.map(p => p.productName || p._id),
    datasets: [{
      label: 'Units Sold',
      data: topProducts.map(p => p.count || p.totalCount || 0),
      backgroundColor: ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#d97706', '#b45309', '#92400e', '#78350f'],
      borderRadius: 6
    }]
  };

  const paymentColors = { cash: '#10b981', upi: '#6366f1', card: '#f59e0b', split: '#ef4444' };
  const paymentChart = {
    labels: paymentBreakdown.map(p => p._id?.charAt(0).toUpperCase() + p._id?.slice(1)),
    datasets: [{
      data: paymentBreakdown.map(p => p.total || p.count || 0),
      backgroundColor: paymentBreakdown.map(p => paymentColors[p._id] || '#9ca3af'),
      borderWidth: 0
    }]
  };

  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📊 Reports & Analytics</h1>
        <div className="flex gap-2 items-center">
          <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </Select>
          <Button variant="secondary" onClick={loadReports}>Refresh</Button>
        </div>
      </div>

      {/* Overview Cards */}
      {dashboard && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard title="Today's Revenue" value={formatCurrency(dashboard.todayRevenue || 0)} icon="💰" />
          <StatCard title="Today's Bills" value={dashboard.todayBillCount || 0} icon="🧾" />
          <StatCard title="Total Customers" value={dashboard.totalCustomers || 0} icon="👥" />
          <StatCard title="Low Stock Items" value={dashboard.lowStockCount || 0} icon="⚠️" />
        </div>
      )}

      {/* Sales Trend */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h2>
        <div className="h-72">
          {salesData.length > 0 ? (
            <Line data={salesChart} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: true } }, scales: { y: { beginAtZero: true, ticks: { callback: v => '₹' + v.toLocaleString() } } } }} />
          ) : <p className="text-gray-400 text-center pt-24">No sales data for this period</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Services */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Services</h2>
          <div className="h-64">
            {topServices.length > 0 ? (
              <Bar data={servicesChart} options={chartOptions} />
            ) : <p className="text-gray-400 text-center pt-24">No service data</p>}
          </div>
        </div>

        {/* Top Products */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h2>
          <div className="h-64">
            {topProducts.length > 0 ? (
              <Bar data={productsChart} options={chartOptions} />
            ) : <p className="text-gray-400 text-center pt-24">No product data</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Payment Breakdown */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h2>
          <div className="h-64 flex items-center justify-center">
            {paymentBreakdown.length > 0 ? (
              <Doughnut data={paymentChart} options={{ ...chartOptions, plugins: { legend: { display: true, position: 'bottom' } } }} />
            ) : <p className="text-gray-400">No payment data</p>}
          </div>
        </div>

        {/* Employee Performance */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Employee Performance</h2>
          {empPerformance.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {empPerformance.map((e, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{e.employeeName || e._id}</p>
                    <p className="text-xs text-gray-500">{e.totalBills || e.count || 0} bills</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-700">{formatCurrency(e.totalRevenue || e.total || 0)}</p>
                    {e.commission != null && <p className="text-xs text-green-600">Commission: {formatCurrency(e.commission)}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-400 text-center pt-24">No performance data</p>}
        </div>
      </div>
    </DashboardLayout>
  );
}
