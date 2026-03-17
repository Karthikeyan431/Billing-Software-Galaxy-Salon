const router = require('express').Router();
const whatsappService = require('../services/whatsappService');
const { auth, adminOnly } = require('../middleware/auth');

router.use(auth);

router.post('/send-receipt', async (req, res) => {
  try {
    const { phone, billData } = req.body;
    await whatsappService.sendBillReceipt(phone, billData);
    res.json({ message: 'Receipt sent via WhatsApp' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/send-reminder', async (req, res) => {
  try {
    const { phone, appointmentData } = req.body;
    await whatsappService.sendAppointmentReminder(phone, appointmentData);
    res.json({ message: 'Reminder sent via WhatsApp' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/send-promotion', adminOnly, async (req, res) => {
  try {
    const { phones, message } = req.body;
    const results = await whatsappService.sendBulkPromotion(phones, message);
    res.json({ message: 'Promotional messages sent', results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
