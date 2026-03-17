const Service = require('../models/Service');

exports.getAll = async (req, res) => {
  try {
    const { category, active, page = 1, limit = 20 } = req.query;
    const query = {};
    if (category) query.category = category;
    if (active !== undefined) query.isActive = active === 'true';

    const services = await Service.find(query)
      .sort({ category: 1, serviceName: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Service.countDocuments(query);

    res.json({
      services,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json({ service });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const service = await Service.create(req.body);
    res.status(201).json({ service });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json({ service });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json({ message: 'Service deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
