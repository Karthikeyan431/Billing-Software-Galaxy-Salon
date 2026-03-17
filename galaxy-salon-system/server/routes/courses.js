const router = require('express').Router();
const ctrl = require('../controllers/courseController');
const { auth, adminOnly } = require('../middleware/auth');
const { validate, mongoIdRule } = require('../middleware/validators');

router.use(auth);

router.get('/', ctrl.getAll);
router.get('/:id', mongoIdRule, validate, ctrl.getById);
router.post('/', adminOnly, ctrl.create);
router.put('/:id', adminOnly, mongoIdRule, validate, ctrl.update);
router.delete('/:id', adminOnly, mongoIdRule, validate, ctrl.delete);

module.exports = router;
