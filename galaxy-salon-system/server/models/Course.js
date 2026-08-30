const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  courseName: { type: String, required: true, trim: true },
  duration: { type: String, required: true }, // e.g. "3 months"
  fee: { type: Number, required: true },
  description: { type: String },
  syllabus: [{ type: String }],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// List endpoints sort by createdAt desc; unindexed sorts block on Render's shared CPU.
courseSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Course', courseSchema);
