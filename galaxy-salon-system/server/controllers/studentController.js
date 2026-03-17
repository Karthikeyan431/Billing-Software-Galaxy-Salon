const Student = require('../models/Student');

exports.getAll = async (req, res) => {
  try {
    const { course, status, page = 1, limit = 20 } = req.query;
    const query = {};
    if (course) query.course = course;
    if (status) query.status = status;

    const students = await Student.find(query)
      .populate('course', 'courseName duration fee')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Student.countDocuments(query);
    res.json({ students, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate('course');
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json({ student });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const student = await Student.create(req.body);
    const populated = await Student.findById(student._id).populate('course');
    res.status(201).json({ student: populated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('course');
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json({ student });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.addFeePayment = async (req, res) => {
  try {
    const { amount, method } = req.body;
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    student.feePayments.push({ amount, method, date: new Date() });
    student.feePaid += Number(amount);
    await student.save();

    res.json({ student });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.markAttendance = async (req, res) => {
  try {
    const { date, present } = req.body;
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const existingIndex = student.attendance.findIndex(
      a => new Date(a.date).toDateString() === new Date(date).toDateString()
    );

    if (existingIndex >= 0) {
      student.attendance[existingIndex].present = present;
    } else {
      student.attendance.push({ date: new Date(date), present });
    }

    await student.save();
    res.json({ student });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.issueCertificate = async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { certificateIssued: true, status: 'completed' },
      { new: true }
    ).populate('course');

    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json({ student, message: 'Certificate issued successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    res.json({ message: 'Student deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
