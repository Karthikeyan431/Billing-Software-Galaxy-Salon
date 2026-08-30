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

// List endpoints sort by createdAt desc; unindexed sorts block on Render's shared CPU.
serviceSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Service', serviceSchema);
