const Product = require('../models/Product');
const { escapeRegex } = require('../utils/escapeRegex');

exports.getAll = async (req, res) => {
  try {
    const { category, lowStock, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (category) query.category = category;
    if (lowStock === 'true') query.$expr = { $lte: ['$stock', '$lowStockThreshold'] };
    if (search) {
      const term = escapeRegex(search);
      query.$or = [
        { productName: { $regex: term, $options: 'i' } },
        { barcode: { $regex: term, $options: 'i' } },
      ];
    }

    const products = await Product.find(query)
      .sort({ productName: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Product.countDocuments(query);
    res.json({ products, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getByBarcode = async (req, res) => {
  try {
    const product = await Product.findOne({ barcode: req.params.code, isActive: true });
    if (!product) return res.status(404).json({ error: 'Product not found for this barcode' });
    res.json({ product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateStock = async (req, res) => {
  try {
    const { quantity, operation } = req.body; // operation: 'add' or 'subtract'
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    if (operation === 'add') {
      product.stock += Number(quantity);
    } else if (operation === 'subtract') {
      if (product.stock < quantity) {
        return res.status(400).json({ error: 'Insufficient stock' });
      }
      product.stock -= Number(quantity);
    }

    await product.save();
    res.json({ product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getLowStock = async (req, res) => {
  try {
    const products = await Product.find({
      $expr: { $lte: ['$stock', '$lowStockThreshold'] },
      isActive: true,
    });
    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
