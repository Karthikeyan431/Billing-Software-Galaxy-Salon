# Galaxy Salon System - Code Quality & Best Practices Guide

**Version:** 1.0.0  
**Last Updated:** March 2026

---

## 📋 Code Quality Checklist

Use this checklist when writing new features or fixing bugs:

### Backend (Node.js/Express)

#### Security
- [ ] No hardcoded secrets or API keys
- [ ] All environment variables use `.env`
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (using Mongoose)
- [ ] CORS properly configured
- [ ] Rate limiting applied
- [ ] Error messages don't leak sensitive info
- [ ] Passwords properly hashed with saltRounds >= 10
- [ ] JWT tokens have expiration

#### Error Handling
- [ ] Try-catch blocks around all async operations
- [ ] Proper HTTP status codes used
- [ ] Error response format follows standard
- [ ] Errors logged with context
- [ ] Production errors don't expose stack traces
- [ ] Validation errors include field-level messages

#### Database Operations
- [ ] Database transactions used for multi-step operations
- [ ] Indexes defined on frequently queried fields
- [ ] Pagination implemented for large datasets
- [ ] No N+1 queries (use `.populate([...])` syntax)
- [ ] Timestamps (createdAt, updatedAt) on all schemas
- [ ] Soft deletes for important entities
- [ ] References properly set up with `ref:`

#### Code Style
- [ ] Consistent naming conventions (camelCase for variables/functions)
- [ ] Functions do one thing well
- [ ] Max function length: 50 lines (break into smaller functions)
- [ ] Comments explain "why" not "what"
- [ ] No console.log in production (use proper logging)
- [ ] DRY principle followed (no duplicate code)

#### Performance
- [ ] Database queries optimized
- [ ] Caching implemented where appropriate
- [ ] No blocking operations in request handlers
- [ ] Async/await used properly
- [ ] No memory leaks in long-running processes
- [ ] Batch operations used for bulk inserts/updates

---

### Frontend (React/Next.js)

#### User Experience
- [ ] Loading states shown while fetching
- [ ] Error messages displayed to user
- [ ] Success messages after actions
- [ ] No silent failures
- [ ] Forms validated before submission
- [ ] Disabled buttons while loading
- [ ] Keyboard navigation works
- [ ] Responsive design on mobile/tablet

#### Code Quality
- [ ] Components are small and reusable
- [ ] Props are typed/validated
- [ ] No prop drilling (use Context API or state management)
- [ ] Hooks used properly (dependencies array correct)
- [ ] No hardcoded strings (use constants or i18n)
- [ ] Components wrapped in error boundary
- [ ] Unused imports removed

#### Performance
- [ ] Components memoized if expensive
- [ ] Images optimized and lazy-loaded
- [ ] Unnecessary re-renders eliminated
- [ ] useCallback used for callbacks in useEffect dependencies
- [ ] Bundle size monitored
- [ ] Unused packages removed

#### Accessibility
- [ ] Proper semantic HTML used
- [ ] Alt text on images
- [ ] Form labels associated with inputs
- [ ] Color not sole means of conveying info
- [ ] ARIA labels where necessary
- [ ] Tab order logical
- [ ] Focus visible on interactive elements

---

## 🏗️ Architecture Best Practices

### File Structure

```
project/
├── server/
│   ├── config/          # Configuration files
│   ├── controllers/     # Business logic
│   ├── middleware/      # Express middleware
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   ├── services/        # External integrations
│   ├── utils/           # Utility functions
│   └── index.js         # Express app entry point
│
└── client/
    ├── src/
    │   ├── components/  # Reusable components
    │   ├── hooks/       # Custom React hooks
    │   ├── pages/       # Next.js pages
    │   ├── services/    # API layer
    │   ├── styles/      # CSS files
    │   └── utils/       # Utility functions
    └── public/          # Static files
```

### API Design

#### Consistent Naming
```javascript
// GOOD ✅
GET /api/customers
GET /api/customers/:id
POST /api/customers
PUT /api/customers/:id
DELETE /api/customers/:id

// BAD ❌
GET /api/getCustomers
GET /api/getCustomerById/:id
GET /api/addCustomer
POST /api/updateCustomer
POST /api/deleteCustomer/:id
```

#### Consistent Response Format
```javascript
// Success ✅
{
  "data": { ... },
  "total": 100,
  "page": 1,
  "pages": 5
}

// Error ✅
{
  "error": "Customer not found",
  "code": "NOT_FOUND",
  "timestamp": "2026-03-16T10:00:00Z"
}
```

#### Pagination
```javascript
// GOOD ✅
GET /api/customers?page=1&limit=20

// BAD ❌
GET /api/customers?start=0&count=20
GET /api/customers?offset=100&size=20
```

### Error Responses

```javascript
// Standard Format
{
  "error": "Error message",              // Human-readable message
  "code": "ERROR_CODE",                  // Machine-readable code
  "fields": { "email": "Invalid format" } // (Optional) Validation errors
  "timestamp": "ISO-8601 timestamp"      // For debugging
}

// HTTP Status Codes
200 OK              - Success
201 Created         - Resource created
400 Bad Request     - Validation error
401 Unauthorized    - Authentication failing
403 Forbidden       - Authorization failing
404 Not Found       - Resource not found
409 Conflict        - Duplicate resource
500 Internal Error  - Server error (don't leak details)
```

---

## 🔄 Git Workflow

### Commit Messages

