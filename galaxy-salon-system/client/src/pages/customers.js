import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../layouts/DashboardLayout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { customerService } from '../services/dataService';
import { formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function CustomersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (user) loadCustomers();
  }, [user, authLoading, page]);

  const loadCustomers = async () => {
    try {
      const { data } = await customerService.getAll({ search, page, limit: 20 });
      setCustomers(data.customers);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to load customers:', err);
      toast.error(err.response?.data?.error || 'Failed to load customers');
    } finally { setLoading(false); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadCustomers();
  };

  const handleSubmit = async () => {
    if (!form.name || !form.phone) return toast.error('Name and phone required');
    try {
      if (editing) {
        await customerService.update(editing._id, form);
        toast.success('Customer updated');
      } else {
        await customerService.create(form);
        toast.success('Customer created');
      }
      setShowModal(false);
      setEditing(null);
      setForm({ name: '', phone: '', email: '' });
      loadCustomers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone, email: c.email || '' });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this customer?')) return;
    try {
      await customerService.delete(id);
      toast.success('Customer deleted');
      loadCustomers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  if (authLoading || !user) return <LoadingSpinner />;

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">👥 Customers</h1>
        <Button onClick={() => { setEditing(null); setForm({ name: '', phone: '', email: '' }); setShowModal(true); }}>+ Add Customer</Button>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <Input placeholder="Search by name or phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
        <Button type="submit">Search</Button>
      </form>

      {loading ? <LoadingSpinner /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Phone</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Loyalty Points</th>
                <th className="pb-3 font-medium">Visits</th>
                <th className="pb-3 font-medium">Joined</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c._id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3 font-medium">{c.name}</td>
                  <td className="py-3">{c.phone}</td>
                  <td className="py-3 text-gray-500">{c.email || '-'}</td>
                  <td className="py-3"><span className="badge bg-yellow-100 text-yellow-800">🎯 {c.loyaltyPoints}</span></td>
                  <td className="py-3">{c.visitHistory?.length || 0}</td>
                  <td className="py-3 text-gray-500">{formatDate(c.createdAt)}</td>
                  <td className="py-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(c)}>Edit</Button>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDelete(c._id)}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-gray-400">No customers found</td></tr>}
            </tbody>
          </table>
          {total > 20 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-sm text-gray-500 py-1">Page {page}</span>
              <Button size="sm" variant="secondary" disabled={customers.length < 20} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Customer' : 'Add Customer'}>
        <div className="space-y-3">
          <Input label="Name" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} required />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
          <Button onClick={handleSubmit} className="w-full">{editing ? 'Update' : 'Add'} Customer</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
