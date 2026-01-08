const User = require('../models/User');
const Employee = require('../models/Employee');
const Submission = require('../models/Submission');
const Admin = require('../models/Admin');

const seedDatabase = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await Employee.deleteMany({});
    await Submission.deleteMany({});
    await Admin.deleteMany({});

    // Create admin user
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminEmail || !adminPassword) {
      throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required');
    }
    
    const adminUser = new User({
      email: adminEmail,
      password: adminPassword,
      name: 'Admin User',
      role: 'admin'
    });
    await adminUser.save();

    // Create admin record for the main admin
    const mainAdmin = new Admin({
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
    await mainAdmin.save();

    // Only main admin is created - additional admins and employees should be created from admin side

    // Employee and additional admin creation commented out - should be created from admin side
    /*
    // Create employees
    const employees = [
      {
        userId: employeeUser._id,
        employeeId: 'EMP002',
        name: 'John Doe',
        email: 'john@atreo.com',
        position: 'Senior Software Engineer',
        department: 'Engineering',
        status: 'active',
        salary: 75000,
        phone: '+1 (555) 123-4567',
        address: {
          street: '123 Main St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94105',
          country: 'USA'
        },
        bankName: 'Chase Bank',
        accountNumber: '9876543210987',
        swiftCode: 'CHASUS33'
      },
      {
        userId: createdUsers[0]._id,
        employeeId: 'EMP003',
        name: 'Jane Smith',
        email: 'jane.smith@atreo.com',
        position: 'Product Manager',
        department: 'Product',
        status: 'active',
        salary: 85000,
        phone: '+1 (555) 234-5678',
        address: {
          street: '456 Oak Ave',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102',
          country: 'USA'
        },
        bankName: 'Wells Fargo',
        accountNumber: '1234567890123',
        swiftCode: 'WFBIUS6S'
      },
      {
        userId: createdUsers[1]._id,
        employeeId: 'EMP004',
        name: 'Mike Johnson',
        email: 'mike.johnson@atreo.com',
        position: 'UX Designer',
        department: 'Design',
        status: 'active',
        salary: 70000,
        phone: '+1 (555) 345-6789',
        address: {
          street: '789 Pine St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94103',
          country: 'USA'
        },
        bankName: 'Bank of America',
        accountNumber: '4567890123456',
        swiftCode: 'BOFAUS3N'
      },
      {
        userId: createdUsers[2]._id,
        employeeId: 'EMP005',
        name: 'Sarah Wilson',
        email: 'sarah.wilson@atreo.com',
        position: 'Marketing Specialist',
        department: 'Marketing',
        status: 'active',
        salary: 65000,
        phone: '+1 (555) 456-7890',
        address: {
          street: '321 Elm St',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94104',
          country: 'USA'
        },
        bankName: 'Citibank',
        accountNumber: '7890123456789',
        swiftCode: 'CITIUS33'
      }
    ];

    for (const employeeData of employees) {
      const employee = new Employee(employeeData);
      await employee.save();
    }

    // Create admin records
    const admins = [
      {
        userId: createdAdminUsers[0]._id,
        adminId: 'ADM0002',
        name: 'HR Admin',
        email: 'hr.admin@atreo.com',
        role: 'admin',
        department: 'Human Resources',
        phone: '+1 (555) 000-0002',
        permissions: {
          canManageUsers: true,
          canManageEmployees: true,
          canManageAdmins: false,
          canManagePayroll: false,
          canViewReports: true,
          canExportData: false
        },
        status: 'active',
        createdBy: adminUser._id,
        notes: 'HR department administrator'
      },
      {
        userId: createdAdminUsers[1]._id,
        adminId: 'ADM0003',
        name: 'Finance Admin',
        email: 'finance.admin@atreo.com',
        role: 'admin',
        department: 'Finance',
        phone: '+1 (555) 000-0003',
        permissions: {
          canManageUsers: false,
          canManageEmployees: false,
          canManageAdmins: false,
          canManagePayroll: true,
          canViewReports: true,
          canExportData: true
        },
        status: 'active',
        createdBy: adminUser._id,
        notes: 'Finance department administrator'
      },
      {
        userId: createdAdminUsers[2]._id,
        adminId: 'ADM0004',
        name: 'Operations Admin',
        email: 'operations.admin@atreo.com',
        role: 'admin',
        department: 'Operations',
        phone: '+1 (555) 000-0004',
        permissions: {
          canManageUsers: true,
          canManageEmployees: true,
          canManageAdmins: false,
          canManagePayroll: true,
          canViewReports: true,
          canExportData: true
        },
        status: 'active',
        createdBy: adminUser._id,
        notes: 'Operations department administrator'
      }
    ];

    for (const adminData of admins) {
      const admin = new Admin(adminData);
      await admin.save();
    }

    // Create sample submissions
    const submissions = [
      {
        employeeId: 'EMP002',
        employeeName: 'John Doe',
        userId: employeeUser._id,
        bankDetails: {
          bankName: 'Chase Bank',
          accountNumber: '****0987',
          fullAccountNumber: '9876543210987',
          swiftCode: 'CHASUS33'
        },
        workPeriod: 'January 1-31, 2024',
        description: 'Monthly salary payment',
        totalAmount: 3500.00,
        status: 'pending',
        invoiceNumber: 'INV-2024-0001'
      },
      {
        employeeId: 'EMP003',
        employeeName: 'Jane Smith',
        userId: createdUsers[0]._id,
        bankDetails: {
          bankName: 'Bank of America',
          accountNumber: '****1234',
          fullAccountNumber: '1234567890123',
          swiftCode: 'BOFAUS3N'
        },
        workPeriod: 'January 1-31, 2024',
        description: 'Monthly salary payment',
        totalAmount: 4200.00,
        status: 'approved',
        invoiceNumber: 'INV-2024-0002',
        reviewedAt: new Date(),
        reviewedBy: adminUser._id,
        reviewerName: 'Admin User'
      },
      {
        employeeId: 'EMP004',
        employeeName: 'Mike Johnson',
        userId: createdUsers[1]._id,
        bankDetails: {
          bankName: 'Wells Fargo',
          accountNumber: '****5678',
          fullAccountNumber: '5678901234567',
          swiftCode: 'WFBIUS6S'
        },
        workPeriod: 'January 1-31, 2024',
        description: 'Monthly salary payment',
        totalAmount: 3200.00,
        status: 'approved',
        invoiceNumber: 'INV-2024-0003',
        reviewedAt: new Date(),
        reviewedBy: adminUser._id,
        reviewerName: 'Admin User'
      }
    ];

    for (const submissionData of submissions) {
      const submission = new Submission(submissionData);
      await submission.save();
    }
    */

    // Database seeded successfully

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
};

module.exports = seedDatabase;
