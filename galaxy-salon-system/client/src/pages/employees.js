import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../layouts/DashboardLayout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { employeeService } from '../services/dataService';
import { formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';

const ROLES = ['Hair Stylist', 'Beautician', 'Nail Artist', 'Therapist', 'Receptionist', 'Manager'];

export default function EmployeesPage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', role: 'Hair Stylist', phone: '', email: '', commissionRate: 10, salary: '' });
  const [performance, setPerformance] = useState({});

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (user) loadData();
  }, [user, authLoading]);

  const loadData = async () => {
    try {
      const { data } = await employeeService.getAll();
      setEmployees(data.employees);
      // Load performance for each
      const perf = {};
      for (const emp of data.employees) {
        try {
          const { data: p } = await employeeService.getPerformance(emp._id);
          perf[emp._id] = p;
        } catch (err) {
          console.error(`Failed to load performance for employee ${emp._id}:`, err);
        }
      }
      setPerformance(perf);
    } catch {} finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.phone) return toast.error('Name and phone required');
    try {
      if (editing) {
        await employeeService.update(editing._id, form);
        toast.success('Updated');
      } else {
        await employeeService.create(form);
        toast.success('Created');
      }
      setShowModal(false);
      setEditing(null);
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  if (authLoading || !user) return <LoadingSpinner />;

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">👨‍💼 Employees</h1>
        {isAdmin && <Button onClick={() => { setEditing(null); setForm({ name: '', role: 'Hair Stylist', phone: '', email: '', commissionRate: 10, salary: '' }); setShowModal(true); }}>+ Add Employee</Button>}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map(emp => (
            <div key={emp._id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{emp.name}</h3>
                  <span className="badge bg-purple-100 text-purple-700">{emp.role}</span>
                </div>
                <span className={`badge ${emp.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {emp.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <p>📞 {emp.phone}</p>
                <p>💰 Commission: {emp.commissionRate}%</p>
                {emp.salary > 0 && <p>💵 Salary: {formatCurrency(emp.salary)}</p>}
              </div>
              {performance[emp._id] && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-500 mb-1">Performance</p>
                  <div className="flex justify-between text-sm">
                    <span>Services: {performance[emp._id].serviceCount}</span>
                    <span className="font-medium text-green-600">{formatCurrency(performance[emp._id].totalRevenue)}</span>
                  </div>
                  <p className="text-xs text-primary-600 mt-1">Commission earned: {formatCurrency(performance[emp._id].commissionEarned)}</p>
                </div>
              )}
              {isAdmin && (
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="secondary" onClick={() => { setEditing(emp); setForm({ name: emp.name, role: emp.role, phone: emp.phone, email: emp.email || '', commissionRate: emp.commissionRate, salary: emp.salary || '' }); setShowModal(true); }}>Edit</Button>
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={async () => {
                    if (!window.confirm('Delete?')) return;
                    try { await employeeService.delete(emp._id); toast.success('Deleted'); loadData(); } catch {}
                  }}>Delete</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Employee' : 'Add Employee'}>
        <div className="space-y-3">
          <Input label="Name" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
          <Select label="Role" value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}>
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
          </Select>
          <Input label="Phone" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} required />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Commission %" type="number" value={form.commissionRate} onChange={(e) => setForm(f => ({ ...f, commissionRate: e.target.value }))} />
            <Input label="Salary (₹)" type="number" value={form.salary} onChange={(e) => setForm(f => ({ ...f, salary: e.target.value }))} />
          </div>
          <Button onClick={handleSubmit} className="w-full">{editing ? 'Update' : 'Add'} Employee</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
