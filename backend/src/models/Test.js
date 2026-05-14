const mongoose = require('mongoose');

const testSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  instructions: { type: String },
  duration: { type: Number, required: true },
  totalMarks: { type: Number, default: 0 },
  sections: [{
    name: { type: String },
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    randomGenerationConfig: {
      enabled: { type: Boolean, default: false },
      count: { type: Number, default: 0 },
      subject: { type: String },
      topic: { type: String },
      difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard', ''] },
      useAI: { type: Boolean, default: false }
    }
  }],
  isPublished: { type: Boolean, default: false },
  startDate: { type: Date },
  endDate: { type: Date },
  shuffleQuestions: { type: Boolean, default: false },
  marksConfig: {
    easy:   { type: Number, default: 1 },
    medium: { type: Number, default: 2 },
    hard:   { type: Number, default: 3 }
  },
  assignedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  assignedGroups: [{ type: String }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Test', testSchema);
