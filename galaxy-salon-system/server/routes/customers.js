const router = require('express').Router();
const ctrl = require('../controllers/customerController');
const { auth } = require('../middleware/auth');
const { validate, customerRules, mongoIdRule } = require('../middleware/validators');

router.use(auth);

router.get('/', ctrl.getAll);
router.get('/quick-search/:query', ctrl.quickSearch);
router.get('/:id', mongoIdRule, validate, ctrl.getById);
router.get('/phone/:phone', ctrl.searchByPhone);
router.get('/:id/bills', mongoIdRule, validate, ctrl.getBillHistory);
router.post('/', customerRules, validate, ctrl.create);
router.put('/:id', mongoIdRule, validate, ctrl.update);
router.delete('/:id', mongoIdRule, validate, ctrl.delete);

module.exports = router;
