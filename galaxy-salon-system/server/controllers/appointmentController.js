const Appointment = require('../models/Appointment');

exports.getAll = async (req, res) => {
  try {
    const { date, status, employee, page = 1, limit = 50 } = req.query;
    const query = {};

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }
    if (status) query.status = status;
    if (employee) query.employee = employee;

    const appointments = await Appointment.find(query)
      .populate('customer', 'name phone')
      .populate('service', 'serviceName duration price')
      .populate('employee', 'name')
      .sort({ date: 1, time: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Appointment.countDocuments(query);
    res.json({ appointments, total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('customer')
      .populate('service')
      .populate('employee');

    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ appointment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const appointment = await Appointment.create(req.body);
    const populated = await Appointment.findById(appointment._id)
      .populate('customer', 'name phone')
      .populate('service', 'serviceName duration price')
      .populate('employee', 'name');

    res.status(201).json({ appointment: populated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate('customer', 'name phone')
      .populate('service', 'serviceName duration price')
      .populate('employee', 'name');

    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ appointment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.cancel = async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    );
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ appointment });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getToday = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointments = await Appointment.find({
      date: { $gte: today, $lt: tomorrow },
      status: { $nin: ['cancelled'] },
    })
      .populate('customer', 'name phone')
      .populate('service', 'serviceName duration price')
      .populate('employee', 'name')
      .sort({ time: 1 });

    res.json({ appointments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
