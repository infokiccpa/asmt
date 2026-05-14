const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  image: { type: String },
  type: { type: String, enum: ['MCQ', 'True/False', 'Subjective', 'Coding'], required: true },
  options: [{
    text: { type: String },
    isCorrect: { type: Boolean, default: false }
  }],
  subject: { type: String, index: true },
  topic: { type: String, index: true },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'], index: true },
  tags: [String],
  codingTemplate: { type: String },
  referenceSolution: { type: String },
  testCases: [{
    input: { type: String },
    output: { type: String }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  importMeta: {
    batchId: { type: String },
    sourceFileName: { type: String },
    sourceType: { type: String, enum: ['csv', 'xlsx', 'json'] },
    importedAt: { type: Date }
  }
}, { timestamps: true });

// Compound index for frequent filtering
questionSchema.index({ subject: 1, topic: 1, difficulty: 1 });

module.exports = mongoose.model('Question', questionSchema);
