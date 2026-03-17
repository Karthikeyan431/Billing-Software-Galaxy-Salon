const router = require('express').Router();
const ctrl = require('../controllers/studentController');
const { auth, adminOnly } = require('../middleware/auth');
const { validate, mongoIdRule } = require('../middleware/validators');

router.use(auth);

router.get('/', ctrl.getAll);
router.get('/:id', mongoIdRule, validate, ctrl.getById);
router.post('/', adminOnly, ctrl.create);
router.put('/:id', adminOnly, mongoIdRule, validate, ctrl.update);
router.post('/:id/fee-payment', mongoIdRule, validate, ctrl.addFeePayment);
router.post('/:id/attendance', mongoIdRule, validate, ctrl.markAttendance);
router.post('/:id/certificate', adminOnly, mongoIdRule, validate, ctrl.issueCertificate);
router.delete('/:id', adminOnly, mongoIdRule, validate, ctrl.delete);

module.exports = router;
