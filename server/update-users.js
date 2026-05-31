// Script to update all existing users to have isEmailVerified = true
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

const updateUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/video-conferencing');
    console.log('Connected to MongoDB');

    // Update all users to have isEmailVerified = true
    const result = await User.updateMany(
      { isEmailVerified: false },
      { $set: { isEmailVerified: true } }
    );

    console.log(`Updated ${result.modifiedCount} users`);
    console.log('All users now have isEmailVerified = true');

    process.exit(0);
  } catch (error) {
    console.error('Error updating users:', error);
    process.exit(1);
  }
};

updateUsers();
