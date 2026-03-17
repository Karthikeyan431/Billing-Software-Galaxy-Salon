# Galaxy Salon System - FREE Deployment Guide

**Updated:** March 2026  
**Platform:** Vercel (Frontend) + Railway (Backend) + MongoDB Atlas (Database)  
**Cost:** ~$0-5/month (free tier coverage)

---

## 📋 Deployment Checklist

- [ ] Step 1: Set up MongoDB Atlas
- [ ] Step 2: Update .env for production
- [ ] Step 3: Push code to GitHub
- [ ] Step 4: Deploy backend to Railway
- [ ] Step 5: Deploy frontend to Vercel
- [ ] Step 6: Connect frontend to backend
- [ ] Step 7: Test production URLs
- [ ] Step 8: Set up custom domain (optional)

---

## 🔧 Step 1: Set Up MongoDB Atlas (5 minutes)

### 1.1 Create MongoDB Atlas Account

1. Go to https://www.mongodb.com/cloud/atlas
2. Click **"Sign Up"** (or **"Sign In"** if you have an account)
3. Create account with email and password
4. Accept terms and click **"Continue"**

### 1.2 Create Free Cluster

1. Select **"Create a Deployment"**
2. Choose **"M0 Free"** tier (0-5GB storage, perfect for staging)
3. Select **AWS** as provider
4. Choose closest region to your users
5. Click **"Create Cluster"**
6. Wait 5-10 minutes for cluster to initialize

### 1.3 Create Database User

1. Click **"Security"** → **"Database Access"**
2. Click **"+ Add New Database User"**
3. Choose **"Password"** authentication
4. Username: `galaxysalon`
5. Password: `GenerateSecurePassword123!` (Generate one)
6. Click **"Create User"**

### 1.4 Allow Network Access

1. Click **"Security"** → **"Network Access"**
2. Click **"+ Add IP Address"**
3. Choose **"Allow access from anywhere"** (safer option: add specific IPs later)
4. Click **"Confirm"**

### 1.5 Get Connection String

1. Click **"Databases"** → **"Connect"**
2. Choose **"Drivers"** (Mongoose)
3. Copy connection string
4. Replace `<username>`, `<password>`, `<dbname>`:

```
MONGODB_URI=mongodb+srv://galaxysalon:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/galaxy-salon-prod?retryWrites=true&w=majority
```

**Important:** URL-encode special characters in password:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`

---

## 📝 Step 2: Update Production Environment

### 2.1 Update server/.env for Production

Add these to your `.env` file:

```env
# ==================== PRODUCTION ====================
NODE_ENV=production
PORT=5000

# ==================== DATABASE ====================
MONGODB_URI=mongodb+srv://galaxysalon:YOUR_ENCODED_PASSWORD@cluster0.xxxxx.mongodb.net/galaxy-salon-prod?retryWrites=true&w=majority

# ==================== JWT ====================
JWT_SECRET=generate-a-very-long-random-string-here-minimum-32-characters
JWT_EXPIRES_IN=7d

# ==================== SERVER ====================
CLIENT_URL=https://galaxy-salon-prod.vercel.app
ENABLE_PRODUCTION_LOGGING=true

# ==================== BUSINESS ====================
BUSINESS_NAME=Galaxy Unisex Saloon & Beauty Academy
BUSINESS_PHONE=+91-9876543210
BUSINESS_EMAIL=info@galaxysalon.com
BUSINESS_ADDRESS=Your Address Here

# ==================== EMAIL (Optional) ====================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-google-app-password
SMTP_FROM=noreply@galaxysalon.com

# ==================== RAZORPAY (Optional) ====================
RAZORPAY_KEY_ID=rzp_live_XXXXX
RAZORPAY_KEY_SECRET=your-live-secret

