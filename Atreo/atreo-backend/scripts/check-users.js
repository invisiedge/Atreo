/**
 * Check Users in Database
 * Lists all users to verify migration
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function checkUsers() {
  try {
    console.log('🔍 Checking users in database...\n');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    
    console.log('✅ Connected to database\n');
    
    const users = await User.find({}).select('email name role isActive').lean();
    
    console.log(`📊 Found ${users.length} users:\n`);
    
    if (users.length === 0) {
      console.log('⚠️  No users found in database!');
      console.log('💡 You need to either:');
      console.log('   1. Create an admin user: npm run create-admin');
      console.log('   2. Create a new user account');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Active: ${user.isActive ? 'Yes' : 'No'}`);
        console.log('');
      });
    }
    
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkUsers();
