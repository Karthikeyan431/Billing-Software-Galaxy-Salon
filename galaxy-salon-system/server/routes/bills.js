const router = require('express').Router();
const ctrl = require('../controllers/billController');
const { auth } = require('../middleware/auth');
const { validate, billRules, mongoIdRule } = require('../middleware/validators');

router.use(auth);

router.get('/', ctrl.getAll);
router.get('/daily-summary', ctrl.getDailySummary);
router.get('/:id', mongoIdRule, validate, ctrl.getById);
router.post('/', billRules, validate, ctrl.create);
router.put('/:id/cancel', mongoIdRule, validate, ctrl.cancel);

module.exports = router;
