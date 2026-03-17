import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../layouts/DashboardLayout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { serviceService } from '../services/dataService';
import { formatCurrency } from '../utils/helpers';
import toast from 'react-hot-toast';

const CATEGORIES = ['Hair', 'Skin', 'Facial', 'Makeup', 'Nail', 'Spa', 'Other'];

export default function ServicesPage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ serviceName: '', duration: '', price: '', category: 'Hair' });
  const [filterCat, setFilterCat] = useState('');

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (user) loadData();
  }, [user, authLoading]);

  const loadData = async () => {
    try {
      const { data } = await serviceService.getAll();
      setServices(data.services);
    } catch (err) {
      console.error('Failed to load services:', err);
      toast.error(err.response?.data?.error || 'Failed to load services');
    } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.serviceName || !form.price || !form.duration) return toast.error('All fields required');
    try {
      if (editing) {
        await serviceService.update(editing._id, form);
        toast.success('Service updated');
      } else {
        await serviceService.create(form);
        toast.success('Service created');
      }
      setShowModal(false);
      setEditing(null);
      setForm({ serviceName: '', duration: '', price: '', category: 'Hair' });
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const openEdit = (s) => {
    setEditing(s);
    setForm({ serviceName: s.serviceName, duration: s.duration, price: s.price, category: s.category });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this service?')) return;
    try {
      await serviceService.delete(id);
      toast.success('Deleted');
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  if (authLoading || !user) return <LoadingSpinner />;

  const filtered = services.filter(s => !filterCat || s.category === filterCat);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">✂️ Services</h1>
        {isAdmin && <Button onClick={() => { setEditing(null); setForm({ serviceName: '', duration: '', price: '', category: 'Hair' }); setShowModal(true); }}>+ Add Service</Button>}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setFilterCat('')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!filterCat ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}>All</button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setFilterCat(c)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filterCat === c ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}>{c}</button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(s => (
            <div key={s._id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{s.serviceName}</h3>
                  <span className="badge bg-gray-100 text-gray-600 mt-1">{s.category}</span>
                </div>
                <span className="text-lg font-bold text-primary-700">{formatCurrency(s.price)}</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">⏱ {s.duration} min</p>
              {isAdmin && (
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(s)}>Edit</Button>
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDelete(s._id)}>Delete</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Service' : 'Add Service'}>
        <div className="space-y-3">
          <Input label="Service Name" value={form.serviceName} onChange={(e) => setForm(f => ({ ...f, serviceName: e.target.value }))} required />
          <Select label="Category" value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input label="Duration (minutes)" type="number" value={form.duration} onChange={(e) => setForm(f => ({ ...f, duration: e.target.value }))} required />
          <Input label="Price (₹)" type="number" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))} required />
          <Button onClick={handleSubmit} className="w-full">{editing ? 'Update' : 'Add'} Service</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
