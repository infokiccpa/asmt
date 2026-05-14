const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Test = require('./src/models/Test');
const Question = require('./src/models/Question');
const User = require('./src/models/User');

async function checkTests() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI);
    const tests = await Test.find().limit(5);
    console.log('--- TESTS ---');
    console.log(JSON.stringify(tests, null, 2));

    const questions = await Question.find().limit(5);
    console.log('--- QUESTIONS ---');
    console.log(JSON.stringify(questions, null, 2));

    const users = await User.find().limit(5);
    console.log('--- USERS ---');
    console.log(JSON.stringify(users.map(u => ({ _id: u._id, email: u.email, name: u.name, role: u.role })), null, 2));

    if (tests.length > 0) {
      const test = tests[0];
      console.log(`--- ATTEMPTING UPDATE ON TEST ${test._id} ---`);
      test.isPublished = !test.isPublished;
      try {
        await test.save();
        console.log('✅ Update successful!');
      } catch (saveErr) {
        console.error('❌ Update failed!');
        console.error(saveErr);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkTests();
