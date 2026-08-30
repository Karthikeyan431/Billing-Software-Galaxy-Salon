const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  role: {
    type: String,
    enum: ['Hair Stylist', 'Beautician', 'Nail Artist', 'Therapist', 'Receptionist', 'Manager'],
    required: true,
  },
  phone: { type: String, required: true, trim: true },
  email: { type: String, trim: true },
  commissionRate: { type: Number, default: 0 }, // percentage
  salary: { type: Number, default: 0 },
  joiningDate: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// List endpoints sort by createdAt desc; unindexed sorts block on Render's shared CPU.
employeeSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Employee', employeeSchema);
