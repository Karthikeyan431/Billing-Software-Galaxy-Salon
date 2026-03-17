const router = require('express').Router();
const ctrl = require('../controllers/productController');
const { auth, adminOnly } = require('../middleware/auth');
const { validate, productRules, mongoIdRule } = require('../middleware/validators');

router.use(auth);

router.get('/', ctrl.getAll);
router.get('/low-stock', ctrl.getLowStock);
router.get('/barcode/:code', ctrl.getByBarcode);
router.get('/:id', mongoIdRule, validate, ctrl.getById);
router.post('/', adminOnly, productRules, validate, ctrl.create);
router.put('/:id', adminOnly, mongoIdRule, validate, ctrl.update);
router.put('/:id/stock', adminOnly, mongoIdRule, validate, ctrl.updateStock);
router.delete('/:id', adminOnly, mongoIdRule, validate, ctrl.delete);

module.exports = router;
