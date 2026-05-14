const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Test = require('../models/Test');
const Attempt = require('../models/Attempt');
const Question = require('../models/Question');

exports.getUsers = async (req, res) => {
  try {
    const filters = {};
    if (req.query.role) filters.role = req.query.role;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filters).sort({ createdAt: -1 }).select('-password').skip(skip).limit(limit),
      User.countDocuments(filters)
    ]);
    res.json({ data: users, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getPendingAdmins = async (req, res) => {
  try {
    const pendingAdmins = await User.find({ role: 'Admin', isApproved: false });
    res.json(pendingAdmins);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.approveAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role !== 'Admin') return res.status(400).json({ message: 'Only Admin accounts require approval' });
    
    user.isApproved = true;
    await user.save();
    res.json({ message: `${user.name}'s admin account has been approved.`, user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.rejectAdmin = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: `${user.name}'s admin account request has been rejected and removed.` });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.bulkCreateUsers = async (req, res) => {
  try {
    const { users } = req.body;
    const hashedUsers = await Promise.all(
      users.map(async ({ name, email, password, role }) => ({
        name,
        email,
        password: await bcrypt.hash(password, 10),
        role: role || 'Student',
        isApproved: true
      }))
    );
    const results = await User.insertMany(hashedUsers);
    res.json({ successCount: results.length, users: results });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getSystemStats = async (req, res) => {
  try {
    const [userCount, testCount, attemptCount, questionCount] = await Promise.all([
      User.countDocuments(),
      Test.countDocuments(),
      Attempt.countDocuments(),
      Question.countDocuments()
    ]);

    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(5).select('name email role createdAt');

    res.json({
      totals: {
        users: userCount,
        tests: testCount,
        attempts: attemptCount,
        questions: questionCount
      },
      usersByRole,
      recentUsers
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};
