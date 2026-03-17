import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../layouts/DashboardLayout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { productService } from '../services/dataService';
import { formatCurrency, cn } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function InventoryPage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stockUpdates, setStockUpdates] = useState({});

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (user) loadData();
  }, [user, authLoading]);

  const loadData = async () => {
    try {
      const [allRes, lowRes] = await Promise.all([
        productService.getAll({ limit: 200 }),
        productService.getLowStock(),
      ]);
      setProducts(allRes.data.products);
      setLowStock(lowRes.data.products);
    } catch (err) {
      console.error('Failed to load inventory:', err);
      toast.error(err.response?.data?.error || 'Failed to load inventory');
    } finally { setLoading(false); }
  };

  const updateStock = async (productId, operation) => {
    const quantity = stockUpdates[productId];
    if (!quantity || quantity <= 0) return toast.error('Enter a valid quantity');
    try {
      await productService.updateStock(productId, { quantity: Number(quantity), operation });
      toast.success(`Stock ${operation === 'add' ? 'added' : 'reduced'}`);
      setStockUpdates(prev => ({ ...prev, [productId]: '' }));
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  if (authLoading || !user) return <LoadingSpinner />;

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">🏪 Inventory Management</h1>

      {/* Low Stock Alerts */}
      {lowStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <h2 className="font-semibold text-red-800 mb-2">⚠️ Low Stock Alerts ({lowStock.length})</h2>
          <div className="flex flex-wrap gap-2">
            {lowStock.map(p => (
              <span key={p._id} className="badge bg-red-100 text-red-700">
                {p.productName} — {p.stock} left
              </span>
            ))}
          </div>
        </div>
      )}

      {loading ? <LoadingSpinner /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-3 font-medium">Product</th>
                <th className="pb-3 font-medium">Barcode</th>
                <th className="pb-3 font-medium">Price</th>
                <th className="pb-3 font-medium">Current Stock</th>
                <th className="pb-3 font-medium">Status</th>
                {isAdmin && <th className="pb-3 font-medium">Update Stock</th>}
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p._id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3 font-medium">{p.productName}</td>
                  <td className="py-3 text-xs font-mono text-gray-500">{p.barcode || '-'}</td>
                  <td className="py-3">{formatCurrency(p.price)}</td>
                  <td className="py-3 font-bold text-lg">{p.stock}</td>
                  <td className="py-3">
                    <span className={cn('badge', p.stock <= (p.lowStockThreshold || 5) ? 'bg-red-100 text-red-700' : p.stock <= 15 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700')}>
                      {p.stock <= (p.lowStockThreshold || 5) ? 'Low' : p.stock <= 15 ? 'Medium' : 'Good'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={stockUpdates[p._id] || ''}
                          onChange={(e) => setStockUpdates(prev => ({ ...prev, [p._id]: e.target.value }))}
                          className="w-20 !py-1 text-xs"
                        />
                        <Button size="sm" variant="success" onClick={() => updateStock(p._id, 'add')}>+</Button>
                        <Button size="sm" variant="danger" onClick={() => updateStock(p._id, 'subtract')}>-</Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
