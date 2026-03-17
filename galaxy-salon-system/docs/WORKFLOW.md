# Galaxy Salon System Workflow Manual

This document describes the real, code-aligned business and technical workflows of the Galaxy Salon System.

## 1. Workflow Scope

- Application: Salon operations + beauty academy operations
- Roles: `admin`, `staff`, customer-facing chatbot user
- Systems involved: Next.js client, Express API, MongoDB, Razorpay, WhatsApp Cloud API, cron scheduler, thermal printing

## 2. End-to-End Operating Flow

1. User logs in from client (`/login`) and receives JWT.
2. JWT is attached in API requests by Axios interceptor.
3. API validates token and role (`auth`, `adminOnly` middleware).
4. Controller executes business logic and updates MongoDB.
5. Optional side effects run: stock update, loyalty points, WhatsApp notification, payment verification.
6. UI updates and presents receipt/report/confirmation.

## 3. Role Workflow Matrix

| Workflow | Staff | Admin |
|---|---|---|
| POS billing (`/pos`) | Yes | Yes |
| Customer create/update | Yes | Yes |
| Product/service create/update/delete | No | Yes |
| Employee create/update/delete | No | Yes |
| Bill cancel | No | Yes |
| Promotions over WhatsApp | No | Yes |
| Advanced reports | Limited | Full |
| Academy fees/attendance/certificate | No | Yes |

## 4. POS Billing Workflow

### Preconditions

- User authenticated.
- Services/products loaded.
- If UPI/card: Razorpay keys configured.

### Transaction Steps

1. Select existing customer using quick search or create inline customer.
2. Add services (with optional employee assignment).
3. Add products manually or through barcode scanner.
4. Apply discount (`flat` or `percent`) and tax rate.
5. Select payment method: `cash`, `upi`, `card`, `split`.
6. For UPI/card, create Razorpay order and verify signature.
7. Submit bill to `POST /api/bills`.
8. Backend validates stock and decrements product stock.
9. Backend writes bill (`Bill` model), with auto-incremented `billNumber`.
10. Backend updates customer `visitHistory` and `loyaltyPoints`.
11. Frontend optionally sends WhatsApp receipt.
12. Receipt modal opens and can be printed for thermal printer.

### Validation and Failure Paths

- If bill has no line items: reject in UI.
- If product stock insufficient: API returns `400` and bill is not created.
- If payment verification fails: bill creation is blocked for non-cash methods.
- WhatsApp send failure is non-blocking and should not cancel billing.

## 5. Appointment Workflow

### Booking Flow

1. Staff chooses customer, service, date, and time.
2. API `POST /api/appointments` validates required fields.
3. Appointment status starts at `scheduled`.

### Status Lifecycle

`scheduled -> confirmed -> in-progress -> completed`

Alternative terminal states:

- `cancelled`
- `no-show`

### Reminder Flow

1. Cron job executes daily at `0 8 * * *`.
2. Fetches tomorrow appointments with status in `scheduled`, `confirmed` and `reminderSent=false`.
3. Sends WhatsApp reminder to customer phone.
4. Sets `reminderSent=true`.

## 6. Customer Workflow

1. Create customer (`POST /api/customers`) with required `name` and `phone`.
2. Search customer by name or phone using customer listing and quick-search endpoint.
3. Update profile notes/preferences for service history context.
4. Retrieve customer bills for service and payment history.
5. Loyalty points maintained automatically through completed bill creation and adjusted on cancellation.

## 7. Product and Inventory Workflow

1. Admin creates product with price, stock, category, optional barcode.
2. POS consumes products and reduces stock in billing step.
3. Admin performs manual stock correction through stock endpoint.
4. Admin checks low-stock list for reorder action.
5. Bill cancellation restores previous stock quantities.

## 8. Service and Employee Workflow

### Service Catalog

1. Admin creates/updates/deletes service records.
2. Staff uses active services during POS and appointments.

### Employee Operations

1. Admin creates employee with role, salary, commission rate.
2. Staff assignment in POS allows revenue attribution per service.
3. Performance endpoint aggregates employee contribution for reporting.

## 9. Academy Workflow

1. Admin creates courses with duration, fee, and syllabus.
2. Admin enrolls students linked to a course.
3. Admin records fee payments incrementally.
4. Admin marks attendance records.
5. Admin issues certificate for completion and updates status.

## 10. Reporting Workflow

### Standard Reporting

- Dashboard summary (`/reports/dashboard`)
- Sales trend (`/reports/sales`)
- Top services (`/reports/top-services`)
- Top products (`/reports/top-products`)
- Payment mix (`/reports/payment-methods`)
- Employee performance (`/reports/employee-performance`)

### Output Use Cases

- Day-close cash reconciliation
- Service mix optimization
- Product procurement planning
- Staff performance review

## 11. WhatsApp Workflow

### Manual API Flows

- `POST /api/whatsapp/send-receipt`
- `POST /api/whatsapp/send-reminder`
- `POST /api/whatsapp/send-promotion` (admin only)

### Automation Flow

- Appointment reminder cron and post-bill receipt dispatch.

### Resilience Rules

- If API credentials are missing, service logs and returns a non-success response.
- Core business operations continue even if WhatsApp message fails.

## 12. AI Workflow

### Analytics Endpoints

- Business insights
- Revenue prediction
- Churn-risk listing
- Service recommendations
- Peak-hour analysis
- Inventory insights

### Chat Workflow

1. Public client sends `POST /api/ai/chat` with message.
2. Rule-based intent engine classifies query.
3. Response includes answer text and optional suggestion chips.

## 13. Security Workflow

1. JWT generated during login.
2. JWT passed in `Authorization: Bearer <token>`.
3. `auth` middleware validates and attaches user context.
4. `adminOnly` middleware protects privileged operations.
5. Express validation middleware rejects malformed payloads.
6. Helmet, CORS, and API rate limit run globally.

## 14. Operational Runbook

### Start-of-Day

1. Verify API health endpoint.
2. Confirm product stock for top-selling SKUs.
3. Confirm printer and scanner connectivity.
4. Review today appointments.

### Day-Close

1. Export or verify daily bill summary.
2. Compare payment-method totals with settlement records.
3. Review cancelled bills.
4. Check low-stock list.

### Incident Handling

1. Payment failure: retry verification or switch to cash.
2. WhatsApp failure: proceed with operation and message manually later.
3. Stock mismatch: use admin stock adjustment endpoint and audit affected bills.

## 15. Workflow Dependencies

- POS depends on customer, service, product, and employee domains.
- Reports depend on completed bills and appointment data quality.
- AI insights depend on data consistency between model fields and analytics logic.
- Reminder automation depends on cron process and valid customer phone numbers.

## 16. Recommended Improvements for Workflow Reliability

1. Add explicit pending-payment bill status and callback reconciliation.
2. Add appointment conflict guard for employee/time slot.
3. Align AI analytics field names with bill schema fields.
4. Add audit trail for stock adjustments and bill cancellation actions.

This workflow manual is intended for daily operations, QA scenario testing, and stakeholder onboarding.