# ==================== WHATSAPP (Optional) ====================
WHATSAPP_API_URL=https://graph.facebook.com/v18.0
WHATSAPP_PHONE_NUMBER_ID=your-phone-id
WHATSAPP_ACCESS_TOKEN=your-access-token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-webhook-token
```

### 2.2 Update client/.env.local for Production

```env
NEXT_PUBLIC_API_URL=https://galaxy-salon-prod.railway.app/api
```

---

## 🐙 Step 3: Push Code to GitHub

### 3.1 Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `galaxy-salon-system`
3. Choose **"Public"** (necessary for free deployment)
4. Click **"Create Repository"**

### 3.2 Initialize Git & Push

```bash
cd "D:\Billing Software\galaxy-salon-system"

# Initialize git
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit: Galaxy Salon System"

# Add remote repository
git remote add origin https://github.com/YOUR_USERNAME/galaxy-salon-system.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Note:** You'll need to:
1. Create a GitHub account at https://github.com
2. Generate personal access token (if asked)
3. Replace `YOUR_USERNAME` with your actual GitHub username

---

## 🚀 Step 4: Deploy Backend to Railway

### 4.1 Create Railway Account

1. Go to https://railway.app
2. Click **"Sign In with GitHub"**
3. Authorize Railway to access your GitHub
4. Click **"Create New Project"**

### 4.2 Deploy from GitHub

1. Choose **"Deploy from GitHub repo"**
2. Select your `galaxy-salon-system` repository
3. Choose **"Deploy"**
4. Railway will auto-detect Node.js project

### 4.3 Configure Environment Variables

1. In Railway dashboard, click **"Variables"**
2. Click **"RAW Editor"**
3. Paste all your `.env` variables (from Step 2.1)
4. Click **"Save"**

### 4.4 Set Start Command

Railway auto-detects from `package.json`. If not:

1. Click **"Settings"**
2. Find **"Environments"** → **Start Command**
3. Set to: `npm run seed && node index.js`
   (OR just `node index.js` if database is already seeded)

### 4.5 Get Backend URL

1. In Railway dashboard, click on your project
2. Go to **"Deployments"**
3. Find **"Public URL"** (looks like `https://galaxy-salon-prod.railway.app`)
4. Copy this URL - you'll need it for frontend

**Your Backend URL:**
```
https://galaxy-salon-prod.railway.app
```

---

## ✨ Step 5: Deploy Frontend to Vercel

### 5.1 Connect to Vercel

1. Go to https://vercel.com
2. Click **"Sign Up"** with GitHub (OR **"Sign In"**)
3. Click **"New Project"**
4. Select your `galaxy-salon-system` repository
5. Click **"Import"**

### 5.2 Configure Project

1. **Root Directory:** Choose `client` from dropdown
2. **Framework Preset:** Should auto-select Next.js (correct)
3. **Environment Variables:**
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: `https://galaxy-salon-prod.railway.app/api`
   - Click **"Add"**

### 5.3 Deploy

1. Click **"Deploy"**
2. Wait 2-5 minutes for build to complete
3. You'll see: **"Congratulations! Your site is live"**

**Your Frontend URL:**
```
https://galaxy-salon-prod.vercel.app
```

---

## 🔗 Step 6: Verify Production URLs

### Test Backend API

Open in browser or use curl:

```bash
# Health check
curl https://galaxy-salon-prod.railway.app/api/health

# API Docs
https://galaxy-salon-prod.railway.app/api-docs
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-03-16T10:30:00.000Z"
}
```

### Test Frontend

Open in browser:
```
https://galaxy-salon-prod.vercel.app
```

Verify:
- [ ] Page loads without errors
- [ ] Can see login page
- [ ] Network tab shows requests to `galaxy-salon-prod.railway.app/api`

### Test Login

Default credentials:
```
Email:    admin@galaxysalon.com
Password: admin123456
```

---

## 🆘 Troubleshooting

### Issue: "Cannot connect to API"

**Check Frontend Environment Variable:**
1. Go to Vercel project → **"Settings"** → **"Environment Variables"**
2. Verify `NEXT_PUBLIC_API_URL` points to Railway backend
3. Should have `/api` at the end
4. Redeploy after changes

