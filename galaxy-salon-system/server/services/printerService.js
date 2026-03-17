const QRCode = require('qrcode');

/**
 * Generate receipt text for thermal printer (80mm / 48 chars per line).
 * Can be used with ESC/POS printers or browser print.
 */
const CHARS_PER_LINE = 48;

const center = (text) => {
  const pad = Math.max(0, Math.floor((CHARS_PER_LINE - text.length) / 2));
  return ' '.repeat(pad) + text;
};

const line = () => '-'.repeat(CHARS_PER_LINE);

const leftRight = (left, right) => {
  const space = CHARS_PER_LINE - left.length - right.length;
  return left + ' '.repeat(Math.max(1, space)) + right;
};

exports.generateReceiptText = (billData) => {
  const businessName = process.env.BUSINESS_NAME || 'Galaxy Unisex Saloon';
  const businessAddress = process.env.BUSINESS_ADDRESS || 'Tambaram, Chennai';

  let receipt = '';
  receipt += center(businessName) + '\n';
  receipt += center(businessAddress) + '\n';
  receipt += line() + '\n';
  receipt += leftRight('Bill No:', String(billData.billNumber)) + '\n';
  receipt += leftRight('Date:', new Date(billData.createdAt || Date.now()).toLocaleDateString('en-IN')) + '\n';
  if (billData.customerName) {
    receipt += leftRight('Customer:', billData.customerName) + '\n';
  }
  receipt += line() + '\n';

  // Services
  if (billData.services && billData.services.length > 0) {
    for (const s of billData.services) {
      receipt += leftRight(s.serviceName, `₹${s.price}`) + '\n';
    }
  }

  // Products
  if (billData.products && billData.products.length > 0) {
    for (const p of billData.products) {
      const qty = p.quantity > 1 ? ` x${p.quantity}` : '';
      receipt += leftRight(`${p.productName}${qty}`, `₹${p.price * (p.quantity || 1)}`) + '\n';
    }
  }

  receipt += line() + '\n';
  receipt += leftRight('Subtotal:', `₹${billData.subtotal}`) + '\n';

  if (billData.discount > 0) {
    receipt += leftRight('Discount:', `-₹${billData.discount}`) + '\n';
  }
  if (billData.tax > 0) {
    receipt += leftRight(`Tax (${billData.taxRate}%):`, `₹${billData.tax}`) + '\n';
  }

  receipt += line() + '\n';
  receipt += leftRight('TOTAL:', `₹${billData.totalAmount}`) + '\n';
  receipt += leftRight('Payment:', billData.paymentMethod.toUpperCase()) + '\n';
  receipt += line() + '\n';
  receipt += center('Thank you, visit again!') + '\n';
  receipt += '\n\n\n'; // Paper feed

  return receipt;
};

/**
 * Generate receipt as HTML for browser printing.
 */
exports.generateReceiptHTML = (billData) => {
  const businessName = process.env.BUSINESS_NAME || 'Galaxy Unisex Saloon';
  const businessAddress = process.env.BUSINESS_ADDRESS || 'Tambaram, Chennai';

  return `<!DOCTYPE html>
<html>
<head>
<style>
  @page { margin: 0; size: 80mm auto; }
  body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 5mm; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .line { border-top: 1px dashed #000; margin: 4px 0; }
  .row { display: flex; justify-content: space-between; }
  .total-row { font-size: 14px; font-weight: bold; }
  h2 { margin: 0; font-size: 16px; }
  p { margin: 2px 0; }
</style>
</head>
<body>
  <div class="center">
    <h2>${businessName}</h2>
    <p>${businessAddress}</p>
  </div>
  <div class="line"></div>
  <div class="row"><span>Bill No: ${billData.billNumber}</span><span>${new Date(billData.createdAt || Date.now()).toLocaleDateString('en-IN')}</span></div>
  ${billData.customerName ? `<p>Customer: ${billData.customerName}</p>` : ''}
  <div class="line"></div>
  ${(billData.services || []).map(s => `<div class="row"><span>${s.serviceName}</span><span>₹${s.price}</span></div>`).join('')}
  ${(billData.products || []).map(p => `<div class="row"><span>${p.productName}${p.quantity > 1 ? ` x${p.quantity}` : ''}</span><span>₹${p.price * (p.quantity || 1)}</span></div>`).join('')}
  <div class="line"></div>
  <div class="row"><span>Subtotal</span><span>₹${billData.subtotal}</span></div>
  ${billData.discount > 0 ? `<div class="row"><span>Discount</span><span>-₹${billData.discount}</span></div>` : ''}
  ${billData.tax > 0 ? `<div class="row"><span>Tax (${billData.taxRate}%)</span><span>₹${billData.tax}</span></div>` : ''}
  <div class="line"></div>
  <div class="row total-row"><span>TOTAL</span><span>₹${billData.totalAmount}</span></div>
  <div class="row"><span>Payment</span><span>${billData.paymentMethod.toUpperCase()}</span></div>
  <div class="line"></div>
  <div class="center"><p>Thank you, visit again!</p></div>
</body>
</html>`;
};

/**
 * Generate QR code as data URL for digital receipt.
 */
exports.generateQRCode = async (billData) => {
  const receiptUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/receipt/${billData._id}`;
  return QRCode.toDataURL(receiptUrl);
};
