const Question = require('../models/Question');
const AIService = require('./AIService');

class TestGenerationService {
  /**
   * Generates a random set of questions based on the configuration from MongoDB.
   */
  static async generateRandomQuestions(config) {
    if (!config || !config.enabled || config.count <= 0) return [];

    const generationTopic = config.topic || config.subject;
    if (config.useAI && generationTopic) {
      return await this.generateNewQuestionsWithAI(generationTopic, config.difficulty || 'Medium', config.count);
    }

    const filters = {};
    if (config.subject) filters.subject = config.subject;
    if (config.topic) filters.topic = config.topic;
    if (config.difficulty) filters.difficulty = config.difficulty;

    const questions = await Question.find(filters).select('_id');
    const allIds = questions.map(q => q._id);
    
    // Simple random shuffle and slice
    return allIds.sort(() => Math.random() - 0.5).slice(0, config.count);
  }

  /**
   * Uses AI to generate new questions and saves them to MongoDB.
   */
  static async generateNewQuestionsWithAI(topic, difficulty, count) {
    const aiQuestions = await AIService.generateQuestions(topic, difficulty, count);
    if (!aiQuestions || aiQuestions.length === 0) return [];
    
    const questionsToInsert = aiQuestions.map(q => ({
      ...q,
      subject: topic,
      createdAt: new Date()
    }));
    
    const result = await Question.insertMany(questionsToInsert);
    return result.map(q => q._id);
  }
}

module.exports = TestGenerationService;
