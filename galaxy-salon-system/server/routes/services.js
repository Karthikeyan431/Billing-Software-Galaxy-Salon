const router = require('express').Router();
const ctrl = require('../controllers/serviceController');
const { auth, adminOnly } = require('../middleware/auth');
const { validate, serviceRules, mongoIdRule } = require('../middleware/validators');

router.use(auth);

router.get('/', ctrl.getAll);
router.get('/:id', mongoIdRule, validate, ctrl.getById);
router.post('/', adminOnly, serviceRules, validate, ctrl.create);
router.put('/:id', adminOnly, mongoIdRule, validate, ctrl.update);
router.delete('/:id', adminOnly, mongoIdRule, validate, ctrl.delete);

module.exports = router;
