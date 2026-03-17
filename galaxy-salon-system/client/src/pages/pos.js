import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import DashboardLayout from '../layouts/DashboardLayout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../hooks/useAuth';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { customerService, serviceService, productService, billService, employeeService, whatsappService, paymentService } from '../services/dataService';
import { formatCurrency, cn } from '../utils/helpers';
import toast from 'react-hot-toast';

export default function POSPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Data
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Customer
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerResults, setCustomerResults] = useState([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showInlineAdd, setShowInlineAdd] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });
  const [customerSearching, setCustomerSearching] = useState(false);
  const customerRef = useRef(null);

  // Bill items
  const [billServices, setBillServices] = useState([]);
  const [billProducts, setBillProducts] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState('flat');
  const [taxRate, setTaxRate] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Barcode
  const barcodeRef = useRef(null);

  // Filters
  const [serviceCategory, setServiceCategory] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [smartSearch, setSmartSearch] = useState('');

  // Receipt modal
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastBill, setLastBill] = useState(null);

  // Payment verification
  const [showPaymentVerify, setShowPaymentVerify] = useState(false);
  const [paymentVerifying, setPaymentVerifying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending'); // pending | verifying | success

  // Load data
  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (user) {
      Promise.all([
        serviceService.getAll({ active: true }),
        productService.getAll({ limit: 200 }),
        employeeService.getAll({ active: true }),
      ]).then(([sRes, pRes, eRes]) => {
        setServices(sRes.data.services || []);
        setProducts(pRes.data.products || []);
        setEmployees(eRes.data.employees || []);
      }).catch(() => toast.error('Failed to load data'))
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  // Barcode scanner integration
  const handleBarcodeScanned = useCallback((product) => {
    addProduct(product);
  }, []);
  useBarcodeScanner(handleBarcodeScanned);

  // Live customer search (name or phone)
  const searchTimerRef = useRef(null);
  const handleCustomerSearch = (value) => {
    setCustomerSearch(value);
    setShowInlineAdd(false);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (value.trim().length < 2) {
      setCustomerResults([]);
      setShowCustomerDropdown(false);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      setCustomerSearching(true);
      try {
        const { data } = await customerService.quickSearch(value.trim());
        setCustomerResults(data.customers || []);
        setShowCustomerDropdown(true);
      } catch (err) {
        console.error('Failed to search customers:', err);
        setCustomerResults([]);
      } finally {
        setCustomerSearching(false);
      }
    }, 300);
  };

  const selectCustomer = (customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch('');
    setCustomerResults([]);
    setShowCustomerDropdown(false);
    setShowInlineAdd(false);
    toast.success(`Customer: ${customer.name}`);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (customerRef.current && !customerRef.current.contains(e.target)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const createCustomer = async () => {
    if (!newCustomer.name || !newCustomer.phone) return toast.error('Name and phone required');
    try {
      const payload = { name: newCustomer.name, phone: newCustomer.phone };
      if (newCustomer.email && newCustomer.email.trim()) payload.email = newCustomer.email.trim();
      const { data } = await customerService.create(payload);
      setSelectedCustomer(data.customer);
      setShowInlineAdd(false);
      setNewCustomer({ name: '', phone: '', email: '' });
      setCustomerSearch('');
      toast.success('Customer added & selected!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed');
    }
  };

  // Employee picker for services
  const [showEmpPicker, setShowEmpPicker] = useState(null); // holds pending service

  const handleServiceClick = (service) => {
    if (employees.length <= 1) {
      addServiceWithEmployee(service, employees[0]?._id);
    } else {
      setShowEmpPicker(service);
    }
  };

  const addServiceWithEmployee = (service, employeeId) => {
    const employee = employees.find(e => e._id === employeeId);
    setBillServices(prev => [...prev, {
      id: Date.now() + Math.random(),
      service: service._id,
      serviceName: service.serviceName,
      price: service.price,
      employee: employeeId || null,
      employeeName: employee?.name || '',
    }]);
    setShowEmpPicker(null);
  };

  const changeServiceEmployee = (itemId, employeeId) => {
    const employee = employees.find(e => e._id === employeeId);
    setBillServices(prev => prev.map(s => s.id === itemId ? { ...s, employee: employeeId, employeeName: employee?.name || '' } : s));
  };

  // Add product to bill
  const addProduct = (product) => {
    setBillProducts(prev => {
      const existing = prev.find(p => p.product === product._id);
      if (existing) {
        return prev.map(p => p.product === product._id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, {
        id: Date.now() + Math.random(),
        product: product._id,
        productName: product.productName,
        price: product.price,
        quantity: 1,
      }];
    });
  };

  const removeServiceItem = (id) => setBillServices(prev => prev.filter(s => s.id !== id));
  const removeProductItem = (id) => setBillProducts(prev => prev.filter(p => p.id !== id));
  const updateProductQty = (id, qty) => {
    if (qty < 1) return;
    setBillProducts(prev => prev.map(p => p.id === id ? { ...p, quantity: qty } : p));
  };

  // Handle manual barcode input
  const handleBarcodeInput = async (e) => {
    if (e.key === 'Enter') {
      const code = smartSearch.trim();
      if (!code) return;
      try {
        const { data } = await productService.getByBarcode(code);
        addProduct(data.product);
        toast.success(`Added: ${data.product.productName}`);
        setSmartSearch('');
      } catch {
        // Not a barcode — keep as search filter (already filtering live)
      }
    }
  };

  // Calculations
  const servicesTotal = billServices.reduce((sum, s) => sum + s.price, 0);
  const productsTotal = billProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
  const subtotal = servicesTotal + productsTotal;
  const discountAmount = discountType === 'percent' ? (subtotal * discount / 100) : discount;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = Math.round(afterDiscount * taxRate / 100);
  const totalAmount = afterDiscount + taxAmount;

  // Initiate billing — cash is instant, upi/card opens Razorpay
  const initiateBill = () => {
    if (billServices.length === 0 && billProducts.length === 0) {
      return toast.error('Add at least one item to the bill');
    }
    if (paymentMethod === 'cash') {
      generateBill();
    } else {
      openRazorpay();
    }
  };

  // Open Razorpay checkout for UPI/Card
  const openRazorpay = async () => {
    try {
      setPaymentVerifying(true);
      setPaymentStatus('verifying');
      setShowPaymentVerify(true);

      // Create order on backend
      const { data } = await paymentService.createOrder({ amount: totalAmount });

      setPaymentVerifying(false);
      setPaymentStatus('pending');

      const options = {
        key: data.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: data.amount,
        currency: data.currency || 'INR',
        name: 'Galaxy Unisex Saloon',
        description: `Bill Payment - ${selectedCustomer?.name || 'Walk-in'}`,
        order_id: data.orderId,
        prefill: {
          name: selectedCustomer?.name || '',
          contact: selectedCustomer?.phone || '',
          email: selectedCustomer?.email || '',
          method: paymentMethod === 'upi' ? 'upi' : paymentMethod === 'card' ? 'card' : '',
        },
        theme: { color: '#6366f1' },
        handler: async (response) => {
          // Payment success — verify on backend
          setPaymentStatus('verifying');
          setPaymentVerifying(true);
          try {
            const verifyRes = await paymentService.verify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verifyRes.data.verified) {
              setPaymentStatus('success');
              setTimeout(() => {
                setShowPaymentVerify(false);
                generateBill(response.razorpay_payment_id);
              }, 800);
            } else {
              setPaymentStatus('pending');
              toast.error('Payment verification failed');
            }
          } catch {
            setPaymentStatus('pending');
            toast.error('Payment verification failed');
          } finally {
            setPaymentVerifying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setShowPaymentVerify(false);
            setPaymentStatus('pending');
            setPaymentVerifying(false);
            toast.error('Payment cancelled');
          },
        },
      };

      if (typeof window.Razorpay === 'undefined') {
        toast.error('Razorpay not loaded. Please refresh and try again.');
        setShowPaymentVerify(false);
        return;
      }
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setPaymentVerifying(false);
      setShowPaymentVerify(false);
      setPaymentStatus('pending');
      toast.error('Failed to initiate payment');
    }
  };

  // Generate bill (razorpayPaymentId is optional, passed for UPI/Card)
  const generateBill = async (razorpayPaymentId) => {
    if (billServices.length === 0 && billProducts.length === 0) {
      return toast.error('Add at least one item to the bill');
    }

    try {
      const billData = {
        customer: selectedCustomer?._id,
        customerName: selectedCustomer?.name || 'Walk-in',
        customerPhone: selectedCustomer?.phone || '',
        services: billServices.map(({ service, serviceName, price, employee, employeeName }) => ({
          service, serviceName, price, employee, employeeName,
        })),
        products: billProducts.map(({ product, productName, price, quantity }) => ({
          product, productName, price, quantity,
        })),
        subtotal,
        discount: discountAmount,
        discountType,
        tax: taxAmount,
        taxRate,
        totalAmount,
        paymentMethod,
      };

      const { data } = await billService.create(billData);
      setLastBill(data.bill);
      setShowReceipt(true);
      toast.success(`Bill #${data.bill.billNumber} created!`);

      // Send WhatsApp receipt if customer has phone
      if (selectedCustomer?.phone) {
        try {
          await whatsappService.sendReceipt({
            phone: selectedCustomer.phone,
            billData: { ...billData, billNumber: data.bill.billNumber },
          });
        } catch { /* WhatsApp send is best-effort */ }
      }

      // Reset
      setBillServices([]);
      setBillProducts([]);
      setDiscount(0);
      setTaxRate(0);
      setSelectedCustomer(null);
      setCustomerSearch('');
      setPaymentMethod('cash');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create bill');
    }
  };

  // Print receipt
  const printReceipt = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) return;
    const bill = lastBill;
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

    printWindow.document.write(`<!DOCTYPE html><html><head>
    <title>Invoice #${bill.billNumber} - ${businessName}</title>
    <style>
      @page { margin: 15mm 10mm; size: A4; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; color: #333; background: #fff; }
      .invoice { max-width: 700px; margin: 0 auto; padding: 20px 0; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style></head><body>
    <div class="invoice">

      <!-- Header -->
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

      <!-- Bill Info + Customer -->
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

      <!-- Items Table -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead>
          <tr style="background:#f8f7ff;">
            <th style="padding:12px;text-align:left;font-size:11px;text-transform:uppercase;color:#888;letter-spacing:0.5px;border-bottom:2px solid #e5e5e5;width:40px;">#</th>
            <th style="padding:12px;text-align:left;font-size:11px;text-transform:uppercase;color:#888;letter-spacing:0.5px;border-bottom:2px solid #e5e5e5;">Item Description</th>
            <th style="padding:12px;text-align:center;font-size:11px;text-transform:uppercase;color:#888;letter-spacing:0.5px;border-bottom:2px solid #e5e5e5;width:60px;">Qty</th>
            <th style="padding:12px;text-align:right;font-size:11px;text-transform:uppercase;color:#888;letter-spacing:0.5px;border-bottom:2px solid #e5e5e5;width:110px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${serviceRows}
          ${productRows}
        </tbody>
      </table>

      <!-- Totals -->
      <table style="width:300px;margin-left:auto;margin-bottom:30px;">
        <tr>
          <td style="padding:6px 0;font-size:14px;color:#666;">Subtotal</td>
          <td style="padding:6px 0;font-size:14px;text-align:right;color:#333;">Rs.${bill.subtotal.toLocaleString('en-IN')}</td>
        </tr>
        ${bill.discount > 0 ? `<tr>
          <td style="padding:6px 0;font-size:14px;color:#dc2626;">Discount</td>
          <td style="padding:6px 0;font-size:14px;text-align:right;color:#dc2626;">-Rs.${bill.discount.toLocaleString('en-IN')}</td>
        </tr>` : ''}
        ${bill.tax > 0 ? `<tr>
          <td style="padding:6px 0;font-size:14px;color:#666;">Tax (${bill.taxRate}%)</td>
          <td style="padding:6px 0;font-size:14px;text-align:right;color:#333;">+Rs.${bill.tax.toLocaleString('en-IN')}</td>
        </tr>` : ''}
        <tr>
          <td colspan="2" style="border-top:2px solid #333;padding:0;"></td>
        </tr>
        <tr>
          <td style="padding:10px 0;font-size:20px;font-weight:800;color:#1a1a1a;">Total</td>
          <td style="padding:10px 0;font-size:20px;font-weight:800;text-align:right;color:#4f46e5;">Rs.${bill.totalAmount.toLocaleString('en-IN')}</td>
        </tr>
      </table>

      <!-- Footer -->
      <div style="border-top:2px dashed #e5e5e5;padding-top:16px;text-align:center;">
        <div style="font-size:15px;font-weight:700;color:#333;">Thank you for visiting Galaxy Salon!</div>
        <div style="font-size:12px;color:#aaa;margin-top:4px;">We look forward to seeing you again</div>
      </div>

    </div>
    </body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  // Thermal printer receipt (80mm)
  const printThermal = () => {
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) return;
    const bill = lastBill;
    const businessName = 'Galaxy Unisex Saloon';
    const businessAddress = 'Tambaram, Chennai';
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

    printWindow.document.write(`<!DOCTYPE html><html><head>
    <title>Receipt #${bill.billNumber}</title>
    <style>
      @page { margin: 0; size: 80mm auto; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Consolas', 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 3mm; color: #000; }
      .center { text-align: center; }
      .bold { font-weight: bold; }
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
      .total-row.discount .val { color: #c00; }
      .grand { display: flex; justify-content: space-between; font-size: 16px; font-weight: 900; padding: 4px 0; }
      .payment { text-align: center; font-size: 11px; font-weight: 700; margin: 4px 0; padding: 3px; background: #eee; }
      .footer { text-align: center; font-size: 10px; color: #666; margin-top: 6px; }
      .footer .ty { font-size: 12px; font-weight: 700; color: #000; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style></head><body>
      <div class="center">
        <div class="shop-name">${businessName}</div>
        <div class="shop-addr">${businessAddress}</div>
      </div>
      <div class="dashed"></div>
      <div class="info"><span class="label">Bill No:</span><span class="bold">#${bill.billNumber}</span></div>
      <div class="info"><span class="label">Date:</span><span>${dateStr} ${timeStr}</span></div>
      ${bill.customerName && bill.customerName !== 'Walk-in' ? `<div class="info"><span class="label">Customer:</span><span>${bill.customerName}</span></div>` : ''}
      ${bill.customerPhone ? `<div class="info"><span class="label">Phone:</span><span>${bill.customerPhone}</span></div>` : ''}
      ${(bill.services || []).length > 0 ? `<div class="dashed"></div><div class="section-label">Services</div>${serviceItems}` : ''}
      ${(bill.products || []).length > 0 ? `<div class="dashed"></div><div class="section-label">Products</div>${productItems}` : ''}
      <div class="dashed"></div>
      <div class="total-row"><span>Subtotal</span><span>Rs.${bill.subtotal.toLocaleString('en-IN')}</span></div>
      ${bill.discount > 0 ? `<div class="total-row discount"><span>Discount</span><span class="val">-Rs.${bill.discount.toLocaleString('en-IN')}</span></div>` : ''}
      ${bill.tax > 0 ? `<div class="total-row"><span>Tax (${bill.taxRate}%)</span><span>+Rs.${bill.tax.toLocaleString('en-IN')}</span></div>` : ''}
      <div class="double"></div>
      <div class="grand"><span>TOTAL</span><span>Rs.${bill.totalAmount.toLocaleString('en-IN')}</span></div>
      <div class="payment">${bill.paymentMethod.toUpperCase()}</div>
      <div class="dashed"></div>
      <div class="footer">
        <div class="ty">Thank you!</div>
        <div>Visit again</div>
      </div>
    </body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  if (authLoading || !user) return <LoadingSpinner />;
  if (loading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>;

  const searchLower = smartSearch.toLowerCase().trim();
  const filteredServices = services.filter(s => {
    const matchCategory = !serviceCategory || s.category === serviceCategory;
    const matchSearch = !searchLower || s.serviceName.toLowerCase().includes(searchLower) || s.category?.toLowerCase().includes(searchLower);
    return matchCategory && matchSearch;
  });
  const filteredProducts = products.filter(p => {
    const matchLocal = !productSearch || p.productName.toLowerCase().includes(productSearch.toLowerCase());
    const matchSmart = !searchLower || p.productName.toLowerCase().includes(searchLower) || p.barcode?.toLowerCase().includes(searchLower) || p.category?.toLowerCase().includes(searchLower);
    return matchLocal && matchSmart;
  });
  const categories = [...new Set(services.map(s => s.category))];

  return (
    <DashboardLayout>
      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-8rem)]">
        {/* Left Panel - Service & Product Selection */}
        <div className="lg:w-3/5 flex flex-col gap-4 overflow-hidden">
          {/* Customer Section */}
          <div className="card" ref={customerRef}>
            {!selectedCustomer ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      placeholder="Search by name or phone..."
                      value={customerSearch}
                      onChange={(e) => handleCustomerSearch(e.target.value)}
                      onFocus={() => { if (customerResults.length > 0) setShowCustomerDropdown(true); }}
                      className="w-full"
                    />
                    {customerSearching && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}

                    {/* Dropdown results */}
                    {showCustomerDropdown && (
                      <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 max-h-52 overflow-y-auto">
                        {customerResults.length > 0 ? (
                          <>
                            {customerResults.map(c => (
                              <button
                                key={c._id}
                                onClick={() => selectCustomer(c)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-primary-50 text-left transition-colors border-b border-gray-50 last:border-0"
                              >
                                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
                                  {c.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                                  <p className="text-xs text-gray-500">{c.phone}</p>
                                </div>
                                {c.loyaltyPoints > 0 && (
                                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{c.loyaltyPoints} pts</span>
                                )}
                              </button>
                            ))}
                            <button
                              onClick={() => { setShowCustomerDropdown(false); setShowInlineAdd(true); setNewCustomer({ name: customerSearch, phone: '', email: '' }); }}
                              className="w-full px-3 py-2.5 text-sm text-primary-600 hover:bg-primary-50 font-medium text-left flex items-center gap-2"
                            >
                              <span className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-lg flex-shrink-0">+</span>
                              Add new customer
                            </button>
                          </>
                        ) : (
                          <div className="p-3">
                            <p className="text-sm text-gray-500 mb-2">No customer found for "{customerSearch}"</p>
                            <button
                              onClick={() => {
                                setShowCustomerDropdown(false);
                                setShowInlineAdd(true);
                                const isPhone = /^\d+$/.test(customerSearch.trim());
                                setNewCustomer({ name: isPhone ? '' : customerSearch.trim(), phone: isPhone ? customerSearch.trim() : '', email: '' });
                              }}
                              className="w-full text-left flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-primary-50 text-primary-600 font-medium text-sm"
                            >
                              <span className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-lg">+</span>
                              Add as new customer
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <Button variant="secondary" size="md" onClick={() => { setShowInlineAdd(!showInlineAdd); setNewCustomer({ name: '', phone: '', email: '' }); }}>
                    {showInlineAdd ? '✕' : '+ New'}
                  </Button>
                </div>

                {/* Inline Add Customer Form */}
                {showInlineAdd && (
                  <div className="bg-blue-50 rounded-lg p-3 space-y-2 border border-blue-100">
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Quick Add Customer</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Name *"
                        value={newCustomer.name}
                        onChange={(e) => setNewCustomer(p => ({ ...p, name: e.target.value }))}
                        className="flex-1 !py-2 !text-sm"
                        autoFocus
                      />
                      <Input
                        placeholder="WhatsApp No *"
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer(p => ({ ...p, phone: e.target.value }))}
                        className="flex-1 !py-2 !text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Email (optional)"
                        type="email"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer(p => ({ ...p, email: e.target.value }))}
                        className="flex-1 !py-2 !text-sm"
                      />
                      <Button onClick={createCustomer} size="md" className="whitespace-nowrap">Save & Select</Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between bg-green-50 p-2.5 rounded-lg">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-green-200 rounded-full flex items-center justify-center text-green-800 font-bold text-sm">
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="font-semibold text-green-800">{selectedCustomer.name}</span>
                    <span className="text-green-600 text-sm ml-2">{selectedCustomer.phone}</span>
                    {selectedCustomer.loyaltyPoints > 0 && (
                      <span className="text-xs ml-2 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">🎯 {selectedCustomer.loyaltyPoints} pts</span>
                    )}
                  </div>
                </div>
                <button onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }} className="text-sm text-red-500 hover:text-red-700 font-medium">✕ Remove</button>
              </div>
            )}
          </div>

          {/* Smart Search */}
          <div className="card">
            <div className="relative">
              <Input
                ref={barcodeRef}
                placeholder="🔍 Search services, products, or scan barcode..."
                value={smartSearch}
                onChange={(e) => setSmartSearch(e.target.value)}
                onKeyDown={handleBarcodeInput}
                className="pr-8"
              />
              {smartSearch && (
                <button
                  onClick={() => setSmartSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >✕</button>
              )}
            </div>
            {searchLower && (
              <p className="text-xs text-gray-400 mt-1">
                Showing {filteredServices.length} services & {filteredProducts.length} products matching "{smartSearch}"
              </p>
            )}
          </div>

          {/* Services */}
          <div className="card flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Services</h3>
              <div className="flex gap-1 flex-wrap">
                <button onClick={() => setServiceCategory('')} className={cn('px-2 py-1 rounded text-xs font-medium', !serviceCategory ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600')}>All</button>
                {categories.map(cat => (
                  <button key={cat} onClick={() => setServiceCategory(cat)} className={cn('px-2 py-1 rounded text-xs font-medium', serviceCategory === cat ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600')}>{cat}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto flex-1">
              {filteredServices.map(service => (
                <button
                  key={service._id}
                  onClick={() => handleServiceClick(service)}
                  className="btn-pos bg-white border border-gray-200 hover:border-primary-300 hover:bg-primary-50 text-left"
                >
                  <div className="text-sm font-medium text-gray-900 truncate">{service.serviceName}</div>
                  <div className="text-xs text-primary-600 font-bold mt-1">{formatCurrency(service.price)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Products */}
          <div className="card flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Products</h3>
              <Input
                placeholder="Search products..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-48 !py-1 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto flex-1">
              {filteredProducts.map(product => (
                <button
                  key={product._id}
                  onClick={() => addProduct(product)}
                  className="btn-pos bg-white border border-gray-200 hover:border-green-300 hover:bg-green-50 text-left"
                >
                  <div className="text-sm font-medium text-gray-900 truncate">{product.productName}</div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-green-600 font-bold">{formatCurrency(product.price)}</span>
                    <span className="text-xs text-gray-400">Stock: {product.stock}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel - Bill */}
        <div className="lg:w-2/5 card flex flex-col overflow-hidden">
          <h2 className="text-lg font-bold text-gray-900 mb-3">🧾 Current Bill</h2>

          {/* Bill Items */}
          <div className="flex-1 overflow-y-auto space-y-2 mb-4">
            {billServices.length === 0 && billProducts.length === 0 && (
              <p className="text-center text-gray-400 py-8">Add services or products to create a bill</p>
            )}

            {billServices.map(item => (
              <div key={item.id} className="flex items-center justify-between bg-blue-50 p-2.5 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.serviceName}</p>
                  <select
                    value={item.employee || ''}
                    onChange={(e) => changeServiceEmployee(item.id, e.target.value)}
                    className="text-xs text-gray-500 bg-transparent border-none p-0 cursor-pointer focus:ring-0 hover:text-primary-600"
                  >
                    <option value="">No employee</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.name} - {emp.role}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(item.price)}</span>
                  <button onClick={() => removeServiceItem(item.id)} className="text-red-400 hover:text-red-600">✕</button>
                </div>
              </div>
            ))}

            {billProducts.map(item => (
              <div key={item.id} className="flex items-center justify-between bg-green-50 p-2.5 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.productName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateProductQty(item.id, item.quantity - 1)} className="w-6 h-6 rounded bg-gray-200 text-xs flex items-center justify-center">-</button>
                  <span className="text-xs w-6 text-center">{item.quantity}</span>
                  <button onClick={() => updateProductQty(item.id, item.quantity + 1)} className="w-6 h-6 rounded bg-gray-200 text-xs flex items-center justify-center">+</button>
                  <span className="text-sm font-bold text-gray-900 w-16 text-right">{formatCurrency(item.price * item.quantity)}</span>
                  <button onClick={() => removeProductItem(item.id)} className="text-red-400 hover:text-red-600">✕</button>
                </div>
              </div>
            ))}
          </div>

          {/* Bill Summary */}
          <div className="border-t pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>

            {/* Discount */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 w-16">Discount</span>
              <Select value={discountType} onChange={(e) => setDiscountType(e.target.value)} className="!py-1 !text-xs w-20">
                <option value="flat">₹</option>
                <option value="percent">%</option>
              </Select>
              <Input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="!py-1 !text-xs w-20"
              />
              {discountAmount > 0 && <span className="text-sm text-red-500">-{formatCurrency(discountAmount)}</span>}
            </div>

            {/* Tax */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 w-16">Tax %</span>
              <Input
                type="number"
                min="0"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="!py-1 !text-xs w-20"
              />
              {taxAmount > 0 && <span className="text-sm text-gray-600">+{formatCurrency(taxAmount)}</span>}
            </div>

            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total</span>
              <span className="text-primary-700">{formatCurrency(totalAmount)}</span>
            </div>

            {/* Payment Method */}
            <div className="flex gap-2">
              {['cash', 'upi', 'card'].map(method => (
                <button
                  key={method}
                  onClick={() => { setPaymentMethod(method); setShowPaymentVerify(false); setPaymentStatus('pending'); }}
                  className={cn(
                    'flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-all',
                    paymentMethod === method
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  )}
                >
                  {method === 'cash' && '💵'} {method === 'upi' && '📱'} {method === 'card' && '💳'} {method.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Inline Payment Status for UPI/Card */}
            {showPaymentVerify && paymentMethod !== 'cash' ? (
              <div className="space-y-3">
                {paymentStatus === 'pending' && (
                  <div className={cn(
                    'rounded-lg p-3 border text-center',
                    paymentMethod === 'upi' ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'
                  )}>
                    <p className="text-xs text-gray-500">{paymentMethod.toUpperCase()} via Razorpay</p>
                    <p className="text-2xl font-bold text-gray-900 my-1">{formatCurrency(totalAmount)}</p>
                    <p className={cn('text-sm', paymentMethod === 'upi' ? 'text-purple-700' : 'text-blue-700')}>
                      Complete payment in Razorpay window
                    </p>
                  </div>
                )}

                {paymentStatus === 'verifying' && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="text-sm text-gray-500 mt-2">
                      {paymentVerifying ? 'Verifying payment...' : 'Creating payment order...'}
                    </p>
                  </div>
                )}

                {paymentStatus === 'success' && (
                  <div className="text-center py-3">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto text-xl">✅</div>
                    <p className="text-green-700 font-semibold mt-1">Payment Verified!</p>
                    <p className="text-xs text-gray-500">Generating bill...</p>
                  </div>
                )}
              </div>
            ) : (
              <Button onClick={initiateBill} className="w-full" size="lg" variant="gold" disabled={billServices.length === 0 && billProducts.length === 0}>
                {paymentMethod === 'cash' ? '🧾 Generate Bill' : paymentMethod === 'upi' ? '📱 Pay via UPI' : '💳 Pay via Card'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Employee Picker Modal */}
      <Modal isOpen={!!showEmpPicker} onClose={() => setShowEmpPicker(null)} title="Select Employee" size="sm">
        {showEmpPicker && (
          <div className="space-y-2">
            <p className="text-sm text-gray-500 mb-3">
              Who will perform <span className="font-semibold text-gray-800">{showEmpPicker.serviceName}</span>?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {employees.map(emp => (
                <button
                  key={emp._id}
                  onClick={() => addServiceWithEmployee(showEmpPicker, emp._id)}
                  className="flex items-center gap-2.5 p-3 rounded-xl border-2 border-gray-200 hover:border-primary-400 hover:bg-primary-50 transition-all text-left"
                >
                  <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{emp.name}</p>
                    <p className="text-xs text-gray-500">{emp.role}</p>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => addServiceWithEmployee(showEmpPicker, null)}
              className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 mt-1"
            >Skip — no employee</button>
          </div>
        )}
      </Modal>

      {/* Receipt Modal */}
      <Modal isOpen={showReceipt} onClose={() => setShowReceipt(false)} title="" size="md">
        {lastBill && (
          <div className="space-y-0">
            {/* Header */}
            <div className="text-center pb-4 border-b-2 border-dashed border-gray-300">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-2 text-2xl text-white shadow-lg">✨</div>
              <h2 className="text-xl font-bold text-gray-900">Galaxy Unisex Saloon</h2>
              <p className="text-xs text-gray-500">Tambaram, Chennai</p>
              <div className="mt-3 inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-semibold">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Bill Generated Successfully
              </div>
            </div>

            {/* Bill Info Row */}
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Invoice No</p>
                <p className="text-lg font-bold text-indigo-600">#{lastBill.billNumber}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-wide">Date & Time</p>
                <p className="text-sm font-medium text-gray-700">
                  {new Date(lastBill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(lastBill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {/* Customer Info */}
            {lastBill.customerName && lastBill.customerName !== 'Walk-in' && (
              <div className="py-3 border-b border-gray-100 flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                  {lastBill.customerName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{lastBill.customerName}</p>
                  {lastBill.customerPhone && <p className="text-xs text-gray-500">{lastBill.customerPhone}</p>}
                </div>
              </div>
            )}

            {/* Services */}
            {lastBill.services?.length > 0 && (
              <div className="py-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Services</p>
                <div className="space-y-2">
                  {lastBill.services.map((s, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-blue-50 text-blue-600 rounded flex items-center justify-center text-xs">💇</span>
                        <div>
                          <p className="text-sm text-gray-800">{s.serviceName}</p>
                          {s.employeeName && <p className="text-xs text-gray-400">by {s.employeeName}</p>}
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{formatCurrency(s.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Products */}
            {lastBill.products?.length > 0 && (
              <div className="py-3 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Products</p>
                <div className="space-y-2">
                  {lastBill.products.map((p, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-green-50 text-green-600 rounded flex items-center justify-center text-xs">📦</span>
                        <div>
                          <p className="text-sm text-gray-800">{p.productName}</p>
                          {p.quantity > 1 && <p className="text-xs text-gray-400">Qty: {p.quantity} × {formatCurrency(p.price)}</p>}
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{formatCurrency(p.price * (p.quantity || 1))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Totals Breakdown */}
            <div className="py-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-700">{formatCurrency(lastBill.subtotal)}</span>
              </div>
              {lastBill.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Discount {lastBill.discountType === 'percent' ? `(${lastBill.taxRate}%)` : ''}</span>
                  <span className="text-red-500">-{formatCurrency(lastBill.discount)}</span>
                </div>
              )}
              {lastBill.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax ({lastBill.taxRate}%)</span>
                  <span className="text-gray-700">+{formatCurrency(lastBill.tax)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 mt-2 border-t-2 border-gray-800">
                <span className="text-base font-bold text-gray-900">Total Amount</span>
                <span className="text-2xl font-extrabold text-gray-900">{formatCurrency(lastBill.totalAmount)}</span>
              </div>
            </div>

            {/* Payment Badge */}
            <div className="flex justify-center pb-2">
              <span className={cn(
                'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold',
                lastBill.paymentMethod === 'cash' ? 'bg-emerald-100 text-emerald-700' :
                lastBill.paymentMethod === 'upi' ? 'bg-purple-100 text-purple-700' :
                lastBill.paymentMethod === 'card' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              )}>
                {lastBill.paymentMethod === 'cash' ? '💵' : lastBill.paymentMethod === 'upi' ? '📱' : '💳'}
                Paid via {lastBill.paymentMethod.toUpperCase()}
              </span>
            </div>

            {/* Divider */}
            <div className="border-t-2 border-dashed border-gray-300 my-1"></div>

            {/* Footer */}
            <p className="text-center text-xs text-gray-400 py-2">Thank you for visiting Galaxy Salon! ✨</p>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button onClick={printReceipt} className="w-full" variant="primary" size="lg">
                <span className="flex items-center justify-center gap-1.5">📄 A4 Invoice</span>
              </Button>
              <Button onClick={printThermal} className="w-full" variant="gold" size="lg">
                <span className="flex items-center justify-center gap-1.5">🧾 Thermal Print</span>
              </Button>
            </div>
            <Button onClick={() => setShowReceipt(false)} className="w-full mt-2" variant="secondary" size="md">Close</Button>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
