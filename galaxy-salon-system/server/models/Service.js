const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  serviceName: { type: String, required: true, trim: true },
  duration: { type: Number, required: true }, // in minutes
  price: { type: Number, required: true },
  category: {
    type: String,
    enum: ['Hair', 'Skin', 'Facial', 'Makeup', 'Nail', 'Spa', 'Other'],
    required: true,
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Service', serviceSchema);
