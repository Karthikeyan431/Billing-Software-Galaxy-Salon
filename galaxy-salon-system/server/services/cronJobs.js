const cron = require('node-cron');
const Appointment = require('../models/Appointment');
const whatsappService = require('./whatsappService');

const start = () => {
  // Send appointment reminders daily at 8 AM for next day's appointments
  cron.schedule('0 8 * * *', async () => {
    try {
      console.log('[CRON] Sending appointment reminders...');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const dayAfter = new Date(tomorrow);
      dayAfter.setDate(dayAfter.getDate() + 1);

      const appointments = await Appointment.find({
        date: { $gte: tomorrow, $lt: dayAfter },
        status: { $in: ['scheduled', 'confirmed'] },
        reminderSent: false,
      }).populate('customer').populate('service').populate('employee');

      for (const apt of appointments) {
        if (apt.customer?.phone) {
          await whatsappService.sendAppointmentReminder(apt.customer.phone, {
            customerName: apt.customerName || apt.customer.name,
            serviceName: apt.serviceName || apt.service?.serviceName,
            date: apt.date,
            time: apt.time,
            employeeName: apt.employeeName || apt.employee?.name,
          });

          apt.reminderSent = true;
          await apt.save();
        }
      }

      console.log(`[CRON] Sent ${appointments.length} reminders.`);
    } catch (error) {
      console.error('[CRON] Reminder error:', error.message);
    }
  }, {
    // Containers run in UTC, so '0 8 * * *' fired at 1:30 PM IST, not 8 AM local.
    timezone: process.env.TZ || 'Asia/Kolkata',
  });

  console.log(`[CRON] Scheduled jobs started (timezone: ${process.env.TZ || 'Asia/Kolkata'}).`);
};

module.exports = { start };