**Check CORS:**
1. Verify `CLIENT_URL` in backend `.env` matches Vercel URL
2. Should be: `https://galaxy-salon-prod.vercel.app`

### Issue: "Database connection failed"

1. Check `MONGODB_URI` in Railway environment variables
2. Verify special characters are URL-encoded
3. Check MongoDB Atlas whitelist includes Railway IPs
4. Screenshot the error from Railway logs

### Issue: "Build failed on Vercel"

Check build logs:
1. Go to Vercel project → **"Deployments"**
2. Click failed deployment
3. Scroll to **"Build Logs"**
4. Look for specific error
5. Common fixes:
   - Missing dependencies: `npm install`
   - Wrong root directory: Should be `client`
   - Environment variables missing

### Issue: "Build taking too long / timing out"

1. Vercel build timeout: 45 seconds on free tier
2. Try optimizing next.config.js
3. Remove unnecessary dependencies

---

## 📊 Monitor Production

### Railway Monitoring

1. Go to Railway dashboard
2. Click your project
3. View:
   - **Logs** - Application console output
   - **Metrics** - CPU, Memory, Network usage
   - **Deployments** - Rollback to previous version

### Vercel Monitoring

1. Go to Vercel dashboard
2. Click your project
3. View:
   - **Analytics** - Page views, response times
   - **Performance** - Build times, sizes
   - **Logs** - Application errors

---

## 🔐 Production Security Checklist

- [ ] Change default admin password immediately
- [ ] Enable HTTPS (automatic with Vercel + Railway)
- [ ] Set strong `JWT_SECRET`
- [ ] Use production MongoDB URI
- [ ] Enable MongoDB IP whitelist (specific IPs only)
- [ ] Set `NODE_ENV=production`
- [ ] Review `CORS_ORIGINS` setting
- [ ] Set rate limiting to `RATE_LIMIT_MAX=100`
- [ ] Enable request logging
- [ ] Set up error monitoring (optional: Sentry)

---

## 💰 Cost Estimate

| Service | Free Tier | Cost |
|---------|----------|------|
| **Railway** | $5/month credit | ~$0-5 |
| **Vercel** | 100GB bandwidth/month | Free |
| **MongoDB Atlas** | 512MB storage | Free |
| **GitHub** | Public repos | Free |
| **Domain** (optional) | - | $5-15/year |
| **TOTAL** | - | **~$0-5/month** |

---

## 🚀 Next Steps After Deployment

1. **Add Custom Domain** (optional)
   - Vercel: Add domain in Settings
   - Railway: Configure custom domain
   - MongoDB: Update IP whitelist if needed

2. **Set Up Email Notifications**
   - Add Gmail SMTP credentials to `.env`
   - Redeploy backend

3. **Enable WhatsApp Integration**
   - Add WhatsApp credentials to `.env`
   - Redeploy backend

4. **Set Up Razorpay (Payment Gateway)**
   - Switch from test to production keys
   - Update `.env`
   - Redeploy backend

5. **Monitor & Maintain**
   - Check logs regularly
   - Monitor database size
   - Update dependencies monthly
   - Backup database weekly

---

## 📞 Support

- **Railway Docs:** https://docs.railway.app
- **Vercel Docs:** https://vercel.com/docs
- **MongoDB Atlas Docs:** https://docs.atlas.mongodb.com
- **Next.js Deployment:** https://nextjs.org/docs/deployment

---

## 🎉 Congratulations!

Your Galaxy Salon System is now live and accessible to the world!

**Frontend:** https://galaxy-salon-prod.vercel.app  
**Backend API:** https://galaxy-salon-prod.railway.app/api  
**API Docs:** https://galaxy-salon-prod.railway.app/api-docs

Start using it and monitor performance in production dashboards.

---

**Last Updated:** March 2026  
**Version:** 1.0.0 Production Deployment
