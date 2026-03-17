const router = require('express').Router();
const ctrl = require('../controllers/reportController');
const { auth, adminOnly } = require('../middleware/auth');

router.use(auth);

router.get('/dashboard', ctrl.getDashboard);
router.get('/sales', adminOnly, ctrl.getSalesReport);
router.get('/top-services', ctrl.getTopServices);
router.get('/top-products', ctrl.getTopProducts);
router.get('/payment-methods', ctrl.getPaymentMethodBreakdown);
router.get('/employee-performance', adminOnly, ctrl.getEmployeePerformance);

module.exports = router;
