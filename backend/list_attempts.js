const mongoose = require('mongoose');
const path = require('path');
const Attempt = require('./src/models/Attempt');
const User = require('./src/models/User');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const listAttempts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const attempts = await Attempt.find().populate('student', 'email');
    console.log(JSON.stringify(attempts, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

listAttempts();
