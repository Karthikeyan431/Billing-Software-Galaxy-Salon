# Deployment Guide

## Production Deployment Architecture

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   Vercel     │     │  Render/Railway  │     │  MongoDB Atlas   │
│   (Client)   │────▶│   (Server API)   │────▶│  (Database)      │
│   Next.js    │     │   Express.js     │     │  M0 Free / M10+  │
└──────────────┘     └─────────────────┘     └──────────────────┘
```

---

## 1. Database — MongoDB Atlas

1. Create free cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create database user (use a strong password; URL-encode special chars like `@` → `%40`)
3. Whitelist IP: `0.0.0.0/0` (for cloud services)
4. Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/galaxy-salon`
5. Run seeder: `MONGODB_URI=<atlas-uri> node utils/seed.js`

---

## 2. Backend — Render

1. Push code to GitHub
2. Create new **Web Service** on [render.com](https://render.com)
3. Settings:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
4. Add environment variables:
   ```
   PORT=5000
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=<generate-random-64-char-string>
   JWT_EXPIRE=7d
   CLIENT_URL=https://your-app.vercel.app
   NODE_ENV=production
   ```
5. Deploy

### Alternative: Railway
1. Create project at [railway.app](https://railway.app)
2. Connect GitHub repo, set root to `server`
3. Railway auto-detects Node.js, add env vars
4. Takes ~2 min to deploy

---

## 3. Frontend — Vercel

1. Import project from GitHub at [vercel.com](https://vercel.com)
2. Settings:
   - **Root Directory**: `client`
   - **Framework Preset**: Next.js (auto-detected)
3. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-server.onrender.com/api
   ```
4. Deploy

---

## 4. WhatsApp Integration (Optional)

1. Create a Meta Business App at [developers.facebook.com](https://developers.facebook.com)
2. Enable WhatsApp API product
3. Get permanent token and Phone Number ID from the WhatsApp dashboard
4. Add to server env:
   ```
   WHATSAPP_TOKEN=your-permanent-token
   WHATSAPP_PHONE_ID=your-phone-number-id
   ```

---

## 5. Post-Deployment Checklist

- [ ] Verify `/api/health` endpoint returns 200
- [ ] Login with default admin credentials
- [ ] Change default admin password immediately
- [ ] Test creating a bill end-to-end
- [ ] Verify CORS allows your Vercel domain
- [ ] Check rate limiter settings for production traffic
- [ ] Set up MongoDB Atlas alerts for disk usage
- [ ] Enable Render/Railway auto-deploy on push

---

## Security Notes

- Always use HTTPS in production (Vercel & Render provide it by default)
- Rotate JWT_SECRET periodically
- Use strong, unique MongoDB passwords (URL-encoded)
- Enable MongoDB Atlas IP whitelist per service if possible
- Review `helmet` defaults cover your CSP needs
- Set `NODE_ENV=production` to hide error stack traces
