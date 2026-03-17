# Galaxy Salon System Full Documentation

## 1. Product Summary

Galaxy Salon System is a MERN-based business platform for salon and academy operations. It combines POS billing, appointments, CRM, inventory, employee performance tracking, course and student management, reporting, and AI-assisted insights/chat.

Primary goals:

- reduce billing and booking turnaround time
- keep inventory and customer records synchronized
- provide operational intelligence for owners and managers

## 2. Architecture

## 2.1 Runtime Topology

- Frontend: Next.js Pages Router application in `client`
- Backend: Express API in `server`
- Database: MongoDB via Mongoose
- AI logic: local module in `ai-module`
- Integrations: Razorpay, WhatsApp Cloud API, thermal printing, barcode scanner

## 2.2 Request Lifecycle

1. Client page calls domain service in `client/src/services/dataService.js`.
2. Axios client in `client/src/services/api.js` injects JWT token.
3. Request reaches route file in `server/routes`.
4. Middleware enforces auth/role/validation.
5. Controller executes business logic using Mongoose models.
6. Response returned to UI and rendered with toast/UI state updates.

## 2.3 Security Middleware Stack

Configured in `server/index.js`:

- `helmet` for secure headers
- `cors` restricted by `CLIENT_URL`
- rate limiter on `/api/*` (200 requests per 15 minutes)
- body parser limits and optional development logging

## 3. Frontend Documentation

## 3.1 Major Pages

- `pages/index.js`: dashboard landing
- `pages/login.js`: authentication
- `pages/pos.js`: billing and receipt workflow
- `pages/appointments.js`: appointment scheduling and tracking
- `pages/customers.js`: customer management
- `pages/products.js` and `pages/inventory.js`: catalog and stock views
- `pages/services.js`: service catalog management
- `pages/employees.js`: employee setup/performance
- `pages/academy.js`: course/student operations
- `pages/reports.js`: analytics and reporting
- `pages/bills.js`: billing history and cancellation workflows

## 3.2 UI and Hooks

- Reusable UI controls under `client/src/components/ui`
- `useAuth`: auth state, session, role gating
- `useApi`: API utility wrapper
- `useBarcodeScanner`: keyboard-buffer based scanner support

## 3.3 Client-Service Layer

`dataService.js` groups domain clients:

- `authService`
- `customerService`
- `serviceService`
- `productService`
- `billService`
- `employeeService`
- `appointmentService`
- `reportService`
- `whatsappService`
- `paymentService`

## 4. Backend Documentation

## 4.1 Entry and Route Registration

All route groups are mounted in `server/index.js`:

- `/api/auth`
- `/api/customers`
- `/api/services`
- `/api/products`
- `/api/bills`
- `/api/employees`
- `/api/appointments`
- `/api/courses`
- `/api/students`
- `/api/reports`
- `/api/whatsapp`
- `/api/ai`
- `/api/payment`

Health endpoint: `GET /api/health`

## 4.2 Authentication and RBAC

- JWT auth middleware: `server/middleware/auth.js`
- Admin-only middleware for privileged routes
- Auth-protected routes use `router.use(auth)` or per-route `auth`

## 4.3 Validation

Validation rules are defined in `server/middleware/validators.js` with `express-validator`.

Available rule sets:

- login and register rules
- customer, service, product, bill, appointment rules
- Mongo ObjectId parameter validation

## 5. Domain Modules

## 5.1 Billing

Core files:

- `server/routes/bills.js`
- `server/controllers/billController.js`
- `server/models/Bill.js`

Key behavior:

- paginated and filtered bill retrieval
- bill creation validates stock and updates inventory
- loyalty points are updated for linked customers
- bill cancellation restores stock and reverses points
- daily summary endpoint aggregates payment-wise totals

## 5.2 Customers

Core files:

- `server/routes/customers.js`
- `server/controllers/customerController.js`
- `server/models/Customer.js`

Key behavior:

- unique phone constraint
- text index on customer name
- quick search support for POS
- bill history retrieval by customer ID

## 5.3 Products and Inventory

Core files:

- `server/routes/products.js`
- `server/controllers/productController.js`
- `server/models/Product.js`

Key behavior:

- low-stock endpoint
- barcode lookup endpoint
- stock mutation endpoint with add/subtract operation
- category and activity-state support

## 5.4 Services

Core files:

- `server/routes/services.js`
- `server/controllers/serviceController.js`
- `server/models/Service.js`

Key behavior:

- categorized service catalog
- admin-managed CRUD
- used by POS and appointments

## 5.5 Employees

Core files:

- `server/routes/employees.js`
- `server/controllers/employeeController.js`
- `server/models/Employee.js`

Key behavior:

- employee metadata with commission and salary
- role-constrained values
- performance endpoint based on billed services

## 5.6 Appointments

Core files:

- `server/routes/appointments.js`
- `server/controllers/appointmentController.js`
- `server/models/Appointment.js`

