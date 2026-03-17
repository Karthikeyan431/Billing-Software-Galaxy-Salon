import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../layouts/DashboardLayout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { appointmentService, customerService, serviceService, employeeService } from '../services/dataService';
import { formatDate, cn } from '../utils/helpers';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  'in-progress': 'bg-yellow-100 text-yellow-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',
  'no-show': 'bg-orange-100 text-orange-700',
};

export default function AppointmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));

  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ customer: '', service: '', employee: '', date: '', time: '', notes: '' });

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (user) {
      Promise.all([
        serviceService.getAll(),
        employeeService.getAll({ active: true }),
        customerService.getAll({ limit: 200 }),
      ]).then(([sRes, eRes, cRes]) => {
        setServices(sRes.data.services);
        setEmployees(eRes.data.employees);
        setCustomers(cRes.data.customers);
      });
      loadAppointments();
    }
  }, [user, authLoading]);

  useEffect(() => { if (user) loadAppointments(); }, [dateFilter]);

  const loadAppointments = async () => {
    try {
      const { data } = await appointmentService.getAll({ date: dateFilter });
      setAppointments(data.appointments);
    } catch (err) {
      console.error('Failed to load appointments:', err);
      toast.error(err.response?.data?.error || 'Failed to load appointments');
    } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.customer || !form.service || !form.date || !form.time) return toast.error('Fill all required fields');
    try {
      const customer = customers.find(c => c._id === form.customer);
      const service = services.find(s => s._id === form.service);
      const employee = employees.find(e => e._id === form.employee);

      await appointmentService.create({
        ...form,
        customerName: customer?.name,
        customerPhone: customer?.phone,
        serviceName: service?.serviceName,
        employeeName: employee?.name,
        duration: service?.duration,
      });
      toast.success('Appointment created');
      setShowModal(false);
      setForm({ customer: '', service: '', employee: '', date: '', time: '', notes: '' });
      loadAppointments();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const updateStatus = async (id, status) => {
    try {
      if (status === 'cancelled') {
        await appointmentService.cancel(id);
      } else {
        await appointmentService.update(id, { status });
      }
      toast.success('Status updated');
      loadAppointments();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  if (authLoading || !user) return <LoadingSpinner />;

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📅 Appointments</h1>
        <Button onClick={() => { setForm({ customer: '', service: '', employee: '', date: dateFilter, time: '', notes: '' }); setShowModal(true); }}>+ New Appointment</Button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="w-48" />
        <span className="text-sm text-gray-500">{appointments.length} appointments</span>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="space-y-3">
          {appointments.length === 0 && <p className="text-center text-gray-400 py-8">No appointments for this date</p>}
          {appointments.map(apt => (
            <div key={apt._id} className="card flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-center bg-primary-50 rounded-lg px-3 py-2">
                  <p className="text-lg font-bold text-primary-700">{apt.time}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{apt.customerName || apt.customer?.name}</p>
                  <p className="text-sm text-gray-500">{apt.serviceName || apt.service?.serviceName}</p>
                  {(apt.employeeName || apt.employee?.name) && (
                    <p className="text-xs text-gray-400">with {apt.employeeName || apt.employee?.name}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn('badge', STATUS_COLORS[apt.status])}>{apt.status}</span>
                <Select
                  value={apt.status}
                  onChange={(e) => updateStatus(apt._id, e.target.value)}
                  className="!py-1 !text-xs w-32"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in-progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no-show">No Show</option>
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Appointment" size="md">
        <div className="space-y-3">
          <Select label="Customer *" value={form.customer} onChange={(e) => setForm(f => ({ ...f, customer: e.target.value }))}>
            <option value="">Select Customer</option>
            {customers.map(c => <option key={c._id} value={c._id}>{c.name} - {c.phone}</option>)}
          </Select>
          <Select label="Service *" value={form.service} onChange={(e) => setForm(f => ({ ...f, service: e.target.value }))}>
            <option value="">Select Service</option>
            {services.map(s => <option key={s._id} value={s._id}>{s.serviceName} ({s.duration} min)</option>)}
          </Select>
          <Select label="Staff" value={form.employee} onChange={(e) => setForm(f => ({ ...f, employee: e.target.value }))}>
            <option value="">Select Staff</option>
            {employees.map(e => <option key={e._id} value={e._id}>{e.name} ({e.role})</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date *" type="date" value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} />
            <Input label="Time *" type="time" value={form.time} onChange={(e) => setForm(f => ({ ...f, time: e.target.value }))} />
          </div>
          <Input label="Notes" value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
          <Button onClick={handleSubmit} className="w-full">Create Appointment</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
