const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  loyaltyPoints: { type: Number, default: 0 },
  visitHistory: [{
    date: { type: Date, default: Date.now },
    billId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bill' },
  }],
  notes: { type: String },
}, { timestamps: true });

customerSchema.index({ name: 'text' });

module.exports = mongoose.model('Customer', customerSchema);
