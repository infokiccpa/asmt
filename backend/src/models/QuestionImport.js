const mongoose = require('mongoose');

const parsedQuestionSchema = new mongoose.Schema({
  rowNumber: { type: Number, required: true },
  isValid: { type: Boolean, default: false },
  validationErrors: [{ type: String }],
  normalizedQuestion: { type: mongoose.Schema.Types.Mixed },
  rawData: { type: mongoose.Schema.Types.Mixed }
}, { _id: false });

const questionImportSchema = new mongoose.Schema({
  batchId: { type: String, required: true, unique: true, index: true },
  originalFileName: { type: String, required: true },
  sourceType: { type: String, enum: ['csv', 'xlsx', 'json'], required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['previewed', 'imported', 'expired'],
    default: 'previewed'
  },
  summary: {
    totalRows: { type: Number, default: 0 },
    validRows: { type: Number, default: 0 },
    invalidRows: { type: Number, default: 0 }
  },
  parsedQuestions: [parsedQuestionSchema],
  importedQuestionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    index: { expires: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('QuestionImport', questionImportSchema);
