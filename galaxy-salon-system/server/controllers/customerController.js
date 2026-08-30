const Customer = require('../models/Customer');
const { escapeRegex } = require('../utils/escapeRegex');

exports.getAll = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (search) {
      const term = escapeRegex(search);
      query.$or = [
        { name: { $regex: term, $options: 'i' } },
        { phone: { $regex: term, $options: 'i' } },
      ];
    }

    const customers = await Customer.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Customer.countDocuments(query);

    res.json({ customers, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ customer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.searchByPhone = async (req, res) => {
  try {
    const { phone } = req.params;
    const customer = await Customer.findOne({ phone: { $regex: escapeRegex(phone), $options: 'i' } });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ customer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.quickSearch = async (req, res) => {
  try {
    const { query } = req.params;
    if (!query || query.trim().length < 2) return res.json({ customers: [] });
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const customers = await Customer.find({
      $or: [
        { name: { $regex: escaped, $options: 'i' } },
        { phone: { $regex: escaped, $options: 'i' } },
      ],
    }).select('name phone email loyaltyPoints').limit(6).lean();
    res.json({ customers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, phone, email, notes } = req.body;

    const existing = await Customer.findOne({ phone });
    if (existing) {
      return res.status(400).json({ error: 'Customer with this phone already exists' });
    }

    const customer = await Customer.create({ name, phone, email, notes });
    res.status(201).json({ customer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ customer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json({ message: 'Customer deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getBillHistory = async (req, res) => {
  try {
    const Bill = require('../models/Bill');
    const bills = await Bill.find({ customer: req.params.id }).sort({ createdAt: -1 });
    res.json({ bills });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
