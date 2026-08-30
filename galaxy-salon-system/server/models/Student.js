const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, trim: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  courseName: { type: String },
  enrollmentDate: { type: Date, default: Date.now },
  fee: { type: Number, required: true },
  feePaid: { type: Number, default: 0 },
  feePayments: [{
    amount: Number,
    date: { type: Date, default: Date.now },
    method: { type: String, enum: ['cash', 'upi', 'card'] },
  }],
  attendance: [{
    date: Date,
    present: Boolean,
  }],
  certificateIssued: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'completed', 'dropped'], default: 'active' },
}, { timestamps: true });

// List endpoints sort by createdAt desc; unindexed sorts block on Render's shared CPU.
studentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Student', studentSchema);
