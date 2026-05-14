const Question = require('../models/Question');

exports.createQuestion = async (req, res, next) => {
  try {
    const { text, image, type, options, subject, topic, difficulty, tags, codingTemplate, referenceSolution, testCases } = req.body;
    const question = await Question.create({ text, image, type, options, subject, topic, difficulty, tags, codingTemplate, referenceSolution, testCases, createdBy: req.user._id });
    res.status(201).json(question);
  } catch (error) { next(error); }
};

exports.getQuestions = async (req, res, next) => {
  try {
    const filters = {};
    if (req.user.role === 'Admin') filters.createdBy = req.user._id;
    if (req.query.subject) filters.subject = req.query.subject;
    if (req.query.topic) filters.topic = req.query.topic;
    if (req.query.difficulty) filters.difficulty = req.query.difficulty;

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [questions, total] = await Promise.all([
      Question.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Question.countDocuments(filters)
    ]);
    res.json({ data: questions, total, page, pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};

exports.getQuestionById = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ message: 'Question not found' });
    
    if (req.user.role === 'Admin' && question.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this question' });
    }
    res.json(question);
  } catch (error) { next(error); }
};

exports.updateQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ message: 'Question not found' });
    
    if (req.user.role === 'Admin' && question.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this question' });
    }

    const updates = ['text', 'image', 'type', 'options', 'subject', 'topic', 'difficulty', 'tags', 'codingTemplate', 'referenceSolution', 'testCases'];
    updates.forEach(field => {
      if (req.body[field] !== undefined) question[field] = req.body[field];
    });
    await question.save();
    res.json(question);
  } catch (error) { next(error); }
};

exports.deleteQuestion = async (req, res, next) => {
  try {
    const question = await Question.findById(req.params.id);
    if (!question) return res.status(404).json({ message: 'Question not found' });
    
    if (req.user.role === 'Admin' && question.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this question' });
    }

    await question.deleteOne();
    res.json({ message: 'Question deleted' });
  } catch (error) { next(error); }
};

exports.bulkUpload = async (req, res, next) => {
  try {
    const questions = req.body.questions.map(({ text, image, type, options, subject, topic, difficulty, tags, codingTemplate, referenceSolution, testCases }) => ({
      text, image, type, options, subject, topic, difficulty, tags, codingTemplate, referenceSolution, testCases,
      createdBy: req.user._id
    }));
    const results = await Question.insertMany(questions);
    res.status(201).json(results);
  } catch (error) { next(error); }
};

exports.bulkDeleteQuestions = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ message: 'IDs array is required' });
    }

    const filters = { _id: { $in: ids } };
    if (req.user.role === 'Admin') filters.createdBy = req.user._id;

    await Question.deleteMany(filters);
    res.json({ message: `Questions deleted` });
  } catch (error) { next(error); }
};
