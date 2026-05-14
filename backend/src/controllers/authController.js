const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

exports.register = async (req, res, next) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email and password are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }
  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const SELF_ASSIGNABLE_ROLES = ['Student', 'Admin'];
    const assignedRole = SELF_ASSIGNABLE_ROLES.includes(role) ? role : 'Student';
    const isApproved = assignedRole !== 'Admin';

    const user = await User.create({
      name,
      email,
      password,
      role: assignedRole,
      isApproved
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('REGISTRATION ERROR:', error);
    next(error);
  }
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  try {
    const user = await User.findOne({ email });
    if (user && (await user.comparePassword(password))) {
      if (!user.isApproved) {
        return res.status(403).json({ 
          message: 'Your admin account is pending approval from a Super Admin.'
        });
      }

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('LOGIN ERROR:', error);
    next(error);
  }
};

exports.syncProfile = async (req, res, next) => {
  // Not used in traditional JWT auth, but kept for route compatibility
  res.json(req.user);
};

// One-time bootstrap: creates the first Super Admin when no Super Admin exists.
// Requires BOOTSTRAP_SECRET env variable to be set and matched in the request.
exports.bootstrapSuperAdmin = async (req, res, next) => {
  const { name, email, password, secret } = req.body;
  try {
    const bootstrapSecret = process.env.BOOTSTRAP_SECRET;
    if (!bootstrapSecret || secret !== bootstrapSecret) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const superAdminExists = await User.findOne({ role: 'Super Admin' });
    if (superAdminExists) {
      return res.status(409).json({ message: 'A Super Admin already exists' });
    }

    const user = await User.create({ name, email, password, role: 'Super Admin', isApproved: true });
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('BOOTSTRAP ERROR:', error);
    next(error);
  }
};
