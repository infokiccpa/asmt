const mongoose = require('mongoose');

const attemptSchema = new mongoose.Schema({
  test: { type: mongoose.Schema.Types.ObjectId, ref: 'Test', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  responses: [{
    question: { type: mongoose.Schema.Types.ObjectId, ref: 'Question' },
    answer: { type: mongoose.Schema.Types.Mixed },
    isCorrect: { type: Boolean },
    score: { type: Number, default: 0 },
    feedback: { type: String },
    timeSpent: { type: Number, default: 0 } // Time spent on this question in seconds
  }],
  startTime: { type: Date, default: Date.now },
  endTime: { type: Date },
  status: { type: String, enum: ['In-Progress', 'Completed', 'Auto-Submitted'], default: 'In-Progress' },
  score: { type: Number, default: 0 },
  violations: [{
    type: { type: String },
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Attempt', attemptSchema);
