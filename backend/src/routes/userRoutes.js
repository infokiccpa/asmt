const express = require('express');
const { getUsers, deleteUser, bulkCreateUsers, getPendingAdmins, approveAdmin, rejectAdmin, getSystemStats } = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const router = express.Router();

// All routes require auth
router.use(protect);

router.get('/', authorize('Super Admin', 'Admin'), getUsers);
router.get('/system-stats', authorize('Super Admin'), getSystemStats);
router.post('/bulk', authorize('Super Admin'), bulkCreateUsers);
router.delete('/:id', authorize('Super Admin'), deleteUser);

// Admin approval routes — Super Admin only
router.get('/pending-admins', authorize('Super Admin'), getPendingAdmins);
router.patch('/:id/approve', authorize('Super Admin'), approveAdmin);
router.patch('/:id/reject', authorize('Super Admin'), rejectAdmin);

module.exports = router;
