const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productName: { type: String, required: true, trim: true },
  barcode: { type: String, unique: true, sparse: true, trim: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true, default: 0 },
  lowStockThreshold: { type: Number, default: 5 },
  category: {
    type: String,
    enum: ['Shampoo', 'Conditioner', 'Serum', 'Cream', 'Gel', 'Color', 'Tools', 'Other'],
    required: true,
  },
  supplier: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
