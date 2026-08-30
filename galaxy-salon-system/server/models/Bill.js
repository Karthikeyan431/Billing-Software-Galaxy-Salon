const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  billNumber: { type: Number, unique: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerName: { type: String },
  customerPhone: { type: String },
  services: [{
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    serviceName: String,
    price: Number,
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    employeeName: String,
  }],
  products: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: String,
    price: Number,
    quantity: { type: Number, default: 1 },
  }],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  discountType: { type: String, enum: ['flat', 'percent'], default: 'flat' },
  tax: { type: Number, default: 0 },
  taxRate: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paymentMethod: {
    type: String,
    enum: ['cash', 'upi', 'card', 'split'],
    required: true,
  },
  splitPayment: {
    cash: { type: Number, default: 0 },
    upi: { type: Number, default: 0 },
    card: { type: Number, default: 0 },
  },
  status: { type: String, enum: ['completed', 'cancelled', 'refunded'], default: 'completed' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Auto-increment bill number
billSchema.pre('save', async function (next) {
  if (this.isNew) {
    const lastBill = await this.constructor.findOne({}, {}, { sort: { billNumber: -1 } });
    this.billNumber = lastBill ? lastBill.billNumber + 1 : 1001;
  }
  next();
});

// Serves every report aggregation and the dashboard, which all match on
// { status: 'completed', createdAt: {$gte,$lte} }. Without this they COLLSCAN.
billSchema.index({ status: 1, createdAt: -1 });
// Employee performance report groups by the employee on each service line.
billSchema.index({ 'services.employee': 1 });
billSchema.index({ createdAt: -1 });
billSchema.index({ customer: 1 });

module.exports = mongoose.model('Bill', billSchema);
