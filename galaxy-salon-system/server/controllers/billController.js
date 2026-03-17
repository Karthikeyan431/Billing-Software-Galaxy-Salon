const mongoose = require('mongoose');
const Bill = require('../models/Bill');
const Product = require('../models/Product');
const Customer = require('../models/Customer');

exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate, paymentMethod } = req.query;
    const query = {};

    if (startDate && endDate) {
      query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (paymentMethod) query.paymentMethod = paymentMethod;

    const bills = await Bill.find(query)
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Bill.countDocuments(query);
    res.json({ bills, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate([
        { path: 'customer' },
        { path: 'services.service' },
        { path: 'services.employee' },
        { path: 'products.product' },
      ]);

    if (!bill) return res.status(404).json({ error: 'Bill not found' });
    res.json({ bill });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      customer, customerName, customerPhone,
      services, products,
      subtotal, discount, discountType, tax, taxRate,
      totalAmount, paymentMethod, splitPayment,
    } = req.body;

    // Validate and reduce product stock (within transaction)
    for (const item of (products || [])) {
      const product = await Product.findById(item.product).session(session);
      if (!product) {
        await session.abortTransaction();
        return res.status(400).json({ error: `Product ${item.productName} not found` });
      }
      if (product.stock < (item.quantity || 1)) {
        await session.abortTransaction();
        return res.status(400).json({ error: `Insufficient stock for ${product.productName}` });
      }
      product.stock -= (item.quantity || 1);
      await product.save({ session });
    }

    // Create bill within transaction
    const bill = await Bill.create(
      [{
        customer, customerName, customerPhone,
        services, products,
        subtotal, discount, discountType, tax, taxRate,
        totalAmount, paymentMethod, splitPayment,
        createdBy: req.user._id,
      }],
      { session }
    );

    // Update customer visit history & loyalty points within transaction
    if (customer) {
      const loyaltyPoints = Math.floor(totalAmount / 100); // 1 point per ₹100
      await Customer.findByIdAndUpdate(
        customer,
        {
          $push: { visitHistory: { date: new Date(), billId: bill[0]._id } },
          $inc: { loyaltyPoints },
        },
        { session }
      );
    }

    await session.commitTransaction();

    const populatedBill = await Bill.findById(bill[0]._id)
      .populate('customer', 'name phone')
      .populate('createdBy', 'name');

    res.status(201).json({ bill: populatedBill });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

exports.cancel = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const bill = await Bill.findById(req.params.id).session(session);
    if (!bill) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Bill not found' });
    }

    if (bill.status === 'cancelled') {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Bill already cancelled' });
    }

    // Restore product stock within transaction
    for (const item of bill.products) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: item.quantity || 1 } },
        { session }
      );
    }

    // Reverse loyalty points within transaction
    if (bill.customer) {
      const loyaltyPoints = Math.floor(bill.totalAmount / 100);
      await Customer.findByIdAndUpdate(
        bill.customer,
        { $inc: { loyaltyPoints: -loyaltyPoints } },
        { session }
      );
    }

    bill.status = 'cancelled';
    await bill.save({ session });

    await session.commitTransaction();
    res.json({ bill });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

exports.getDailySummary = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const bills = await Bill.find({
      createdAt: { $gte: today, $lt: tomorrow },
      status: 'completed',
    });

    const summary = {
      totalBills: bills.length,
      totalRevenue: bills.reduce((sum, b) => sum + b.totalAmount, 0),
      cashAmount: bills.filter(b => b.paymentMethod === 'cash').reduce((sum, b) => sum + b.totalAmount, 0),
      upiAmount: bills.filter(b => b.paymentMethod === 'upi').reduce((sum, b) => sum + b.totalAmount, 0),
      cardAmount: bills.filter(b => b.paymentMethod === 'card').reduce((sum, b) => sum + b.totalAmount, 0),
      totalDiscount: bills.reduce((sum, b) => sum + (b.discount || 0), 0),
    };

    res.json({ summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
