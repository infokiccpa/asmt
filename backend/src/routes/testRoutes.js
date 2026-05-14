const express = require('express');
const { createTest, getTests, getTestById, updateTest, deleteTest, exportTestResults } = require('../controllers/testController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const router = express.Router();
router.use(protect);
router.route('/').post(authorize('Super Admin', 'Admin'), createTest).get(getTests);
router.route('/:id').get(getTestById).put(authorize('Super Admin', 'Admin'), updateTest).delete(authorize('Super Admin', 'Admin'), deleteTest);
router.get('/:id/export', authorize('Super Admin', 'Admin'), exportTestResults);
module.exports = router;
