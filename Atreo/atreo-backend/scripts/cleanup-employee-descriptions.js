/**
 * Cleanup Subscription Descriptions from Employee Payment Invoices
 * Removes incorrectly generated descriptions from employee payment invoices
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');

async function cleanupEmployeeDescriptions() {
  try {
    console.log('🧹 Cleaning up subscription descriptions from employee payment invoices...\n');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000
    });
    
    console.log('✅ Connected to database\n');
    
    // Find employee payment invoices that have subscription descriptions
    const employeeInvoices = await Invoice.find({
      $or: [
        { 'notes.type': 'employee_contractor' },
        { invoiceNumber: /^PAY-/i }
      ],
      subscriptionDescription: { $exists: true, $ne: null, $ne: '' }
    }).lean();
    
    console.log(`📊 Found ${employeeInvoices.length} employee payment invoices with descriptions\n`);
    
    if (employeeInvoices.length === 0) {
      console.log('✅ No employee invoices with descriptions found!\n');
      await mongoose.disconnect();
      process.exit(0);
    }
    
    let cleanedCount = 0;
    
    for (let i = 0; i < employeeInvoices.length; i++) {
      const invoice = employeeInvoices[i];
      try {
        console.log(`[${i + 1}/${employeeInvoices.length}] Cleaning: ${invoice.invoiceNumber}`);
        
        await Invoice.updateOne(
          { _id: invoice._id },
          { $unset: { subscriptionDescription: '' } }
        );
        
        console.log(`   ✅ Removed description`);
        cleanedCount++;
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   ✅ Cleaned: ${cleanedCount} invoices`);
    console.log('='.repeat(60));
    
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanupEmployeeDescriptions();
