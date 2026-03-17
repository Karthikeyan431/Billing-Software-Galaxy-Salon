# Galaxy Salon System - Setup & Installation Guide

**Last Updated:** March 2026  
**Version:** 1.0.0

---

## 📋 Table of Contents

1. [System Requirements](#system-requirements)
2. [Pre-Installation Checklist](#pre-installation-checklist)
3. [Backend Setup](#backend-setup)
4. [Frontend Setup](#frontend-setup)
5. [Database Configuration](#database-configuration)
6. [External Integrations](#external-integrations)
7. [Running the Application](#running-the-application)
8. [Testing Credentials](#testing-credentials)
9. [Troubleshooting](#troubleshooting)
10. [Production Deployment](#production-deployment)

---

## System Requirements

- **Node.js:** v18.0 or higher
- **npm:** v9.0 or higher
- **MongoDB:** v5.0 or higher (MongoDB Atlas recommended for production)
- **RAM:** Minimum 2GB for development, 4GB+ for production
- **Disk Space:** Minimum 500MB free
- **OS:** Windows, macOS, or Linux

### Required External Services

- MongoDB Atlas (or local MongoDB)
- Razorpay Account (for payments)
- WhatsApp Business Account (for notifications)
- Gmail Account with App Password (for email notifications)
- Optional: Thermal Printer support

---

## Pre-Installation Checklist

Before starting installation, ensure you have:

- [ ] Node.js and npm installed
- [ ] Git installed (for version control)
- [ ] MongoDB Atlas account or local MongoDB running
- [ ] PostgreSQL or MongoDB installed locally (if not using Atlas)
- [ ] Text editor/IDE (VS Code recommended)
- [ ] Command line terminal access
- [ ] All API keys ready (Razorpay, WhatsApp, etc.)

---

## Backend Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-org/galaxy-salon-system.git
cd galaxy-salon-system/server
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` file with your values:**
   ```bash
   # Using your preferred editor (nano, vim, or VS Code)
   nano .env
   ```

3. **Fill in all required fields:**

   ```env
   # DATABASE
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/galaxy-salon-system

   # JWT
   JWT_SECRET=your-super-secret-key-minimum-32-characters-change-this
   JWT_EXPIRES_IN=7d

   # BUSINESS INFO
   BUSINESS_NAME=Galaxy Unisex Saloon & Beauty Academy
   BUSINESS_PHONE=+91-9876543210
   BUSINESS_EMAIL=info@galaxysalon.com
   BUSINESS_ADDRESS=Your Business Address

   # SMTP EMAIL (Gmail example)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM=noreply@galaxysalon.com

   # RAZORPAY
   RAZORPAY_KEY_ID=rzp_test_XXXXX
   RAZORPAY_KEY_SECRET=your-secret-key

   # WHATSAPP
   WHATSAPP_API_URL=https://graph.facebook.com/v18.0
   WHATSAPP_PHONE_NUMBER_ID=your-phone-id
   WHATSAPP_ACCESS_TOKEN=your-access-token
   WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-verify-token

   # SERVER
   NODE_ENV=development
   PORT=5000
   CLIENT_URL=http://localhost:3000
   ```

### 4. Test MongoDB Connection

```bash
npm run seed
```

This will:
- Connect to MongoDB
- Create collections
- Seed sample data
- Create default admin user

### 5. Start Backend Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

**Expected output:**
```
Galaxy Salon API running on port 5000
[CRON] Scheduled jobs started.
```

### 6. Verify API is Running

Open browser and go to:
- **Health Check:** `http://localhost:5000/api/health`
- **API Docs:** `http://localhost:5000/api-docs`

---

## Frontend Setup

### 1. Navigate to Client Directory

```bash
cd ../client
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

1. **Copy example file:**
   ```bash
   cp .env.local.example .env.local
   ```

2. **Edit `.env.local`:**
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   NEXTAUTH_SECRET=your-secret-key-for-next-auth
   ```

### 4. Start Frontend Development Server

```bash
npm run dev
```

**Expected output:**
```
> next dev
  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
```

### 5. Open in Browser

Go to: `http://localhost:3000`

---

## Database Configuration

### Option 1: MongoDB Atlas (Recommended for Production)

1. **Create MongoDB Atlas Account:**
   - Go to https://www.mongodb.com/cloud/atlas
   - Sign up for free tier
   - Create a new project

2. **Create Cluster:**
   - Choose cloud provider and region
   - Wait for cluster to deploy (5-10 minutes)

3. **Create Database User:**
   - Go to "Database Access"
   - Create user with strong password
   - Note: URL-encode special characters in password (use `%40` for `@`)

4. **Get Connection String:**
   - Go to "Databases" → "Connect"
   - Choose "Drivers"
   - Copy connection string
   - Replace `<username>` and `<password>` and `<dbname>`

5. **Example MONGODB_URI:**
   ```
   mongodb+srv://saloon_user:SecurePass%40123@cluster.mongodb.net/galaxy-salon-system?retryWrites=true&w=majority
   ```

### Option 2: Local MongoDB

1. **Install MongoDB Community Edition:**
   - Download from https://www.mongodb.com/try/download/community
   - Follow installation instructions for your OS

2. **Start MongoDB Service:**

   **Windows:**
   ```bash
   mongod
   ```

   **macOS (with Homebrew):**
   ```bash
   brew services start mongodb-community
   ```

   **Linux (Ubuntu):**
   ```bash
   sudo systemctl start mongod
   ```

3. **Connection String:**
   ```
   MONGODB_URI=mongodb://localhost:27017/galaxy-salon-system
   ```

---

## External Integrations

### Email Service (Gmail SMTP)

1. **Enable 2-Factor Authentication:**
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password:**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Windows"
   - Copy the generated password
   - Use this in `.env` as `SMTP_PASS`

### Razorpay Integration

1. **Create Account:**
   - Go to https://razorpay.com
   - Sign up and verify

2. **Get API Keys:**
   - Go to Account Settings → API Keys
   - Copy Key ID and Secret
   - Use in `.env`

3. **Testing:**
   - Use test keys provided (starts with `rzp_test_`)
   - Test cards provided in Razorpay dashboard

### WhatsApp Integration

1. **Create Business Account:**
   - Go to https://business.facebook.com
   - Create business account

2. **Set Up WhatsApp Cloud API:**
   - Go to WhatsApp Manager
   - Create phone number
   - Get API credentials

3. **Add to `.env`:**
   ```
   WHATSAPP_PHONE_NUMBER_ID=your-phone-id
   WHATSAPP_ACCESS_TOKEN=your-token
   ```

---

## Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

Access: `http://localhost:3000`

### Production Build

**Frontend Build:**
```bash
cd client
npm run build
npm start
```

**Backend:**
```bash
cd server
NODE_ENV=production npm start
```

---

## Testing Credentials

### Default Admin Account

```
Email:    admin@galaxysalon.com
Password: admin123456
```

⚠️ **IMPORTANT:** Change this password immediately after first login!

### Test Money Payment (Razorpay)

- **Card:** 4111 1111 1111 1111
- **Expiry:** Any future date
- **CVV:** Any 3 digits

---

## Troubleshooting

### Issue: MongoDB Connection Failed

**Error:** `MongooseError: Cannot connect to MongoDB`

**Solutions:**
1. Check MongoDB URI in `.env`
2. Verify credentials and URL-encode special characters
3. Whitelist your IP in MongoDB Atlas
4. Check firewall/VPN settings
5. Try with different DNS: Add  `MONGODB_DNS=8.8.8.8,8.8.4.4` to `.env`

### Issue: SMTP Email Not Sending

**Error:** `Error: Invalid login or password`

**Solutions:**
1. Verify Gmail app password (not regular password)
2. Check 2FA is enabled in Gmail
3. Try disabling 2FA temporarily to test
4. Check SMTP credentials in `.env`

### Issue: Frontend Cannot Connect to API

**Error:** `Failed to fetch from API`

**Solutions:**
1. Verify backend is running on port 5000
2. Check `NEXT_PUBLIC_API_URL` in `.env.local`
3. Check CORS settings in `server/index.js`
4. Ensure firewall allows port 5000

### Issue: Barcode Scanner Not Working

**Error:** Barcode input not recognized

**Solutions:**
1. Ensure scanner is properly connected
2. Check `useBarcodeScanner` hook in `client/src/hooks/useBarcodeScanner.js`
3. Test manual input first
4. Check scanner baud rate matches configuration

### Issue: Thermal Printer Not Found

**Error:** `Printer connection failed`

**Solutions:**
1. Verify printer is connected and powered on
2. Check printer IP/port in `.env`
3. Test connectivity: `ping printter-ip`
4. Check firewall allows printer port

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] MongoDB Atlas backup configured
- [ ] SSL certificate obtained
- [ ] Domain setup complete
- [ ] Emails tested and working
- [ ] Payment gateway in production mode
- [ ] WhatsApp webhook configured
- [ ] Rate limiting configured
- [ ] Security headers enabled
- [ ] Logs monitoring setup

### Environment Variables for Production

```env
NODE_ENV=production
JWT_SECRET=use-long-complex-secret-change-this
MONGODB_URI=production-mongodb-uri
SMTP_HOST=production-email-smtp
RAZORPAY_KEY_ID=production-key
RAZORPAY_KEY_SECRET=production-secret
WHATSAPP_ACCESS_TOKEN=production-token
ENABLE_PRODUCTION_LOGGING=true
CORS_ORIGINS=https://yourdomain.com
```

### Deployment Options

1. **Heroku** (Easy, Free tier available)
2. **AWS Elastic Beanstalk** (Scalable)
3. **DigitalOcean App Platform** (Affordable)
4. **Google Cloud Run** (Serverless)
5. **Docker + Kubernetes** (Advanced)

### Backup & Recovery

**MongoDB Atlas Backup:**
1. Go to Cluster → Backup
2. Enable daily backups
3. Configure retention period (30 days recommended)

**Database Export:**
```bash
mongodump --uri "mongodb+srv://user:pass@cluster.mongodb.net/galaxy-salon-system"
```

**Database Restore:**
```bash
mongorestore --uri "mongodb+srv://user:pass@cluster.mongodb.net/galaxy-salon-system" dump/
```

---

## Support & Resources

- **Documentation:** See `docs/FULL_DOCUMENTATION.md`
- **API Documentation:** Available at `/api-docs` when server is running
- **Issues:** Report via GitHub Issues
- **Email:** support@galaxysalon.com

---

## Notes

- Always keep backups of your database
- Regularly update npm dependencies: `npm update`
- Review security advisories: `npm audit`
- Test migrations before production deployment
- Monitor application performance and logs
- Maintain separate development/production databases

---

**Happy Salon Managing! 💇‍♀️💅✂️**
