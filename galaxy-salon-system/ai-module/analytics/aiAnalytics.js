const Bill = require('../../server/models/Bill');
const Customer = require('../../server/models/Customer');
const Service = require('../../server/models/Service');
const Product = require('../../server/models/Product');

/**
 * AI-powered analytics for the salon business.
 * Uses statistical methods for predictions and recommendations.
 */
class AIAnalytics {
  /**
   * Predict next month's revenue based on historical trends (simple moving average)
   */
  static async predictRevenue() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyRevenue = await Bill.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: sixMonthsAgo } } },
      { $group: { _id: { $month: '$createdAt' }, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    if (monthlyRevenue.length < 2) return { predicted: 0, trend: 'insufficient_data', history: monthlyRevenue };

    const totals = monthlyRevenue.map(m => m.total);
    const avg = totals.reduce((a, b) => a + b, 0) / totals.length;
    const lastMonth = totals[totals.length - 1];
    const trend = lastMonth > avg ? 'growing' : lastMonth < avg * 0.9 ? 'declining' : 'stable';

    // Weighted moving average (recent months weigh more)
    const weights = totals.map((_, i) => i + 1);
    const weightSum = weights.reduce((a, b) => a + b, 0);
    const predicted = Math.round(totals.reduce((sum, val, i) => sum + val * weights[i], 0) / weightSum);

    return { predicted, trend, average: Math.round(avg), history: monthlyRevenue };
  }

  /**
   * Identify customers at risk of churning (no visit in 60+ days)
   */
  static async getChurnRiskCustomers(days = 60) {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - days);

    const customers = await Customer.find({
      lastVisit: { $lt: threshold, $exists: true },
      isActive: true
    }).sort({ lastVisit: 1 }).limit(50).lean();

    return customers.map(c => ({
      _id: c._id,
      name: c.name,
      phone: c.phone,
      lastVisit: c.lastVisit,
      daysSinceVisit: Math.floor((Date.now() - new Date(c.lastVisit)) / (1000 * 60 * 60 * 24)),
      totalVisits: c.totalVisits || 0,
      loyaltyPoints: c.loyaltyPoints || 0
    }));
  }

  /**
   * Recommend services to a customer based on their history
   */
  static async getServiceRecommendations(customerId) {
    const bills = await Bill.find({ customer: customerId, status: 'paid' })
      .sort({ createdAt: -1 }).limit(20).lean();

    // Count service frequency
    const freq = {};
    const categories = {};
    bills.forEach(b => {
      (b.services || []).forEach(s => {
        freq[s.serviceName] = (freq[s.serviceName] || 0) + 1;
        if (s.category) categories[s.category] = (categories[s.category] || 0) + 1;
      });
    });

    // Get top categories the customer uses
    const topCategories = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat);

    // Find services in preferred categories that the customer hasn't tried
    const triedServices = Object.keys(freq);
    const recommended = await Service.find({
      category: { $in: topCategories },
      name: { $nin: triedServices },
      isActive: true
    }).limit(5).lean();

    return {
      frequentServices: Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5),
      preferredCategories: topCategories,
      recommended
    };
  }

  /**
   * Analyze peak hours from billing data
   */
  static async getPeakHoursAnalysis() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const hourlyData = await Bill.aggregate([
      { $match: { status: 'paid', createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 }, revenue: { $sum: '$grandTotal' } } },
      { $sort: { count: -1 } }
    ]);

    const peakHour = hourlyData[0] || { _id: 0, count: 0 };
    const slowHour = hourlyData[hourlyData.length - 1] || { _id: 0, count: 0 };

    return {
      peakHour: { hour: peakHour._id, bills: peakHour.count },
      slowestHour: { hour: slowHour._id, bills: slowHour.count },
      hourlyBreakdown: hourlyData.sort((a, b) => a._id - b._id)
    };
  }

  /**
   * Get inventory reorder suggestions
   */
  static async getInventoryInsights() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Products sold in last 30 days
    const soldProducts = await Bill.aggregate([
      { $match: { status: 'paid', createdAt: { $gte: thirtyDaysAgo } } },
      { $unwind: '$products' },
      { $group: { _id: '$products.productName', totalSold: { $sum: '$products.quantity' } } },
      { $sort: { totalSold: -1 } }
    ]);

    // Low stock products
    const lowStock = await Product.find({
      $expr: { $lte: ['$stock', '$lowStockThreshold'] },
      isActive: true
    }).lean();

    // Suggest reorder quantities based on sales velocity
    const suggestions = lowStock.map(p => {
      const soldEntry = soldProducts.find(s => s._id === p.name);
      const monthlySales = soldEntry?.totalSold || 0;
      const suggestedReorder = Math.max(monthlySales * 2, p.lowStockThreshold * 3);
      return { product: p.name, currentStock: p.stock, monthlySales, suggestedReorder: Math.ceil(suggestedReorder) };
    });

    return { lowStock: lowStock.length, topSelling: soldProducts.slice(0, 5), reorderSuggestions: suggestions };
  }

  /**
   * Get a full business insights summary
   */
  static async getBusinessInsights() {
    const [revenue, churn, peakHours, inventory] = await Promise.all([
      this.predictRevenue(),
      this.getChurnRiskCustomers(),
      this.getPeakHoursAnalysis(),
      this.getInventoryInsights()
    ]);

    return {
      revenuePrediction: revenue,
      churnRisk: { count: churn.length, topAtRisk: churn.slice(0, 10) },
      peakHours,
      inventory
    };
  }
}

module.exports = AIAnalytics;
