const { validationResult, body, param } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  ...loginRules,
  body('role').optional().isIn(['admin', 'staff']),
];

const customerRules = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('phone').trim().notEmpty().withMessage('Phone is required'),
  body('email').optional({ values: 'falsy' }).isEmail().normalizeEmail(),
];

const serviceRules = [
  body('serviceName').trim().notEmpty().withMessage('Service name is required'),
  body('duration').isNumeric().withMessage('Duration must be a number'),
  body('price').isNumeric().withMessage('Price must be a number'),
  body('category').isIn(['Hair', 'Skin', 'Facial', 'Makeup', 'Nail', 'Spa', 'Other']),
];

const productRules = [
  body('productName').trim().notEmpty().withMessage('Product name is required'),
  body('price').isNumeric().withMessage('Price must be a number'),
  body('stock').isNumeric().withMessage('Stock must be a number'),
  body('category').isIn(['Shampoo', 'Conditioner', 'Serum', 'Cream', 'Gel', 'Color', 'Tools', 'Other']),
];

const billRules = [
  body('paymentMethod').isIn(['cash', 'upi', 'card', 'split']),
  body('totalAmount').isNumeric(),
  body('subtotal').isNumeric(),
];

const appointmentRules = [
  body('customer').notEmpty().withMessage('Customer is required'),
  body('service').notEmpty().withMessage('Service is required'),
  body('date').notEmpty().withMessage('Date is required'),
  body('time').notEmpty().withMessage('Time is required'),
];

const mongoIdRule = [
  param('id').isMongoId().withMessage('Invalid ID'),
];

module.exports = {
  validate,
  loginRules,
  registerRules,
  customerRules,
  serviceRules,
  productRules,
  billRules,
  appointmentRules,
  mongoIdRule,
};
