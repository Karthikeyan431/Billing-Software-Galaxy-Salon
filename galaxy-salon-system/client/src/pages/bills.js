import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../layouts/DashboardLayout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Modal from '../components/ui/Modal';
import { useAuth } from '../hooks/useAuth';
import { billService } from '../services/dataService';
import { formatCurrency, formatDateTime, cn } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function BillsPage() {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (user) loadBills();
  }, [user, authLoading, page]);

  const loadBills = async () => {
    try {
      const params = { page, limit: 20 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const { data } = await billService.getAll(params);
      setBills(data.bills);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to load bills:', err);
      toast.error(err.response?.data?.error || 'Failed to load bills');
    } finally { setLoading(false); }
  };

  const cancelBill = async (id) => {
    if (!window.confirm('Cancel this bill? Stock will be restored.')) return;
    try {
      await billService.cancel(id);
      toast.success('Bill cancelled');
      loadBills();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const [printBillData, setPrintBillData] = useState(null);

  const openPrintModal = (bill) => setPrintBillData(bill);

  const printA4 = (bill) => {
    const w = window.open('', '_blank', 'width=800,height=900');
    if (!w) return;
    const businessName = 'Galaxy Unisex Saloon';
    const businessAddress = 'Tambaram, Chennai';
    const billDate = new Date(bill.createdAt);
    const dateStr = billDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = billDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    let itemIndex = 0;
    const serviceRows = (bill.services || []).map(s => {
      itemIndex++;
      return `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;color:#555;">${itemIndex}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;">
          <div style="font-weight:600;color:#1a1a1a;">${s.serviceName}</div>
          ${s.employeeName ? `<div style="font-size:12px;color:#888;margin-top:2px;">by ${s.employeeName}</div>` : ''}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;color:#555;">1</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;color:#1a1a1a;">Rs.${s.price.toLocaleString('en-IN')}</td>
      </tr>`;
    }).join('');

    const productRows = (bill.products || []).map(p => {
      itemIndex++;
      return `<tr>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;color:#555;">${itemIndex}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;">
          <div style="font-weight:600;color:#1a1a1a;">${p.productName}</div>
          ${p.quantity > 1 ? `<div style="font-size:12px;color:#888;margin-top:2px;">Rs.${p.price.toLocaleString('en-IN')} each</div>` : ''}
        </td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:center;color:#555;">${p.quantity || 1}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600;color:#1a1a1a;">Rs.${(p.price * (p.quantity || 1)).toLocaleString('en-IN')}</td>
      </tr>`;
    }).join('');

    const paymentLabel = bill.paymentMethod === 'cash' ? 'CASH' : bill.paymentMethod === 'upi' ? 'UPI' : 'CARD';

    w.document.write(`<!DOCTYPE html><html><head>
    <title>Invoice #${bill.billNumber} - ${businessName}</title>
    <style>
      @page { margin: 15mm 10mm; size: A4; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; color: #333; background: #fff; }
      .invoice { max-width: 700px; margin: 0 auto; padding: 20px 0; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style></head><body>
    <div class="invoice">
      <table style="width:100%;border-bottom:3px solid #4f46e5;padding-bottom:20px;margin-bottom:20px;">
        <tr>
          <td style="vertical-align:middle;">
            <div style="font-size:28px;font-weight:800;color:#4f46e5;letter-spacing:-0.5px;">${businessName}</div>
            <div style="font-size:13px;color:#888;margin-top:4px;">${businessAddress}</div>
          </td>
          <td style="text-align:right;vertical-align:middle;">
            <div style="font-size:32px;font-weight:800;color:#4f46e5;">INVOICE</div>
          </td>
        </tr>
      </table>
      <table style="width:100%;margin-bottom:24px;">
        <tr>
          <td style="vertical-align:top;width:50%;">
            <div style="font-size:11px;text-transform:uppercase;color:#aaa;letter-spacing:1px;margin-bottom:6px;">Bill To</div>
            ${bill.customerName && bill.customerName !== 'Walk-in'
              ? `<div style="font-size:16px;font-weight:700;color:#1a1a1a;">${bill.customerName}</div>
                 ${bill.customerPhone ? `<div style="font-size:13px;color:#666;margin-top:2px;">${bill.customerPhone}</div>` : ''}`
              : `<div style="font-size:16px;font-weight:600;color:#999;">Walk-in Customer</div>`
            }
          </td>
          <td style="vertical-align:top;text-align:right;width:50%;">
            <table style="margin-left:auto;">
              <tr><td style="font-size:12px;color:#999;padding:3px 12px 3px 0;">Invoice No</td><td style="font-size:14px;font-weight:700;color:#4f46e5;padding:3px 0;">#${bill.billNumber}</td></tr>
              <tr><td style="font-size:12px;color:#999;padding:3px 12px 3px 0;">Date</td><td style="font-size:13px;font-weight:600;color:#333;padding:3px 0;">${dateStr}</td></tr>
              <tr><td style="font-size:12px;color:#999;padding:3px 12px 3px 0;">Time</td><td style="font-size:13px;font-weight:600;color:#333;padding:3px 0;">${timeStr}</td></tr>
              <tr><td style="font-size:12px;color:#999;padding:3px 12px 3px 0;">Payment</td><td style="padding:3px 0;"><span style="background:${bill.paymentMethod === 'cash' ? '#dcfce7' : bill.paymentMethod === 'upi' ? '#f3e8ff' : '#dbeafe'};color:${bill.paymentMethod === 'cash' ? '#166534' : bill.paymentMethod === 'upi' ? '#7e22ce' : '#1e40af'};padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700;">${paymentLabel}</span></td></tr>
            </table>
          </td>
        </tr>
      </table>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead>
          <tr style="background:#f8f7ff;">
            <th style="padding:12px;text-align:left;font-size:11px;text-transform:uppercase;color:#888;letter-spacing:0.5px;border-bottom:2px solid #e5e5e5;width:40px;">#</th>
            <th style="padding:12px;text-align:left;font-size:11px;text-transform:uppercase;color:#888;letter-spacing:0.5px;border-bottom:2px solid #e5e5e5;">Item Description</th>
            <th style="padding:12px;text-align:center;font-size:11px;text-transform:uppercase;color:#888;letter-spacing:0.5px;border-bottom:2px solid #e5e5e5;width:60px;">Qty</th>
            <th style="padding:12px;text-align:right;font-size:11px;text-transform:uppercase;color:#888;letter-spacing:0.5px;border-bottom:2px solid #e5e5e5;width:110px;">Amount</th>
          </tr>
        </thead>
        <tbody>${serviceRows}${productRows}</tbody>
      </table>
      <table style="width:300px;margin-left:auto;margin-bottom:30px;">
        <tr><td style="padding:6px 0;font-size:14px;color:#666;">Subtotal</td><td style="padding:6px 0;font-size:14px;text-align:right;color:#333;">Rs.${bill.subtotal.toLocaleString('en-IN')}</td></tr>
        ${bill.discount > 0 ? `<tr><td style="padding:6px 0;font-size:14px;color:#dc2626;">Discount</td><td style="padding:6px 0;font-size:14px;text-align:right;color:#dc2626;">-Rs.${bill.discount.toLocaleString('en-IN')}</td></tr>` : ''}
        ${bill.tax > 0 ? `<tr><td style="padding:6px 0;font-size:14px;color:#666;">Tax (${bill.taxRate}%)</td><td style="padding:6px 0;font-size:14px;text-align:right;color:#333;">+Rs.${bill.tax.toLocaleString('en-IN')}</td></tr>` : ''}
        <tr><td colspan="2" style="border-top:2px solid #333;padding:0;"></td></tr>
        <tr><td style="padding:10px 0;font-size:20px;font-weight:800;color:#1a1a1a;">Total</td><td style="padding:10px 0;font-size:20px;font-weight:800;text-align:right;color:#4f46e5;">Rs.${bill.totalAmount.toLocaleString('en-IN')}</td></tr>
      </table>
      <div style="border-top:2px dashed #e5e5e5;padding-top:16px;text-align:center;">
        <div style="font-size:15px;font-weight:700;color:#333;">Thank you for visiting Galaxy Salon!</div>
        <div style="font-size:12px;color:#aaa;margin-top:4px;">We look forward to seeing you again</div>
      </div>
    </div></body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  const printThermal = (bill) => {
    const w = window.open('', '_blank', 'width=350,height=600');
    if (!w) return;
    const billDate = new Date(bill.createdAt);
    const dateStr = billDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = billDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const serviceItems = (bill.services || []).map(s =>
      `<div class="item"><span class="name">${s.serviceName}</span><span class="price">Rs.${s.price.toLocaleString('en-IN')}</span></div>
       ${s.employeeName ? `<div class="sub">  by ${s.employeeName}</div>` : ''}`
    ).join('');

    const productItems = (bill.products || []).map(p =>
      `<div class="item"><span class="name">${p.productName}${p.quantity > 1 ? ' x' + p.quantity : ''}</span><span class="price">Rs.${(p.price * (p.quantity || 1)).toLocaleString('en-IN')}</span></div>
       ${p.quantity > 1 ? `<div class="sub">  Rs.${p.price.toLocaleString('en-IN')} each</div>` : ''}`
    ).join('');

    w.document.write(`<!DOCTYPE html><html><head>
    <title>Receipt #${bill.billNumber}</title>
    <style>
      @page { margin: 0; size: 80mm auto; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 3mm; color: #000; }
      .center { text-align: center; }
      .shop-name { font-size: 16px; font-weight: 900; letter-spacing: 0.5px; }
      .shop-addr { font-size: 10px; color: #555; margin-top: 1px; }
      .dashed { border-top: 1px dashed #000; margin: 6px 0; }
      .double { border-top: 2px double #000; margin: 6px 0; }
      .info { display: flex; justify-content: space-between; font-size: 11px; margin: 1px 0; }
      .info .label { color: #666; }
      .section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #555; margin: 4px 0 2px; }
      .item { display: flex; justify-content: space-between; padding: 2px 0; font-size: 12px; }
      .item .name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding-right: 8px; }
      .item .price { font-weight: 700; white-space: nowrap; }
      .sub { font-size: 9px; color: #777; margin-bottom: 1px; }
      .total-row { display: flex; justify-content: space-between; font-size: 11px; padding: 1px 0; }
      .grand { display: flex; justify-content: space-between; font-size: 16px; font-weight: 900; padding: 4px 0; }
      .payment { text-align: center; font-size: 11px; font-weight: 700; margin: 4px 0; padding: 3px; background: #eee; }
      .footer { text-align: center; font-size: 10px; color: #666; margin-top: 6px; }
      .footer .ty { font-size: 12px; font-weight: 700; color: #000; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style></head><body>
      <div class="center">
        <div class="shop-name">Galaxy Unisex Saloon</div>
        <div class="shop-addr">Tambaram, Chennai</div>
      </div>
      <div class="dashed"></div>
      <div class="info"><span class="label">Bill No:</span><span style="font-weight:700;">#${bill.billNumber}</span></div>
      <div class="info"><span class="label">Date:</span><span>${dateStr} ${timeStr}</span></div>
      ${bill.customerName && bill.customerName !== 'Walk-in' ? `<div class="info"><span class="label">Customer:</span><span>${bill.customerName}</span></div>` : ''}
      ${bill.customerPhone ? `<div class="info"><span class="label">Phone:</span><span>${bill.customerPhone}</span></div>` : ''}
      ${(bill.services || []).length > 0 ? `<div class="dashed"></div><div class="section-label">Services</div>${serviceItems}` : ''}
      ${(bill.products || []).length > 0 ? `<div class="dashed"></div><div class="section-label">Products</div>${productItems}` : ''}
      <div class="dashed"></div>
      <div class="total-row"><span>Subtotal</span><span>Rs.${bill.subtotal.toLocaleString('en-IN')}</span></div>
      ${bill.discount > 0 ? `<div class="total-row"><span>Discount</span><span style="color:#c00;">-Rs.${bill.discount.toLocaleString('en-IN')}</span></div>` : ''}
      ${bill.tax > 0 ? `<div class="total-row"><span>Tax (${bill.taxRate}%)</span><span>+Rs.${bill.tax.toLocaleString('en-IN')}</span></div>` : ''}
      <div class="double"></div>
      <div class="grand"><span>TOTAL</span><span>Rs.${bill.totalAmount.toLocaleString('en-IN')}</span></div>
      <div class="payment">${bill.paymentMethod.toUpperCase()}</div>
      <div class="dashed"></div>
      <div class="footer"><div class="ty">Thank you!</div><div>Visit again</div></div>
    </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  if (authLoading || !user) return <LoadingSpinner />;

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">💰 Bills</h1>
        <Button onClick={() => router.push('/pos')}>+ New Bill</Button>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40" />
        <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40" />
        <Button onClick={() => { setPage(1); loadBills(); }}>Filter</Button>
        <Button variant="secondary" onClick={() => { setStartDate(''); setEndDate(''); setPage(1); setTimeout(loadBills, 0); }}>Clear</Button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-3 font-medium">Bill #</th>
                <th className="pb-3 font-medium">Customer</th>
                <th className="pb-3 font-medium">Items</th>
                <th className="pb-3 font-medium">Total</th>
                <th className="pb-3 font-medium">Payment</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Date</th>
                <th className="pb-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.map(b => (
                <tr key={b._id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="py-3 font-bold">#{b.billNumber}</td>
                  <td className="py-3">{b.customerName || b.customer?.name || 'Walk-in'}</td>
                  <td className="py-3 text-gray-500">{(b.services?.length || 0) + (b.products?.length || 0)} items</td>
                  <td className="py-3 font-bold">{formatCurrency(b.totalAmount)}</td>
                  <td className="py-3"><span className="badge bg-gray-100 text-gray-700">{b.paymentMethod.toUpperCase()}</span></td>
                  <td className="py-3">
                    <span className={cn('badge', b.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                      {b.status}
                    </span>
                  </td>
                  <td className="py-3 text-gray-500 text-xs">{formatDateTime(b.createdAt)}</td>
                  <td className="py-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openPrintModal(b)}>🖨️</Button>
                      {b.status === 'completed' && isAdmin && (
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => cancelBill(b._id)}>Cancel</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {bills.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-gray-400">No bills found</td></tr>}
            </tbody>
          </table>
          {total > 20 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-sm text-gray-500 py-1">Page {page} of {Math.ceil(total / 20)}</span>
              <Button size="sm" variant="secondary" disabled={bills.length < 20} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </div>
      )}

      {/* Print Options Modal */}
      <Modal isOpen={!!printBillData} onClose={() => setPrintBillData(null)} title="Print Invoice" size="sm">
        {printBillData && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Invoice</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">#{printBillData.billNumber}</p>
              <p className="text-lg font-semibold text-gray-800 mt-1">{formatCurrency(printBillData.totalAmount)}</p>
              <p className="text-xs text-gray-500 mt-1">{printBillData.customerName || 'Walk-in'} • {formatDateTime(printBillData.createdAt)}</p>
            </div>
            <p className="text-sm text-gray-500 text-center">Choose print format:</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { printA4(printBillData); setPrintBillData(null); }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all"
              >
                <span className="text-3xl">📄</span>
                <span className="text-sm font-semibold text-gray-800">A4 Invoice</span>
                <span className="text-xs text-gray-400">Full page / PDF</span>
              </button>
              <button
                onClick={() => { printThermal(printBillData); setPrintBillData(null); }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-amber-400 hover:bg-amber-50 transition-all"
              >
                <span className="text-3xl">🧾</span>
                <span className="text-sm font-semibold text-gray-800">Thermal Print</span>
                <span className="text-xs text-gray-400">80mm receipt</span>
              </button>
            </div>
            <Button onClick={() => setPrintBillData(null)} className="w-full" variant="secondary">Cancel</Button>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
