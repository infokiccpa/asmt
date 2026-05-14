const express = require('express');
const { register, login, syncProfile, bootstrapSuperAdmin } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');
const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/sync-profile', protect, syncProfile);
router.post('/bootstrap-super-admin', bootstrapSuperAdmin);

module.exports = router;
