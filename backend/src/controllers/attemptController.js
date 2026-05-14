const Test = require('../models/Test');
const Question = require('../models/Question');
const Attempt = require('../models/Attempt');
const EvaluationService = require('../services/EvaluationService');

exports.startAttempt = async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.testId).populate('sections.questions');
    if (!test) return res.status(404).json({ message: 'Test not found' });

    const existing = await Attempt.findOne({ test: test._id, student: req.user._id });
    if (existing) {
      return res.status(400).json({ message: 'You have already started or completed this test', attemptId: existing._id });
    }

    let questions = [];
    test.sections.forEach(section => {
      questions = [...questions, ...section.questions];
    });

    if (test.shuffleQuestions) {
      questions = questions.sort(() => Math.random() - 0.5);
    } else {
      // Group by subject, then by topic (chapter) within each subject
      questions = questions.sort((a, b) => {
        const subjectDiff = (a.subject || '').localeCompare(b.subject || '');
        if (subjectDiff !== 0) return subjectDiff;
        return (a.topic || '').localeCompare(b.topic || '');
      });
    }

    const attempt = await Attempt.create({
      test: test._id,
      student: req.user._id,
      status: 'In-Progress',
      responses: questions.map(q => ({ question: q._id }))
    });

    res.status(201).json(attempt);
  } catch (error) { next(error); }
};

const requireAttemptOwnership = (attempt, req) => {
  const studentId = attempt.student._id || attempt.student;
  if (req.user.role === 'Student' && studentId.toString() !== req.user._id.toString()) {
    return false;
  }
  return true;
};

exports.getAttemptById = async (req, res, next) => {
  try {
    const attempt = await Attempt.findById(req.params.id)
      .populate('test')
      .populate('student')
      .populate('responses.question');

    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
    if (!requireAttemptOwnership(attempt, req)) return res.status(403).json({ message: 'Not authorized' });
    res.json(attempt);
  } catch (error) { next(error); }
};

exports.saveResponse = async (req, res, next) => {
  try {
    const { questionId, answer } = req.body;
    const attempt = await Attempt.findById(req.params.id);
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
    if (!requireAttemptOwnership(attempt, req)) return res.status(403).json({ message: 'Not authorized' });
    if (attempt.status !== 'In-Progress') {
      return res.status(400).json({ message: 'This attempt has already been submitted' });
    }

    const question = await Question.findById(questionId);
    if (!question) return res.status(404).json({ message: 'Question not found' });

    let isCorrect = false;
    if (question.type === 'MCQ' || question.type === 'True/False') {
      const correctOption = question.options.find(o => o.isCorrect);
      isCorrect = correctOption && correctOption.text === answer;
    }

    const responseIndex = attempt.responses.findIndex(r => r.question.toString() === questionId);
    if (responseIndex > -1) {
      attempt.responses[responseIndex].answer = answer;
      attempt.responses[responseIndex].isCorrect = isCorrect;
    } else {
      attempt.responses.push({ question: questionId, answer, isCorrect });
    }

    await attempt.save();
    res.json(attempt);
  } catch (error) { next(error); }
};

exports.submitAttempt = async (req, res, next) => {
  try {
    const attempt = await Attempt.findById(req.params.id)
      .populate('test')
      .populate('responses.question');
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
    if (!requireAttemptOwnership(attempt, req)) return res.status(403).json({ message: 'Not authorized' });

    attempt.status = 'Completed';
    attempt.endTime = new Date();

    const marksConfig = attempt.test?.marksConfig || { easy: 1, medium: 2, hard: 3 };

    for (const response of attempt.responses) {
      if (!response.question) continue;
      const difficulty = (response.question.difficulty || 'Medium').toLowerCase();
      const maxMark = marksConfig[difficulty] ?? 1;

      if (['Subjective', 'Coding'].includes(response.question.type)) {
        const result = await EvaluationService.evaluateResponse(response.question, response.answer);
        response.score = result.score * maxMark;
        response.isCorrect = result.isCorrect;
        response.feedback = result.feedback;
      } else {
        response.score = response.isCorrect ? maxMark : 0;
      }
    }
    attempt.score = EvaluationService.calculateTotalScore(attempt.responses);

    await attempt.save();
    res.json(attempt);
  } catch (error) { next(error); }
};

exports.addViolation = async (req, res, next) => {
  try {
    const attempt = await Attempt.findById(req.params.id);
    if (!attempt) return res.status(404).json({ message: 'Attempt not found' });
    if (!requireAttemptOwnership(attempt, req)) return res.status(403).json({ message: 'Not authorized' });

    attempt.violations.push({ type: req.body.type, timestamp: new Date() });
    await attempt.save();
    res.json({ message: 'Violation logged' });
  } catch (error) { next(error); }
};

exports.getAttempts = async (req, res, next) => {
  try {
    const filters = {};
    if (req.user.role === 'Student') filters.student = req.user._id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [attempts, total] = await Promise.all([
      Attempt.find(filters).populate('test').populate('student').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Attempt.countDocuments(filters)
    ]);
    res.json({ data: attempts, total, page, pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};

exports.getAttemptsByTest = async (req, res, next) => {
  try {
    const attempts = await Attempt.find({ test: req.params.testId })
      .populate('student')
      .sort({ createdAt: -1 });
    res.json(attempts);
  } catch (error) { next(error); }
};

exports.getUserAttempts = async (req, res, next) => {
  try {
    const attempts = await Attempt.find({ student: req.user._id })
      .populate('test')
      .sort({ createdAt: -1 });
    res.json(attempts);
  } catch (error) { next(error); }
};
