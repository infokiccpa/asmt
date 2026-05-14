const mongoose = require('mongoose');
const path = require('path');
const Attempt = require('./src/models/Attempt');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const deleteEmptyAttempts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const result = await Attempt.deleteMany({ 'responses.0': { $exists: false } });
    console.log(`Deleted ${result.deletedCount} empty attempts.`);
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

deleteEmptyAttempts();
