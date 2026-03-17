# Galaxy Unisex Saloon & Beauty Academy - Billing Software

A complete, production-ready Salon Management & Billing System built with the MERN stack.

## ✨ Features

- **POS Billing** — Fast billing with service/product selection, discounts, tax, split payments
- **Barcode Scanner** — USB barcode scanner integration for instant product lookup
- **Thermal Printer** — ESC/POS & HTML receipt printing (80mm thermal)
- **Customer Management** — Profile, visit history, loyalty points
- **Service & Product Catalogs** — Category-based management with stock tracking
- **Inventory Management** — Low stock alerts, stock add/subtract, reorder suggestions
- **Employee Management** — Performance tracking, commission calculation
- **Appointment Scheduling** — Book, confirm, track daily appointments
- **WhatsApp Integration** — Bill receipts, appointment reminders, bulk promotions
- **Beauty Academy** — Course management, student enrollment, fee tracking, certificates
- **Reports & Analytics** — Revenue trends, top services/products, payment breakdown, employee performance
- **AI Module** — Revenue prediction, churn risk detection, service recommendations, chatbot

## 🏗️ Tech Stack

| Layer       | Technology                                          |
|-------------|-----------------------------------------------------|
| Frontend    | Next.js 14 (Pages Router), React 18, Tailwind CSS   |
| Backend     | Node.js, Express.js                                 |
| Database    | MongoDB (Mongoose ODM)                              |
| Auth        | JWT + bcrypt, role-based (admin/staff)               |
| Charts      | Chart.js + react-chartjs-2                          |
| Integrations| WhatsApp Cloud API, ESC/POS, USB Barcode Scanner    |
| Cron        | node-cron (appointment reminders)                    |

## 📂 Project Structure

```
galaxy-salon-system/
├── server/                  # Express API
│   ├── config/db.js         # MongoDB connection
│   ├── models/              # Mongoose schemas (9 models)
│   ├── controllers/         # Business logic (10 controllers)
│   ├── routes/              # API routes (12 route files)
│   ├── middleware/           # Auth & validation
│   ├── services/            # WhatsApp, Printer, Cron
│   ├── utils/seed.js        # Database seeder
│   └── index.js             # Express entry point
├── client/                  # Next.js Frontend
│   └── src/
│       ├── components/ui/   # Reusable UI components
│       ├── hooks/           # Custom React hooks
│       ├── layouts/         # Dashboard layout
│       ├── pages/           # 12 pages
│       ├── services/        # API layer
│       ├── styles/          # Global CSS
│       └── utils/           # Helpers
├── ai-module/               # AI features
│   ├── analytics/           # Revenue prediction, churn, insights
│   └── chatbot/             # Rule-based salon chatbot
└── docs/                    # Documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm or yarn

### 1. Clone & Setup

```bash
git clone <repo-url>
cd galaxy-salon-system
```

### 2. Backend Setup

```bash
cd server
cp .env.example .env
# Edit .env with your MongoDB URI, JWT secret, etc.
npm install
npm run seed   # Seed sample data
npm run dev    # Start on port 5000
```

### 3. Frontend Setup

```bash
cd client
cp .env.local.example .env.local
npm install
npm run dev    # Start on port 3000
```

### 4. Default Login

```
Email:    admin@galaxysalon.com
Password: admin123456
```

## 📖 Environment Variables

### Server (.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/galaxy-salon
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:3000
NODE_ENV=development
WHATSAPP_TOKEN=your-whatsapp-token
WHATSAPP_PHONE_ID=your-phone-id
```

### Client (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## 🌐 Deployment

### Frontend → Vercel
1. Push to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Set root directory to `client`
4. Set environment variable `NEXT_PUBLIC_API_URL`

### Backend → Render / Railway
1. Set root directory to `server`
2. Start command: `node index.js`
3. Set all env variables from `.env`
4. Use MongoDB Atlas for production database

## 📝 License

MIT
