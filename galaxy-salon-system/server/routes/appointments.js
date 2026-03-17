const router = require('express').Router();
const ctrl = require('../controllers/appointmentController');
const { auth } = require('../middleware/auth');
const { validate, appointmentRules, mongoIdRule } = require('../middleware/validators');

router.use(auth);

router.get('/', ctrl.getAll);
router.get('/today', ctrl.getToday);
router.get('/:id', mongoIdRule, validate, ctrl.getById);
router.post('/', appointmentRules, validate, ctrl.create);
router.put('/:id', mongoIdRule, validate, ctrl.update);
router.put('/:id/cancel', mongoIdRule, validate, ctrl.cancel);

module.exports = router;
