const Bill = require('../models/Bill');
const Customer = require('../models/Customer');
const Appointment = require('../models/Appointment');
const Product = require('../models/Product');
const Employee = require('../models/Employee');

exports.getDashboard = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

    // Today's stats
    const todayBills = await Bill.find({ createdAt: { $gte: today, $lt: tomorrow }, status: 'completed' });
    const todayRevenue = todayBills.reduce((sum, b) => sum + b.totalAmount, 0);

    // Month stats
    const monthBills = await Bill.find({ createdAt: { $gte: monthStart, $lte: monthEnd }, status: 'completed' });
    const monthRevenue = monthBills.reduce((sum, b) => sum + b.totalAmount, 0);

    // Today's appointments
    const todayAppointments = await Appointment.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      status: { $nin: ['cancelled'] },
    });

    // Low stock products
    const lowStockCount = await Product.countDocuments({
      $expr: { $lte: ['$stock', '$lowStockThreshold'] },
      isActive: true,
    });

    // Total customers
    const totalCustomers = await Customer.countDocuments();

    // Total employees
    const activeEmployees = await Employee.countDocuments({ isActive: true });

    res.json({
      todayRevenue,
      todayBillCount: todayBills.length,
      monthRevenue,
      monthBillCount: monthBills.length,
      todayAppointments,
      lowStockCount,
      totalCustomers,
      activeEmployees,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSalesReport = async (req, res) => {
  try {
    const { period = 'month', groupBy = 'day' } = req.query;

    let start = new Date();
    let end = new Date();

    // Calculate date range based on period
    if (period === 'week') {
      start.setDate(start.getDate() - 7);
    } else if (period === 'month') {
      start.setMonth(start.getMonth() - 1);
    } else if (period === 'year') {
      start.setFullYear(start.getFullYear() - 1);
    }

    let dateFormat;
    if (groupBy === 'day') dateFormat = '%Y-%m-%d';
    else if (groupBy === 'week') dateFormat = '%Y-W%V';
    else dateFormat = '%Y-%m';

    const salesData = await Bill.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end }, status: 'completed' } },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          totalRevenue: { $sum: '$totalAmount' },
          totalBills: { $sum: 1 },
          totalDiscount: { $sum: '$discount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totalRevenue = salesData.reduce((sum, d) => sum + d.totalRevenue, 0);
    const totalBills = salesData.reduce((sum, d) => sum + d.totalBills, 0);

    res.json({ data: salesData, totalRevenue, totalBills });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTopServices = async (req, res) => {
  try {
    const { startDate, endDate, limit = 8 } = req.query;
    const match = { status: 'completed' };

    if (startDate && endDate) {
      match.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const topServices = await Bill.aggregate([
      { $match: match },
      { $unwind: '$services' },
      {
        $group: {
          _id: '$services.serviceName',
          count: { $sum: 1 },
          revenue: { $sum: '$services.price' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) },
    ]);

    res.json({ data: topServices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTopProducts = async (req, res) => {
  try {
    const { startDate, endDate, limit = 8 } = req.query;
    const match = { status: 'completed' };

    if (startDate && endDate) {
      match.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const topProducts = await Bill.aggregate([
      { $match: match },
      { $unwind: '$products' },
      {
        $group: {
          _id: '$products.productName',
          count: { $sum: '$products.quantity' },
          revenue: { $sum: { $multiply: ['$products.price', '$products.quantity'] } },
        },
      },
      { $sort: { count: -1 } },
      { $limit: parseInt(limit) },
    ]);

    res.json({ data: topProducts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getPaymentMethodBreakdown = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const match = { status: 'completed' };

    if (startDate && endDate) {
      match.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const breakdown = await Bill.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$paymentMethod',
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({ data: breakdown });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getEmployeePerformance = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const match = { status: 'completed' };

    if (startDate && endDate) {
      match.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const performance = await Bill.aggregate([
      { $match: match },
      { $unwind: '$services' },
      {
        $group: {
          _id: '$services.employeeName',
          count: { $sum: 1 },
          total: { $sum: '$services.price' },
        },
      },
      { $sort: { total: -1 } },
    ]);

    res.json({ data: performance });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
