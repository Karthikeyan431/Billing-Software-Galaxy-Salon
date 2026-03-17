const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerName: { type: String },
  customerPhone: { type: String },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  serviceName: { type: String },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  employeeName: { type: String },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  duration: { type: Number }, // minutes
  status: {
    type: String,
    enum: ['scheduled', 'confirmed', 'in-progress', 'completed', 'cancelled', 'no-show'],
    default: 'scheduled',
  },
  notes: { type: String },
  reminderSent: { type: Boolean, default: false },
}, { timestamps: true });

appointmentSchema.index({ date: 1, time: 1 });
appointmentSchema.index({ employee: 1, date: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
