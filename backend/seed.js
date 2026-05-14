const mongoose = require('mongoose');
const path = require('path');
const User = require('./src/models/User');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

const seedSuperAdmin = async () => {
  try {
    if (!MONGODB_URI) {
      console.error('MONGODB_URI is missing');
      process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const adminEmail = 'admin@clarity.com';
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log('Super Admin already exists.');
    } else {
      const admin = await User.create({
        name: 'Super Admin',
        email: adminEmail,
        password: 'admin123',
        role: 'Super Admin'
      });
      console.log('Super Admin created successfully!');
      console.log('Email: admin@clarity.com');
      console.log('Password: admin123');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
};

seedSuperAdmin();