Key behavior:

- booking and update workflow
- status transitions from scheduled to completion states
- reminder marker (`reminderSent`) for cron processing

## 5.7 Academy

Core files:

- courses: `routes/courses.js`, `controllers/courseController.js`, `models/Course.js`
- students: `routes/students.js`, `controllers/studentController.js`, `models/Student.js`

Key behavior:

- course lifecycle management
- student enrollment and payment tracking
- attendance recording
- certificate issuance

## 5.8 Reports

Core files:

- `server/routes/reports.js`
- `server/controllers/reportController.js`

Key behavior:

- dashboard KPI summary
- sales aggregation by period
- top services and products
- payment method split
- employee performance summary

## 5.9 AI Module

Core files:

- analytics: `ai-module/analytics/aiAnalytics.js`
- chatbot: `ai-module/chatbot/salonChatbot.js`
- API router: `server/routes/ai.js`

Endpoints include:

- full insights
- revenue prediction
- churn risk
- recommendations by customer
- peak hours
- inventory insights
- chatbot endpoint (`POST /api/ai/chat`)

## 6. Integrations

## 6.1 Razorpay

Files:

- `server/routes/payment.js`
- client usage in `client/src/pages/pos.js`

Flow:

1. create order
2. open checkout modal
3. verify signature on callback
4. finalize bill in app flow

## 6.2 WhatsApp Cloud API

Files:

- `server/services/whatsappService.js`
- `server/routes/whatsapp.js`
- cron usage in `server/services/cronJobs.js`

Message flows:

- bill receipt
- appointment reminder
- bulk promotion (admin)

## 6.3 Thermal Printing

File:

- `server/services/printerService.js`

Output modes:

- plain text / ESC-POS compatible formatting
- HTML print template for 80mm receipt print dialogs

## 6.4 Barcode Scanner

File:

- `client/src/hooks/useBarcodeScanner.js`

Behavior:

- keyboard stream capture
- enter key triggers barcode resolution
- product auto-add in POS

## 7. Data Model Reference

## 7.1 User

- `name`, `email`, `password`, `role`, `isActive`, timestamps

## 7.2 Customer

- `name`, `phone`, `email`, `loyaltyPoints`, `visitHistory[]`, `notes`, timestamps

## 7.3 Bill

- customer and denormalized customer identity
- service lines with employee mapping
- product lines and quantities
- subtotal, discount, tax, total
- payment method and split distribution
- status and creator reference
- auto-incremented bill number

## 7.4 Product

- identity, barcode, category, stock, low-stock threshold, supplier, activity flag

## 7.5 Service

- service metadata, duration, category, pricing, activity flag

## 7.6 Employee

- profile, role, contact, commission, salary, active state

## 7.7 Appointment

- customer/service/employee linkage
- date, time, status, notes, reminder marker

## 7.8 Course

- course name, duration, fee, description, syllabus, activity flag

## 7.9 Student

- profile, course linkage, fee state, payment ledger, attendance, certificate, status

## 8. Environment Variables

## 8.1 Server

- `PORT`
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRE`
- `CLIENT_URL`
- `NODE_ENV`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `WHATSAPP_API_URL`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `BUSINESS_NAME`
- `BUSINESS_PHONE`

## 8.2 Client

- `NEXT_PUBLIC_API_URL`
- optional: `NEXT_PUBLIC_RAZORPAY_KEY_ID`

## 9. Setup and Operations

## 9.1 Local Setup

1. install backend dependencies in `server`
2. configure `.env`
3. run database seed script
4. start backend server
5. install client dependencies in `client`
6. configure `.env.local`
7. start frontend

## 9.2 Daily Operations Checklist

- API health check
- cashier login verification
- scanner and printer check
- appointment load check
- end-of-day sales reconciliation

## 10. Deployment Notes

Recommended hosting split:

- client on Vercel
- server on Render or Railway
- database on MongoDB Atlas

Minimum production checks:

- `GET /api/health` status
- CORS origin set to production client URL
- secure JWT secret
- payment and WhatsApp keys configured
- admin password rotated after first login

## 11. Risks and Improvement Backlog

1. align AI analytics field names with current bill/customer schema fields
2. add appointment conflict prevention for employee time slots
3. add bill audit trail for cancellation and stock correction actions
4. strengthen password policy and add password reset flow
5. add monitoring and centralized error tracking
6. add distributed-safe reminder scheduling when horizontally scaling API

## 12. Testing Recommendations

Core end-to-end suite:

1. login -> POS cash bill -> print -> bill history verify
2. UPI/card payment -> signature verify -> bill persist
3. low-stock product checkout failure path
4. appointment create -> cron reminder send path
5. academy enrollment -> fee payment -> certificate issuance
6. report endpoints with date grouping and role checks

This document is intended as the primary technical reference for implementation, operations, and handover.