```bash
# Format: type(scope): description

# Types: feat, fix, docs, style, refactor, perf, test, chore
# Scope: feature area
# Description: short, imperative tense

# GOOD EXAMPLES ✅
git commit -m "fix(bills): add transaction support for stock updates"
git commit -m "feat(auth): implement JWT token refresh"
git commit -m "docs(setup): add MongoDB configuration guide"

# BAD EXAMPLES ❌
git commit -m "fixed bug"
git commit -m "updates"
git commit -m "wip"
```

### Pull Request Process

1. Create feature branch: `git checkout -b feat/feature-name`
2. Write code with tests
3. Run linter: `npm run lint`
4. Run tests: `npm test`
5. Create pull request with description
6. Request code review
7. Address feedback
8. Merge after approval

---

## 📝 Code Examples

### Good Error Handling

```javascript
// ✅ GOOD
exports.createBill = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Validate input
    if (!req.body.totalAmount) {
      return res.status(400).json({
        error: 'Total amount is required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Perform operations with session
    const bill = await Bill.create([req.body], { session });

    await session.commitTransaction();
    res.status(201).json({ bill: bill[0] });
  } catch (error) {
    await session.abortTransaction();
    console.error('Bill creation failed:', error);
    res.status(500).json({
      error: 'Failed to create bill',
      code: 'INTERNAL_ERROR'
    });
  } finally {
    session.endSession();
  }
};

// ❌ BAD
exports.createBill = async (req, res) => {
  try {
    const bill = await Bill.create(req.body);
    res.json(bill);
  } catch (e) {} // Silent failure!
};
```

### Good React Component

```javascript
// ✅ GOOD
import { useEffect, useState } from 'react';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';

export default function CustomerList() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const { data } = await customerService.getAll();
      setCustomers(data.customers);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="error">{error}</div>;

  return (
    <div>
      {customers.map(c => (
        <div key={c._id}>{c.name}</div>
      ))}
    </div>
  );
}

// ❌ BAD
export default function CustomerList() {
  const [data, setData] = useState(null);

  useEffect(() => {
    customerService.getAll().then(res => {
      setData(res.data);
    });
  }, []); // Missing dependencies

  if (!data) return null; // No loading state

  return <div>{data.map(c => <div>{c.name}</div>)}</div>;
}
```

### Good Validation

```javascript
// ✅ GOOD - Server-side validation
exports.create = async (req, res) => {
  const errors = validateForm(req.body, {
    email: { required: true, pattern: validationRules.email },
    phone: { required: true, pattern: validationRules.phone },
    password: { required: true, minLength: 8 }
  });

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      fields: errors
    });
  }

  // Process valid data
};

// ✅ GOOD - Client-side validation
function CustomerForm() {
  const { values, errors, handleChange, handleBlur } = useFormValidation(
    { name: '', email: '', phone: '' },
    {
      name: { required: true },
      email: { required: true, pattern: validationRules.email },
      phone: { required: true, pattern: validationRules.phone }
    }
  );

  return (
    <form>
      <input
        name="email"
        value={values.email}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      {errors.email && <span className="error">{errors.email}</span>}
    </form>
  );
}

// ❌ BAD - No validation
exports.create = async (req, res) => {
  const user = await User.create(req.body); // Any data accepted!
};
```

---

## 🧪 Testing Strategy

### Unit Tests

```javascript
// Test individual functions
describe('validateEmail', () => {
  it('should return true for valid email', () => {
    expect(validateEmail('test@example.com')).toBe(true);
  });

  it('should return false for invalid email', () => {
    expect(validateEmail('invalid-email')).toBe(false);
  });
});
```

### Integration Tests

```javascript
// Test API endpoints
describe('POST /api/customers', () => {
  it('should create customer with valid data', async () => {
    const res = await request(app)
      .post('/api/customers')
      .send({ name: 'John', phone: '9876543210' });

    expect(res.status).toBe(201);
    expect(res.body.customer.name).toBe('John');
  });

  it('should reject invalid phone', async () => {
    const res = await request(app)
      .post('/api/customers')
      .send({ name: 'John', phone: 'invalid' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});
```

---

## 📊 Performance Guidelines

### Database

- Use indexes on frequently queried fields
- Limit query results with pagination
- Use `.select()` to fetch only needed fields
- Use `.lean()` for read-only queries (faster)
- Batch updates instead of individual updates

### API

- Compress responses with gzip
- Cache responses where appropriate
- Use CDN for static assets
- Implement pagination on large lists
- Use async operations to not block

### Frontend

- Code splitting for large bundles
- Lazy load images
- Memoize expensive components
- Avoid inline functions in render
- Remove unused dependencies

---

## 🔐 Security Checklist

- [ ] All inputs validated and sanitized
- [ ] No SQL injection possible (using Mongoose)
- [ ] XSS protected (React auto-escapes)
- [ ] CSRF tokens used if needed
- [ ] Passwords hashed (bcrypt, saltRounds >= 10)
- [ ] JWT tokens have expiration
- [ ] CORS whitelist configured
- [ ] Rate limiting on all endpoints
- [ ] HTTPS enforced in production
- [ ] Sensitive data encrypted
- [ ] No secrets in logs
- [ ] Error messages don't leak info
- [ ] Authentication required on protected routes
- [ ] Authorization verified for resource access

---

## 📚 Resources

- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [React Best Practices](https://react.dev/learn)
- [MongoDB Schema Design](https://www.mongodb.com/docs/manual/data-modeling/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Clean Code Principles](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)

---

**Happy Coding! 🚀**
