const express = require('express');
const { createQuestion, getQuestions, getQuestionById, updateQuestion, deleteQuestion, bulkUpload, bulkDeleteQuestions } = require('../controllers/questionController');
const {
  uploadQuestionImportFile,
  previewQuestionImport,
  getQuestionImportPreview,
  commitQuestionImport
} = require('../controllers/questionImportController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const router = express.Router();
router.use(protect);
router.use(authorize('Super Admin', 'Admin', 'Content Manager'));
router.post('/import/preview', uploadQuestionImportFile, previewQuestionImport);
router.get('/import/:previewId', getQuestionImportPreview);
router.post('/import/commit', commitQuestionImport);
router.route('/').post(createQuestion).get(getQuestions);
router.post('/bulk', bulkUpload);
router.post('/bulk-delete', bulkDeleteQuestions);
router.route('/:id').get(getQuestionById).put(updateQuestion).delete(deleteQuestion);
module.exports = router;
