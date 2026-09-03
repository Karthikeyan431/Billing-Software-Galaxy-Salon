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
  const {
    customer, customerName, customerPhone,
    services, products,
    subtotal, discount, discountType, tax, taxRate,
    totalAmount, paymentMethod, splitPayment, clientRef, offlineCreatedAt,
  } = req.body;

  // A bill queued on an offline till is replayed later — sometimes the next morning. Stamping
  // it with the sync time would drop the sale into the wrong day's summary and leave the cash
  // drawer unreconcilable, so the client sends the real sale time and we honour it. Bounded
  // deliberately: only a past timestamp within the last 30 days is accepted, so a wrong device
  // clock (or a tampered request) cannot backdate revenue into a closed reporting period.
  const saleTime = (() => {
    if (!offlineCreatedAt) return null;
    const parsed = new Date(offlineCreatedAt);
    if (Number.isNaN(parsed.getTime())) return null;
    const now = Date.now();
    const ageMs = now - parsed.getTime();
    if (ageMs < -5 * 60 * 1000) return null;          // more than 5 min in the future
    if (ageMs > 30 * 24 * 60 * 60 * 1000) return null; // older than 30 days
    return parsed;
  })();

  // Idempotency: the offline POS queues bills locally and replays them when the
  // network returns, so the same bill can legitimately arrive twice. Answer a
  // replay with the bill we already have -- checked BEFORE the transaction so a
  // duplicate never decrements stock or awards loyalty points a second time.
  if (clientRef) {
    try {
      const existingBill = await Bill.findOne({ clientRef })
        .populate('customer', 'name phone')
        .populate('createdBy', 'name');

      if (existingBill) {
        return res.status(200).json({ bill: existingBill, duplicate: true });
      }
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
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
        clientRef,
        createdBy: req.user._id,
        // Only set when replaying an offline bill; timestamps are disabled for that write so
        // Mongoose does not overwrite the sale time with the current time.
        ...(saleTime ? { createdAt: saleTime, updatedAt: new Date() } : {}),
      }],
      saleTime ? { session, timestamps: false } : { session }
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

    // Replay race: two copies of the same queued bill land at once, both clear the
    // findOne above, and the loser's commit trips the unique clientRef index. The
    // winner already wrote the real bill, so return that instead of a 500 -- a 500
    // would make the client keep retrying a bill that has in fact been saved.
    // Mongoose can surface the driver error nested under `cause` on a transaction,
    // so check both places for the 11000 duplicate-key code.
    const isDuplicateKey = error.code === 11000 || (error.cause && error.cause.code === 11000);
    if (clientRef && isDuplicateKey) {
      try {
        const existingBill = await Bill.findOne({ clientRef })
          .populate('customer', 'name phone')
          .populate('createdBy', 'name');

        if (existingBill) {
          return res.status(200).json({ bill: existingBill, duplicate: true });
        }
      } catch (lookupError) {
        // Fall through to the generic 500 below with the original error.
      }
    }

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
