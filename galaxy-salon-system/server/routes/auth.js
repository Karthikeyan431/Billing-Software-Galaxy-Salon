const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { validate, loginRules, registerRules } = require('../middleware/validators');
const { authLimiter } = require('../middleware/rateLimiters');

router.post('/register', authLimiter, registerRules, validate, ctrl.register);
router.post('/login', authLimiter, loginRules, validate, ctrl.login);
router.get('/profile', auth, ctrl.getProfile);
router.put('/profile', auth, ctrl.updateProfile);

module.exports = router;
