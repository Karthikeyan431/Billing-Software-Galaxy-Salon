const express = require('express');
const router = express.Router();
const AIAnalytics = require('../../ai-module/analytics/aiAnalytics');
const SalonChatbot = require('../../ai-module/chatbot/salonChatbot');
const { auth, adminOnly } = require('../middleware/auth');

const chatbot = new SalonChatbot();

// @route   GET /api/ai/insights
// @desc    Get full business insights (admin only)
router.get('/insights', auth, adminOnly, async (req, res) => {
  try {
    const insights = await AIAnalytics.getBusinessInsights();
    res.json(insights);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

// @route   GET /api/ai/revenue-prediction
router.get('/revenue-prediction', auth, adminOnly, async (req, res) => {
  try {
    const prediction = await AIAnalytics.predictRevenue();
    res.json(prediction);
  } catch (error) {
    res.status(500).json({ error: 'Failed to predict revenue' });
  }
});

// @route   GET /api/ai/churn-risk
router.get('/churn-risk', auth, adminOnly, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 60;
    const customers = await AIAnalytics.getChurnRiskCustomers(days);
    res.json({ count: customers.length, customers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get churn risk data' });
  }
});

// @route   GET /api/ai/recommendations/:customerId
router.get('/recommendations/:customerId', auth, async (req, res) => {
  try {
    const recs = await AIAnalytics.getServiceRecommendations(req.params.customerId);
    res.json(recs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// @route   GET /api/ai/peak-hours
router.get('/peak-hours', auth, async (req, res) => {
  try {
    const data = await AIAnalytics.getPeakHoursAnalysis();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze peak hours' });
  }
});

// @route   GET /api/ai/inventory-insights
router.get('/inventory-insights', auth, async (req, res) => {
  try {
    const data = await AIAnalytics.getInventoryInsights();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get inventory insights' });
  }
});

// @route   POST /api/ai/chat
// @desc    Chatbot endpoint
router.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string' || message.length > 500) {
      return res.status(400).json({ error: 'Invalid message' });
    }
    const response = await chatbot.processMessage(message);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Chatbot error' });
  }
});

module.exports = router;
