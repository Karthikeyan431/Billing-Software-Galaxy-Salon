import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../layouts/DashboardLayout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { productService } from '../services/dataService';
import { formatCurrency, cn } from '../utils/helpers';
import toast from 'react-hot-toast';

const CATEGORIES = ['Shampoo', 'Conditioner', 'Serum', 'Cream', 'Gel', 'Color', 'Tools', 'Other'];

export default function ProductsPage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ productName: '', barcode: '', price: '', stock: '', category: 'Shampoo', supplier: '', lowStockThreshold: 5 });

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (user) loadData();
  }, [user, authLoading]);

  const loadData = async () => {
    try {
      const { data } = await productService.getAll({ search, limit: 200 });
      setProducts(data.products);
    } catch (err) {
      console.error('Failed to load products:', err);
      toast.error(err.response?.data?.error || 'Failed to load products');
    } finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    if (!form.productName || !form.price) return toast.error('Name and price required');
    try {
      if (editing) {
        await productService.update(editing._id, form);
        toast.success('Product updated');
      } else {
        await productService.create(form);
        toast.success('Product created');
      }
      setShowModal(false);
      setEditing(null);
      setForm({ productName: '', barcode: '', price: '', stock: '', category: 'Shampoo', supplier: '', lowStockThreshold: 5 });
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({ productName: p.productName, barcode: p.barcode || '', price: p.price, stock: p.stock, category: p.category, supplier: p.supplier || '', lowStockThreshold: p.lowStockThreshold || 5 });
    setShowModal(true);
  };

  if (authLoading || !user) return <LoadingSpinner />;

  const filtered = products.filter(p =>
    !search || p.productName.toLowerCase().includes(search.toLowerCase()) || (p.barcode && p.barcode.includes(search))
  );

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📦 Products</h1>
        {isAdmin && <Button onClick={() => { setEditing(null); setForm({ productName: '', barcode: '', price: '', stock: '', category: 'Shampoo', supplier: '', lowStockThreshold: 5 }); setShowModal(true); }}>+ Add Product</Button>}
      </div>

      <div className="flex gap-2 mb-4">
        <Input placeholder="Search products or barcode..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-3 font-medium">Product</th>
                <th className="pb-3 font-medium">Barcode</th>
                <th className="pb-3 font-medium">Category</th>
                <th className="pb-3 font-medium">Price</th>
                <th className="pb-3 font-medium">Stock</th>
                <th className="pb-3 font-medium">Supplier</th>
                {isAdmin && <th className="pb-3 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p._id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3 font-medium">{p.productName}</td>
                  <td className="py-3 text-xs text-gray-500 font-mono">{p.barcode || '-'}</td>
                  <td className="py-3"><span className="badge bg-gray-100 text-gray-600">{p.category}</span></td>
                  <td className="py-3 font-medium">{formatCurrency(p.price)}</td>
                  <td className="py-3">
                    <span className={cn('badge', p.stock <= (p.lowStockThreshold || 5) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700')}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="py-3 text-gray-500">{p.supplier || '-'}</td>
                  {isAdmin && (
                    <td className="py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>Edit</Button>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={async () => {
                          if (!window.confirm('Delete?')) return;
                          try { await productService.delete(p._id); toast.success('Deleted'); loadData(); } catch {}
                        }}>Delete</Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-gray-400">No products found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Product' : 'Add Product'}>
        <div className="space-y-3">
          <Input label="Product Name" value={form.productName} onChange={(e) => setForm(f => ({ ...f, productName: e.target.value }))} required />
          <Input label="Barcode" value={form.barcode} onChange={(e) => setForm(f => ({ ...f, barcode: e.target.value }))} />
          <Select label="Category" value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Price (₹)" type="number" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))} required />
            <Input label="Stock" type="number" value={form.stock} onChange={(e) => setForm(f => ({ ...f, stock: e.target.value }))} required />
          </div>
          <Input label="Supplier" value={form.supplier} onChange={(e) => setForm(f => ({ ...f, supplier: e.target.value }))} />
          <Input label="Low Stock Threshold" type="number" value={form.lowStockThreshold} onChange={(e) => setForm(f => ({ ...f, lowStockThreshold: e.target.value }))} />
          <Button onClick={handleSubmit} className="w-full">{editing ? 'Update' : 'Add'} Product</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
