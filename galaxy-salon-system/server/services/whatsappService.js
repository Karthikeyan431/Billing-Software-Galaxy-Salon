const axios = require('axios');

const API_URL = process.env.WHATSAPP_API_URL;
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

const sendMessage = async (to, text) => {
  if (!TOKEN || !PHONE_ID) {
    console.log('WhatsApp API not configured. Message:', text);
    return { success: false, reason: 'WhatsApp API not configured' };
  }

  // Ensure phone number is in international format
  const phone = to.startsWith('+') ? to.replace('+', '') : `91${to}`;

  try {
    const response = await axios.post(
      `${API_URL}/${PHONE_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return { success: true, messageId: response.data.messages?.[0]?.id };
  } catch (error) {
    console.error('WhatsApp API Error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
};

exports.sendBillReceipt = async (phone, billData) => {
  const message = `Hello ${billData.customerName || 'Valued Customer'}!\n\n` +
    `Thank you for visiting ${process.env.BUSINESS_NAME || 'Galaxy Unisex Saloon'}.\n\n` +
    `Bill No: ${billData.billNumber}\n` +
    `Date: ${new Date().toLocaleDateString('en-IN')}\n\n` +
    `${(billData.services || []).map(s => `${s.serviceName} - ₹${s.price}`).join('\n')}\n` +
    `${(billData.products || []).map(p => `${p.productName} x${p.quantity} - ₹${p.price * p.quantity}`).join('\n')}\n\n` +
    `Subtotal: ₹${billData.subtotal}\n` +
    `Discount: ₹${billData.discount || 0}\n` +
    `Total: ₹${billData.totalAmount}\n` +
    `Payment: ${billData.paymentMethod}\n\n` +
    `Visit Again! 🙏`;

  return sendMessage(phone, message);
};

exports.sendAppointmentReminder = async (phone, appointmentData) => {
  const message = `Hello ${appointmentData.customerName}!\n\n` +
    `Reminder: Your appointment is scheduled.\n\n` +
    `Service: ${appointmentData.serviceName}\n` +
    `Date: ${new Date(appointmentData.date).toLocaleDateString('en-IN')}\n` +
    `Time: ${appointmentData.time}\n` +
    `${appointmentData.employeeName ? `Stylist: ${appointmentData.employeeName}` : ''}\n\n` +
    `${process.env.BUSINESS_NAME || 'Galaxy Unisex Saloon'}\n` +
    `📞 ${process.env.BUSINESS_PHONE || ''}`;

  return sendMessage(phone, message);
};

exports.sendBulkPromotion = async (phones, messageText) => {
  const results = [];
  for (const phone of phones) {
    const result = await sendMessage(phone, messageText);
    results.push({ phone, ...result });
    // Rate limit: wait 1 second between messages
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return results;
};
