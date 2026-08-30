const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { auth } = require('../middleware/auth');

/**
 * Razorpay is constructed lazily.
 *
 * `new Razorpay({key_id: undefined})` THROWS ("`key_id` or `oauthToken` is mandatory").
 * Doing that at module load meant that if RAZORPAY_KEY_ID was missing from the Render
 * dashboard, the whole process died during require() — before app.listen() ever ran — and
 * Render failed the deploy with "No open ports detected". Payments are optional, so a
 * missing key must degrade to a 503 on /api/payment/* rather than take the API down.
 */
let razorpayClient = null;

const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null;
  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayClient;
};

const requireRazorpay = (req, res, next) => {
  if (!getRazorpay()) {
    return res.status(503).json({
      error: 'Online payments are not configured on this server.',
      code: 'PAYMENT_NOT_CONFIGURED',
    });
  }
  next();
};

// @route   POST /api/payment/create-order
// @desc    Create a Razorpay order
router.post('/create-order', auth, requireRazorpay, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const options = {
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency: 'INR',
      receipt: `rcpt_${Date.now()}`,
    };

    const order = await getRazorpay().orders.create(options);
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Razorpay order error:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// @route   POST /api/payment/verify
// @desc    Verify Razorpay payment signature
router.post('/verify', auth, requireRazorpay, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature === razorpay_signature) {
      res.json({ verified: true, paymentId: razorpay_payment_id });
    } else {
      res.status(400).json({ verified: false, error: 'Payment verification failed' });
    }
  } catch (error) {
    console.error('Razorpay verify error:', error);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

module.exports = router;
