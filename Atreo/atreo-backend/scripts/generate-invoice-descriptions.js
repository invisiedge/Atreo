/**
 * Generate Subscription Descriptions for Existing Invoices
 * Backfills subscription descriptions for invoices that don't have them
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Tool = require('../models/Tool');
const { generateSubscriptionDescription } = require('../services/subscriptionDescription');

async function generateDescriptions() {
  try {
    console.log('🔧 Generating subscription descriptions for existing invoices...\n');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 30000
    });
    
    console.log('✅ Connected to database\n');
    
    // Find invoices without subscription descriptions
    // Exclude employee payment invoices (they don't need subscription descriptions)
    const invoices = await Invoice.find({
      $and: [
        {
          $or: [
            { subscriptionDescription: { $exists: false } },
            { subscriptionDescription: null },
            { subscriptionDescription: '' }
          ]
        },
        // Exclude employee payment invoices
        { 'notes.type': { $ne: 'employee_contractor' } },
        // Exclude invoices with PAY- prefix (employee payments)
        { invoiceNumber: { $not: /^PAY-/i } }
      ]
    }).populate('toolIds', 'name description').lean();
    
    console.log(`📊 Found ${invoices.length} invoices without descriptions\n`);
    
    if (invoices.length === 0) {
      console.log('✅ All invoices already have descriptions!\n');
      await mongoose.disconnect();
      process.exit(0);
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < invoices.length; i++) {
      const invoice = invoices[i];
      try {
        // Skip employee payment invoices
        if (invoice.notes?.type === 'employee_contractor' || invoice.invoiceNumber?.startsWith('PAY-')) {
          console.log(`[${i + 1}/${invoices.length}] ⏭️  Skipping employee payment: ${invoice.invoiceNumber}`);
          continue;
        }
        
        console.log(`[${i + 1}/${invoices.length}] Processing: ${invoice.invoiceNumber} (${invoice.provider})`);
        
        const linkedTools = invoice.toolIds || [];
        const description = await generateSubscriptionDescription(invoice.provider, linkedTools);
        
        if (description) {
          await Invoice.updateOne(
            { _id: invoice._id },
            { $set: { subscriptionDescription: description } }
          );
          console.log(`   ✅ Generated description`);
          successCount++;
        } else {
          console.log(`   ⚠️  No description generated`);
        }
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    console.log('='.repeat(60));
    
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

generateDescriptions();
