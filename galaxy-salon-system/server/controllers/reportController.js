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

    // Sum revenue in the database instead of loading every bill of the month into Node and
    // reducing it here. Both aggregations are served by the { status, createdAt } index.
    const revenueFor = (from, to) => Bill.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: null, revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    ]);

    // Run everything concurrently. These were 7 sequential awaits, so the endpoint cost
    // 7 Atlas round trips end to end — painful on a free-tier instance far from the cluster.
    const [
      todayAgg,
      monthAgg,
      todayAppointments,
      lowStockCount,
      totalCustomers,
      activeEmployees,
    ] = await Promise.all([
      revenueFor(today, new Date(tomorrow.getTime() - 1)),
      revenueFor(monthStart, monthEnd),
      Appointment.countDocuments({
        date: { $gte: today, $lt: tomorrow },
        status: { $nin: ['cancelled'] },
      }),
      Product.countDocuments({
        $expr: { $lte: ['$stock', '$lowStockThreshold'] },
        isActive: true,
      }),
      Customer.estimatedDocumentCount(),
      Employee.countDocuments({ isActive: true }),
    ]);

    res.json({
      todayRevenue: todayAgg[0]?.revenue || 0,
      todayBillCount: todayAgg[0]?.count || 0,
      monthRevenue: monthAgg[0]?.revenue || 0,
      monthBillCount: monthAgg[0]?.count || 0,
      todayAppointments,
      lowStockCount,
      totalCustomers,
      activeEmployees,
    });
  } catch (error) {
    console.error('[reports] dashboard failed:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
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
