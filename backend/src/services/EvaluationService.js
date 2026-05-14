// Model dependency removed for Firestore migration
const AIService = require('./AIService');

class EvaluationService {
  /**
   * Evaluates a single response against the question data.
   * @param {Object} question - The question document from DB
   * @param {String} answer - The user's provided answer
   * @returns {Object} { isCorrect: Boolean, score: Number, feedback: String }
   */
  static async evaluateResponse(question, answer) {
    let isCorrect = false;
    let score = 0;
    let feedback = '';

    if (!question || !answer) return { isCorrect, score, feedback };

    switch (question.type) {
      case 'MCQ':
      case 'True/False': {
        const correctOption = question.options.find(o => o.isCorrect);
        if (correctOption && correctOption.text === answer) {
          isCorrect = true;
          score = 1;
        }
        break;
      }
      case 'Subjective':
      case 'Coding': {
        const aiResult = await AIService.evaluateSubjectiveAnswer(question, answer);
        score = aiResult.score;
        feedback = aiResult.feedback;
        isCorrect = score >= 0.8;
        break;
      }
      default:
        isCorrect = false;
        score = 0;
    }

    return { isCorrect, score, feedback };
  }

  /**
   * Calculates the total score for an attempt based on its responses.
   * @param {Array} responses - The responses array from an Attempt
   * @returns {Number} Total score
   */
  static calculateTotalScore(responses) {
    if (!responses || !Array.isArray(responses)) return 0;
    return responses.reduce((total, response) => total + (response.score || 0), 0);
  }
}

module.exports = EvaluationService;
