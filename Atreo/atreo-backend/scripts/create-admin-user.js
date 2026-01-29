/**
 * Create Admin User
 * Creates a quick admin user for login
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Admin = require('../models/Admin');

async function createAdminUser() {
  try {
    console.log('🔧 Creating admin user...\n');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000
    });
    
    console.log('✅ Connected to database\n');
    
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@2025';
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: adminEmail });
    if (existingUser) {
      console.log(`⚠️  User with email ${adminEmail} already exists!`);
      console.log('   Skipping user creation...\n');
      
      // Check if admin record exists
      const existingAdmin = await Admin.findOne({ userId: existingUser._id });
      if (!existingAdmin) {
        console.log('   Creating admin record...');
        const admin = new Admin({
          userId: existingUser._id,
          adminId: 'ADM0001',
          name: existingUser.name,
          email: existingUser.email,
          role: 'super-admin',
          department: 'IT Administration',
          phone: '+1 (555) 000-0001',
          permissions: {
            canManageUsers: true,
            canManageEmployees: true,
            canManageAdmins: true,
            canManagePayroll: true,
            canViewReports: true,
            canExportData: true
          },
          status: 'active',
          notes: 'Primary system administrator'
        });
        await admin.save();
        console.log('   ✅ Admin record created!\n');
      } else {
        console.log('   ✅ Admin record already exists\n');
      }
      
      await mongoose.disconnect();
      process.exit(0);
    }
    
    // Create new admin user
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}\n`);
    
    const adminUser = new User({
      email: adminEmail,
      password: adminPassword,
      name: 'Admin User',
      role: 'admin',
      isActive: true,
      emailVerified: true
    });
    
    await adminUser.save();
    console.log('✅ Admin user created!\n');
    
    // Create admin record
    const admin = new Admin({
      userId: adminUser._id,
      adminId: 'ADM0001',
      name: 'Admin User',
      email: adminEmail,
      role: 'super-admin',
      department: 'IT Administration',
      phone: '+1 (555) 000-0001',
      permissions: {
        canManageUsers: true,
        canManageEmployees: true,
        canManageAdmins: true,
        canManagePayroll: true,
        canViewReports: true,
        canExportData: true
      },
      status: 'active',
      notes: 'Primary system administrator'
    });
    
    await admin.save();
    console.log('✅ Admin record created!\n');
    
    console.log('='.repeat(60));
    console.log('🎉 Admin user created successfully!');
    console.log('='.repeat(60));
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('='.repeat(60));
    console.log('\n✅ You can now login with these credentials\n');
    
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 11000) {
      console.error('   User with this email already exists');
    }
    process.exit(1);
  }
}

createAdminUser();
