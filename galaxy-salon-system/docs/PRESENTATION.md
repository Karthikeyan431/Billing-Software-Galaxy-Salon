# Galaxy Salon System Presentation

Use this file as the source for walkthrough sessions and PPT export.

---

## Slide 1 - Title

Galaxy Salon System
Comprehensive Billing, Operations, and Analytics Platform

Speaker notes:
- Introduce scope: salon + academy + integrations.
- Mention stack: Next.js, Express, MongoDB.

---

## Slide 2 - Problem and Goal

Operational pain points solved:
- slow billing and manual records
- disconnected booking and inventory
- limited decision intelligence

Goal:
- one integrated platform from counter to management dashboard

Speaker notes:
- Focus on business impact, not only technology.

---

## Slide 3 - System Architecture

Layers:
- Frontend (Next.js, React)
- Backend API (Express, JWT, validators)
- Database (MongoDB + Mongoose)
- External Services (Razorpay, WhatsApp, printer)

Speaker notes:
- Explain request lifecycle from UI to DB and back.

---

## Slide 4 - Core Modules

- POS and Billing
- Appointments
- Customers and Loyalty
- Products and Inventory
- Services and Employees
- Academy (Courses, Students)
- Reports and AI Insights

Speaker notes:
- Emphasize shared data model across all modules.

---

## Slide 5 - POS Workflow

Flow:
1. select/create customer
2. add services and products
3. apply discount/tax
4. choose payment mode
5. validate and create bill
6. update stock and loyalty
7. print/send receipt

Speaker notes:
- Show that operational speed is the key objective.

---

## Slide 6 - Payment Flow

- Cash: direct bill completion
- UPI/Card: Razorpay order + signature verification
- Split mode support in bill schema

Speaker notes:
- Mention secure verification happens on backend.

---

## Slide 7 - Appointment and Reminder Flow

- appointment booking and status lifecycle
- daily reminder cron at 8:00 AM
- WhatsApp reminder with service/time details

Speaker notes:
- Explain `reminderSent` flag avoids duplicate reminders.

---

## Slide 8 - Inventory and Barcode Flow

- barcode lookup in POS
- automatic stock reduction during billing
- low-stock endpoint for reorder planning
- stock restore on bill cancellation

Speaker notes:
- Inventory is tied directly to transaction correctness.

---

## Slide 9 - Employee and Academy Flow

Employee:
- role setup, commission rate, performance view

Academy:
- course setup
- student enrollment
- fee payment ledger
- attendance and certificate issue

Speaker notes:
- This extends app value beyond regular salon billing.

---

## Slide 10 - Reporting and Analytics

- dashboard KPIs
- sales trends
- top services/products
- payment mix
- employee performance

Speaker notes:
- Reports drive business decisions and staffing plans.

---

## Slide 11 - AI Module

Analytics endpoints:
- revenue prediction
- churn-risk customers
- service recommendations
- peak-hour and inventory insights

Chatbot endpoint:
- intent-based customer query handling

Speaker notes:
- Clarify this is rule/statistics-based AI currently.

---

## Slide 12 - Security and Controls

- JWT auth and role-based access
- request validation middleware
- CORS, helmet, rate limiting
- admin-only operations for sensitive actions

Speaker notes:
- Highlight operational safety and misuse prevention.

---

## Slide 13 - Deployment Blueprint

- frontend on Vercel
- backend on Render/Railway
- database on Atlas
- environment-variable driven configuration

Speaker notes:
- Include post-deploy smoke tests and health checks.

---

## Slide 14 - Known Gaps and Roadmap

Current improvement areas:
- appointment slot conflict prevention
- AI-field/schema alignment
- stronger auth policy + reset flow
- centralized monitoring and audit logs

Speaker notes:
- Present this as proactive quality roadmap.

---

## Slide 15 - Closing

Deliverables completed:
- detailed workflow manual
- full technical documentation
- presentation deck

Next:
- stakeholder review
- UAT cycle
- staged production rollout

Speaker notes:
- Invite implementation and operations questions.
