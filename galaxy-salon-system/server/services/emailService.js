/**
 * Email Notification Service for Galaxy Salon System
 * Sends transactional emails for bills, appointments, courses, etc.
 */

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize the SMTP transporter
   */
  initializeTransporter() {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn('Email service: SMTP credentials not configured. Email notifications disabled.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465', // true for 465, false for others
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  /**
   * Check if email service is available
   */
  isAvailable() {
    return this.transporter !== null;
  }

  /**
   * Send email (generic method)
   */
  async sendEmail(to, subject, htmlContent) {
    if (!this.isAvailable()) {
      console.warn(`Email skipped (not configured): ${to}`);
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        html: htmlContent,
      });
      return true;
    } catch (error) {
      console.error('Email send failed:', error);
      return false;
    }
  }

  /**
   * Send bill receipt email
   */
  async sendBillReceipt(customer, bill) {
    if (!customer?.email) return false;

    const itemsHtml = `
      ${(bill.services || []).map(s => `
        <tr>
          <td>${s.serviceName}</td>
          <td>₹${s.price}</td>
        </tr>
      `).join('')}
      ${(bill.products || []).map(p => `
        <tr>
          <td>${p.productName} (x${p.quantity})</td>
          <td>₹${p.price * (p.quantity || 1)}</td>
        </tr>
      `).join('')}
    `;

    const htmlContent = `
      <h2>Bill Receipt</h2>
      <p>Dear ${customer.name},</p>
      <p>Thank you for your visit at ${process.env.BUSINESS_NAME}!</p>
      
      <h3>Bill Details</h3>
      <p><strong>Bill ID:</strong> ${bill._id}</p>
      <p><strong>Date:</strong> ${new Date(bill.createdAt).toLocaleString()}</p>
      
      <table border="1" cellpadding="10" cellspacing="0">
        <tr style="background: #f0f0f0;">
          <th>Item</th>
          <th>Amount</th>
        </tr>
        ${itemsHtml}
      </table>
      
      <h3>Summary</h3>
      <p><strong>Subtotal:</strong> ₹${bill.subtotal}</p>
      ${bill.discount ? `<p><strong>Discount:</strong> ₹${bill.discount}</p>` : ''}
      ${bill.tax ? `<p><strong>Tax:</strong> ₹${bill.tax}</p>` : ''}
      <p style="font-weight: bold; font-size: 16px;"><strong>Total:</strong> ₹${bill.totalAmount}</p>
      <p><strong>Payment Method:</strong> ${bill.paymentMethod}</p>
      
      ${bill.loyaltyPoints ? `<p>🎯 <strong>Loyalty Points Earned:</strong> ${bill.loyaltyPoints}</p>` : ''}
      
      <p>Thank you for choosing us!</p>
      <p>
        <strong>${process.env.BUSINESS_NAME}</strong><br/>
        ${process.env.BUSINESS_ADDRESS}<br/>
        ${process.env.BUSINESS_PHONE}
      </p>
    `;

    return this.sendEmail(customer.email, `Bill Receipt - ${process.env.BUSINESS_NAME}`, htmlContent);
  }

  /**
   * Send appointment confirmation email
   */
  async sendAppointmentConfirmation(customer, appointment) {
    if (!customer?.email) return false;

    const appointmentDate = new Date(appointment.date);
    const htmlContent = `
      <h2>Appointment Confirmation</h2>
      <p>Dear ${customer.name},</p>
      <p>Your appointment has been confirmed at ${process.env.BUSINESS_NAME}!</p>
      
      <h3>Appointment Details</h3>
      <p><strong>Service:</strong> ${appointment.serviceName}</p>
      <p><strong>Date:</strong> ${appointmentDate.toLocaleDateString()}</p>
      <p><strong>Time:</strong> ${appointment.time}</p>
      ${appointment.employeeName ? `<p><strong>Specialist:</strong> ${appointment.employeeName}</p>` : ''}
      ${appointment.notes ? `<p><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
      
      <p>
        <strong>${process.env.BUSINESS_NAME}</strong><br/>
        ${process.env.BUSINESS_ADDRESS}<br/>
        ${process.env.BUSINESS_PHONE}
      </p>
      
      <p>If you need to reschedule or cancel, please contact us!</p>
    `;

    return this.sendEmail(customer.email, `Appointment Confirmation - ${process.env.BUSINESS_NAME}`, htmlContent);
  }

  /**
   * Send course enrollment confirmation
   */
  async sendCourseEnrollment(student, course) {
    if (!student?.email) return false;

    const htmlContent = `
      <h2>Course Enrollment Confirmation</h2>
      <p>Dear ${student.name},</p>
      <p>Welcome to the ${course.courseName} course at ${process.env.BUSINESS_NAME} Academy!</p>
      
      <h3>Course Details</h3>
      <p><strong>Course:</strong> ${course.courseName}</p>
      <p><strong>Duration:</strong> ${course.duration} hours</p>
      <p><strong>Fee:</strong> ₹${course.fee}</p>
      ${course.description ? `<p><strong>Description:</strong> ${course.description}</p>` : ''}
      
      <p>We look forward to seeing you soon!</p>
      <p>
        <strong>${process.env.BUSINESS_NAME} Academy</strong><br/>
        ${process.env.BUSINESS_ADDRESS}<br/>
        ${process.env.BUSINESS_PHONE}
      </p>
    `;

    return this.sendEmail(student.email, `Course Enrollment - ${process.env.BUSINESS_NAME}`, htmlContent);
  }

  /**
   * Send payment confirmation email
   */
  async sendPaymentConfirmation(customer, bill, paymentRef) {
    if (!customer?.email) return false;

    const htmlContent = `
      <h2>Payment Confirmation</h2>
      <p>Dear ${customer.name},</p>
      <p>Your payment has been received and confirmed.</p>
      
      <h3>Payment Details</h3>
      <p><strong>Bill ID:</strong> ${bill._id}</p>
      <p><strong>Amount:</strong> ₹${bill.totalAmount}</p>
      <p><strong>Payment Method:</strong> ${bill.paymentMethod}</p>
      <p><strong>Reference:</strong> ${paymentRef}</p>
      <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
      
      <p>Thank you for your payment!</p>
      <p>
        <strong>${process.env.BUSINESS_NAME}</strong><br/>
        ${process.env.BUSINESS_ADDRESS}<br/>
        ${process.env.BUSINESS_PHONE}
      </p>
    `;

    return this.sendEmail(customer.email, `Payment Confirmation - ${process.env.BUSINESS_NAME}`, htmlContent);
  }

  /**
   * Send verification/reset email (with token)
   */
  async sendVerificationEmail(email, verificationUrl, type = 'verify') {
    const subject = type === 'reset' ? 'Password Reset Request' : 'Email Verification';
    const heading = type === 'reset' ? 'Reset Your Password' : 'Verify Your Email';
    const message = type === 'reset' ?
      'You requested a password reset. Click the link below to reset your password:' :
      'Please verify your email address by clicking the link below:';

    const htmlContent = `
      <h2>${heading}</h2>
      <p>${message}</p>
      <p><a href="${verificationUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
        ${type === 'reset' ? 'Reset Password' : 'Verify Email'}
      </a></p>
      <p>Or copy this link: ${verificationUrl}</p>
      <p>This link expires in 24 hours.</p>
      <p>
        <strong>${process.env.BUSINESS_NAME}</strong><br/>
        ${process.env.BUSINESS_PHONE}
      </p>
    `;

    return this.sendEmail(email, subject, htmlContent);
  }
}

// Export singleton instance
module.exports = new EmailService();
