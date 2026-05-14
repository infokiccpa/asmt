const { OpenAI } = require('openai');
const dotenv = require('dotenv');

dotenv.config();

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function withRetry(fn, maxAttempts = 3, baseDelayMs = 500) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const isRetryable = err.status === 429 || err.status >= 500 || err.code === 'ECONNRESET';
      if (!isRetryable || attempt === maxAttempts) throw err;
      await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }
}

class AIService {
  constructor() {
    this.client = null;
    if (process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
    this.model = process.env.AI_MODEL || 'gpt-4o-mini';
  }

  /**
   * Evaluates a subjective answer using OpenAI.
   * @param {Object} question - The question object
   * @param {String} studentAnswer - The student's answer
   * @returns {Object} { score: Number, feedback: String }
   */
  async evaluateSubjectiveAnswer(question, studentAnswer) {
    if (!this.client) {
      console.warn('AIService: OpenAI client not initialized. Skipping AI evaluation.');
      return { score: 0, feedback: 'AI evaluation skipped (API key missing).' };
    }

    const prompt = `
      You are an expert evaluator. Grade the following student response based on the question and reference solution.
      
      Question: ${question.text}
      Reference Solution: ${question.referenceSolution || 'Not provided'}
      Student's Answer: ${studentAnswer}
      
      Provide a score between 0 and 1 (where 1 is perfect) and a brief justification/feedback for the student.
      
      Return the result as a JSON object:
      {
        "score": 0.85,
        "feedback": "Your explanation is good but missed the second point about..."
      }
    `;

    try {
      const response = await withRetry(() => this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: 'You are a professional examiner who grades strictly but fairly.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      }));

      const result = JSON.parse(response.choices[0].message.content);
      return {
        score: result.score || 0,
        feedback: result.feedback || 'No feedback provided.'
      };
    } catch (error) {
      console.error('AIService Error:', error);
      return { score: 0, feedback: 'Error during AI evaluation.' };
    }
  }

  /**
   * Generates a new set of questions based on a topic.
   * @param {String} topic 
   * @param {String} difficulty 
   * @param {Number} count 
   */
  async generateQuestions(topic, difficulty = 'Medium', count = 5) {
    if (!this.client) return [];

    const prompt = `
      Generate ${count} unique and creative ${difficulty} level questions on the topic: "${topic}".
      Ensure these questions are varied in structure and content to provide a fresh experience for each student.
      Include a mix of MCQs and Subjective questions.
      
      Return as a JSON object with a "questions" key:
      {
        "questions": [
          {
            "type": "MCQ",
            "text": "...",
            "options": [
              { "text": "Option 1", "isCorrect": true },
              { "text": "Option 2", "isCorrect": false }
            ],
            "difficulty": "${difficulty}",
            "subject": "${topic}"
          },
          ...
        ]
      }
    `;

    try {
      const response = await withRetry(() => this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.8,
      }));

      const result = JSON.parse(response.choices[0].message.content);
      return result.questions || [];
    } catch (error) {
      console.error('AIService Generation Error:', error);
      return [];
    }
  }
}

module.exports = new AIService();
