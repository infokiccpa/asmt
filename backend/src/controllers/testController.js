const Test = require('../models/Test');

exports.createTest = async (req, res, next) => {
  try {
    const { title, description, instructions, duration, totalMarks, marksConfig, sections, isPublished, startDate, endDate, shuffleQuestions, assignedUsers, assignedGroups } = req.body;
    const test = await Test.create({ title, description, instructions, duration, totalMarks, marksConfig, sections, isPublished, startDate, endDate, shuffleQuestions, assignedUsers, assignedGroups, createdBy: req.user._id });
    res.status(201).json(test);
  } catch (error) { next(error); }
};

exports.getTests = async (req, res, next) => {
  try {
    const filters = {};
    if (req.user.role === 'Student') {
      filters.isPublished = true;
      const now = new Date();
      filters.$and = [
        { $or: [{ startDate: { $exists: false } }, { startDate: null }, { startDate: { $lte: now } }] },
        { $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: now } }] }
      ];
    } else if (req.user.role === 'Admin') {
      filters.createdBy = req.user._id;
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [tests, total] = await Promise.all([
      Test.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Test.countDocuments(filters)
    ]);
    res.json({ data: tests, total, page, pages: Math.ceil(total / limit) });
  } catch (error) { next(error); }
};

exports.getTestById = async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.id).populate('sections.questions');
    if (!test) return res.status(404).json({ message: 'Test not found' });
    
    if (req.user.role === 'Admin' && test.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this test' });
    }
    
    if (req.user.role === 'Student') {
      const now = new Date();
      if ((test.startDate && test.startDate > now) || (test.endDate && test.endDate < now)) {
        return res.status(403).json({ message: 'Test is not currently available' });
      }
    }

    if (req.user.role === 'Student' && test.shuffleQuestions) {
      test.sections.forEach(section => {
        if (section.questions) section.questions.sort(() => Math.random() - 0.5);
      });
    }
    
    res.json(test);
  } catch (error) { next(error); }
};

exports.exportTestResults = async (req, res) => {
  try {
    const Test = require('../models/Test');
    const Attempt = require('../models/Attempt');
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });

    const attempts = await Attempt.find({ test: req.params.id }).populate('student');
    
    let csv = 'Student Name,Email,Score,Total Questions,Correct Answers,Violations,Status,Start Time,End Time\n';

    for (const a of attempts) {
      const student = a.student || { name: 'Unknown', email: 'N/A' };
      const correctCount = (a.responses || []).filter(r => r.isCorrect).length;
      csv += `"${student.name}","${student.email}",${a.score || 0},${(a.responses || []).length},${correctCount},${(a.violations || []).length},"${a.status}","${a.startTime ? a.startTime.toISOString() : ''}","${a.endTime ? a.endTime.toISOString() : 'N/A'}"\n`;
    }

    res.header('Content-Type', 'text/csv');
    res.attachment(`${test.title.replace(/\s+/g, '_')}_results.csv`);
    return res.status(200).send(csv);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

exports.updateTest = async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    
    if (req.user.role === 'Admin' && test.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this test' });
    }

    const updates = ['title', 'description', 'instructions', 'duration', 'totalMarks', 'marksConfig', 'sections', 'isPublished', 'startDate', 'endDate', 'shuffleQuestions', 'assignedUsers', 'assignedGroups'];
    updates.forEach(field => {
      if (req.body[field] !== undefined) test[field] = req.body[field];
    });
    await test.save();
    res.json(test);
  } catch (error) { next(error); }
};

exports.deleteTest = async (req, res, next) => {
  try {
    const test = await Test.findById(req.params.id);
    if (!test) return res.status(404).json({ message: 'Test not found' });
    
    if (req.user.role === 'Admin' && test.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this test' });
    }

    await test.deleteOne();
    res.json({ message: 'Test deleted' });
  } catch (error) { next(error); }
};
