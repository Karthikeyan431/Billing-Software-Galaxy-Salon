# API Documentation

Base URL: `http://localhost:5000/api`

All protected routes require header: `Authorization: Bearer <token>`

---

## Auth

| Method | Endpoint           | Auth | Description        |
|--------|-------------------|------|--------------------|
| POST   | /auth/register    | Admin| Register new user  |
| POST   | /auth/login       | No   | Login, get token   |
| GET    | /auth/profile     | Yes  | Get current user   |
| PUT    | /auth/profile     | Yes  | Update profile     |

### POST /auth/login
```json
Request:  { "email": "admin@galaxysalon.com", "password": "admin123456" }
Response: { "token": "jwt...", "user": { "_id", "name", "email", "role" } }
```

---

## Customers

| Method | Endpoint                       | Auth | Description              |
|--------|-------------------------------|------|--------------------------|
| GET    | /customers                     | Yes  | List (search, paginate)  |
| GET    | /customers/:id                 | Yes  | Get by ID                |
| GET    | /customers/search/phone?phone= | Yes  | Search by phone          |
| GET    | /customers/:id/bills           | Yes  | Customer bill history    |
| POST   | /customers                     | Yes  | Create customer          |
| PUT    | /customers/:id                 | Yes  | Update customer          |
| DELETE | /customers/:id                 | Admin| Delete customer          |

---

## Services

| Method | Endpoint          | Auth | Description            |
|--------|------------------|------|------------------------|
| GET    | /services         | Yes  | List (filter category) |
| GET    | /services/:id     | Yes  | Get by ID              |
| POST   | /services         | Admin| Create service         |
| PUT    | /services/:id     | Admin| Update service         |
| DELETE | /services/:id     | Admin| Delete service         |

---

## Products

| Method | Endpoint                     | Auth | Description              |
|--------|------------------------------|------|--------------------------|
| GET    | /products                    | Yes  | List (filter, paginate)  |
| GET    | /products/:id                | Yes  | Get by ID                |
| GET    | /products/barcode/:code      | Yes  | Lookup by barcode        |
| GET    | /products/low-stock          | Yes  | Low stock items          |
| POST   | /products                    | Admin| Create product           |
| PUT    | /products/:id                | Admin| Update product           |
| PUT    | /products/:id/stock          | Admin| Add/subtract stock       |
| DELETE | /products/:id                | Admin| Delete product           |

---

## Bills

| Method | Endpoint               | Auth | Description              |
|--------|------------------------|------|--------------------------|
| GET    | /bills                 | Yes  | List (date filter, page) |
| GET    | /bills/:id             | Yes  | Get bill by ID           |
| GET    | /bills/daily-summary   | Yes  | Today's summary          |
| POST   | /bills                 | Yes  | Create bill              |
| PUT    | /bills/:id/cancel      | Admin| Cancel bill              |

### POST /bills
```json
{
  "customer": "customerId",
  "services": [{ "service": "serviceId", "quantity": 1, "employee": "employeeId" }],
  "products": [{ "product": "productId", "quantity": 2 }],
  "discount": { "type": "percent", "value": 10 },
  "paymentMethod": "cash"
}
```

---

## Employees

| Method | Endpoint                     | Auth | Description           |
|--------|------------------------------|------|-----------------------|
| GET    | /employees                   | Yes  | List all              |
| GET    | /employees/:id               | Yes  | Get by ID             |
| GET    | /employees/:id/performance   | Yes  | Performance stats     |
| POST   | /employees                   | Admin| Create employee       |
| PUT    | /employees/:id               | Admin| Update employee       |
| DELETE | /employees/:id               | Admin| Delete employee       |

---

## Appointments

| Method | Endpoint                     | Auth | Description           |
|--------|------------------------------|------|-----------------------|
| GET    | /appointments                | Yes  | List (date filter)    |
| GET    | /appointments/today          | Yes  | Today's appointments  |
| GET    | /appointments/:id            | Yes  | Get by ID             |
| POST   | /appointments                | Yes  | Create appointment    |
| PUT    | /appointments/:id            | Yes  | Update appointment    |
| PUT    | /appointments/:id/status     | Yes  | Change status         |
| DELETE | /appointments/:id            | Admin| Delete appointment    |

---

## Courses (Academy)

| Method | Endpoint       | Auth | Description    |
|--------|---------------|------|----------------|
| GET    | /courses       | Yes  | List courses   |
| GET    | /courses/:id   | Yes  | Get course     |
| POST   | /courses       | Admin| Create course  |
| PUT    | /courses/:id   | Admin| Update course  |
| DELETE | /courses/:id   | Admin| Delete course  |

---

## Students (Academy)

| Method | Endpoint                       | Auth | Description         |
|--------|-------------------------------|------|---------------------|
| GET    | /students                      | Yes  | List students       |
| GET    | /students/:id                  | Yes  | Get student         |
| POST   | /students                      | Admin| Enroll student      |
| PUT    | /students/:id                  | Admin| Update student      |
| POST   | /students/:id/fee-payment      | Admin| Record fee payment  |
| POST   | /students/:id/attendance       | Admin| Mark attendance     |
| POST   | /students/:id/certificate      | Admin| Issue certificate   |

---

## Reports

| Method | Endpoint                        | Auth | Description               |
|--------|---------------------------------|------|---------------------------|
| GET    | /reports/dashboard              | Yes  | Dashboard summary stats   |
| GET    | /reports/sales?groupBy=&period= | Admin| Sales report (day/month)  |
| GET    | /reports/top-services           | Admin| Top booked services       |
| GET    | /reports/top-products           | Admin| Top sold products         |
| GET    | /reports/payment-methods        | Admin| Payment method breakdown  |
| GET    | /reports/employee-performance   | Admin| Employee revenue stats    |

---

## WhatsApp

| Method | Endpoint                    | Auth | Description            |
|--------|----------------------------|------|------------------------|
| POST   | /whatsapp/send-bill        | Yes  | Send bill via WhatsApp |
| POST   | /whatsapp/send-reminder    | Yes  | Send reminder          |
| POST   | /whatsapp/bulk-promotion   | Admin| Send bulk promo        |

---

## AI Module

| Method | Endpoint                          | Auth | Description                |
|--------|-----------------------------------|------|----------------------------|
| GET    | /ai/insights                      | Admin| Full business insights     |
| GET    | /ai/revenue-prediction            | Admin| Revenue forecast           |
| GET    | /ai/churn-risk?days=60            | Admin| At-risk customers          |
| GET    | /ai/recommendations/:customerId  | Yes  | Service recommendations    |
| GET    | /ai/peak-hours                    | Yes  | Peak hours analysis        |
| GET    | /ai/inventory-insights            | Yes  | Reorder suggestions        |
| POST   | /ai/chat                          | No   | Chatbot query              |

### POST /ai/chat
```json
Request:  { "message": "What are your prices?" }
Response: { "text": "Here are our prices...", "suggestions": ["Book appointment"] }
```
