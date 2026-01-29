/**
 * Import Emails from Excel File
 * Reads email data from Excel file and imports into MongoDB
 */

require('dotenv').config();
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const Email = require('../models/Email');
const User = require('../models/User');

// Path to the Excel file (adjust as needed)
const EXCEL_FILE_PATH = path.join(__dirname, '../../../Email id list of all domain.xlsx');

async function importEmailsFromExcel() {
  try {
    console.log('📧 Starting email import from Excel...\n');
    
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 60000,
      socketTimeoutMS: 90000,
      connectTimeoutMS: 60000,
    });
    console.log('✅ Connected to MongoDB\n');
    
    // Check if Excel file exists
    if (!fs.existsSync(EXCEL_FILE_PATH)) {
      console.error(`❌ Excel file not found at: ${EXCEL_FILE_PATH}`);
      console.log('💡 Please ensure the Excel file is in the correct location.');
      process.exit(1);
    }
    
    console.log(`📄 Reading Excel file: ${EXCEL_FILE_PATH}\n`);
    
    // Read Excel file
    const workbook = XLSX.readFile(EXCEL_FILE_PATH);
    const sheetName = workbook.SheetNames[0]; // Use first sheet
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, // Use array format to see headers
      defval: null // Use null for empty cells
    });
    
    if (data.length < 2) {
      console.error('❌ Excel file appears to be empty or has no data rows');
      process.exit(1);
    }
    
    // Get headers (first row)
    const headers = data[0].map(h => h ? h.toString().trim() : '');
    console.log('📋 Detected columns:', headers.filter(h => h).join(', '), '\n');
    
    // Check if structure is: domains as column headers with emails below
    // OR: traditional structure with email/domain columns
    const emailIndex = headers.findIndex(h => 
      h && (h.toLowerCase().includes('email') || h.toLowerCase().includes('e-mail') || h.toLowerCase().includes('mail'))
    );
    const domainIndex = headers.findIndex(h => 
      h && (h.toLowerCase().includes('domain') || h.toLowerCase().includes('domains'))
    );
    
    // Determine structure type
    const isDomainColumnStructure = emailIndex < 0 && headers.some(h => h && h.length > 0);
    
    if (isDomainColumnStructure) {
      console.log('📊 Detected structure: Domains as column headers with emails listed below\n');
    } else {
      console.log('📊 Detected structure: Traditional column-based structure\n');
    }
    
    const passwordIndex = headers.findIndex(h => 
      h && h.toLowerCase().includes('password') || h.toLowerCase().includes('pass') || h.toLowerCase().includes('pwd')
    );
    const ownerIndex = headers.findIndex(h => 
      h && (h.toLowerCase().includes('owner') || h.toLowerCase().includes('user') || h.toLowerCase().includes('name'))
    );
    const purposeIndex = headers.findIndex(h => 
      h && (h.toLowerCase().includes('purpose') || h.toLowerCase().includes('use') || h.toLowerCase().includes('description'))
    );
    const notesIndex = headers.findIndex(h => 
      h && (h.toLowerCase().includes('note') || h.toLowerCase().includes('comment') || h.toLowerCase().includes('remark'))
    );
    const statusIndex = headers.findIndex(h => 
      h && (h.toLowerCase().includes('status') || h.toLowerCase().includes('state'))
    );
    const providerIndex = headers.findIndex(h => 
      h && (h.toLowerCase().includes('provider') || h.toLowerCase().includes('type'))
    );
    
    console.log('📍 Column mapping:');
    if (isDomainColumnStructure) {
      console.log(`   Structure: Domains as headers (${headers.filter(h => h).length} domains detected)`);
    } else {
      console.log(`   Email: ${emailIndex >= 0 ? headers[emailIndex] : 'NOT FOUND'}`);
      console.log(`   Domain: ${domainIndex >= 0 ? headers[domainIndex] : 'NOT FOUND'}`);
    }
    console.log(`   Password: ${passwordIndex >= 0 ? headers[passwordIndex] : 'NOT FOUND'}`);
    console.log(`   Owner: ${ownerIndex >= 0 ? headers[ownerIndex] : 'NOT FOUND'}`);
    console.log(`   Purpose: ${purposeIndex >= 0 ? headers[purposeIndex] : 'NOT FOUND'}`);
    console.log(`   Notes: ${notesIndex >= 0 ? headers[notesIndex] : 'NOT FOUND'}\n`);
    
    // Get admin user for createdBy field
    const adminUser = await User.findOne({ 
      email: process.env.ADMIN_EMAIL || 'admin@example.com' 
    });
    
    if (!adminUser) {
      console.error('❌ Admin user not found. Please create an admin user first.');
      console.log('💡 Run: npm run create-admin');
      process.exit(1);
    }
    
    console.log(`👤 Using admin user: ${adminUser.email} (${adminUser._id})\n`);
    
    // Helper function to import a single email
    async function importEmail(email, domain, password, owner, purpose, notes, status, provider, createdBy) {
      // Check if email already exists
      const existingEmail = await Email.findOne({ email });
      if (existingEmail) {
        return { skipped: true };
      }
      
      // Determine provider based on domain
      let finalProvider = provider || 'custom';
      if (domain && domain.includes('gmail.com')) {
        finalProvider = 'gmail';
      } else if (domain && (domain.includes('outlook.com') || domain.includes('hotmail.com') || domain.includes('live.com'))) {
        finalProvider = 'outlook';
      }
      
      // Determine status
      let finalStatus = status || 'active';
      if (typeof finalStatus === 'string') {
        finalStatus = finalStatus.toLowerCase().trim();
        if (!['active', 'inactive', 'suspended'].includes(finalStatus)) {
          finalStatus = 'active';
        }
      }
      
      // Create email record
      const emailRecord = new Email({
        email,
        password: password ? password.toString().trim() : undefined,
        domain,
        provider: finalProvider,
        status: finalStatus,
        owner: owner ? owner.toString().trim() : undefined,
        purpose: purpose ? purpose.toString().trim() : undefined,
        notes: notes ? notes.toString().trim() : undefined,
        createdBy
      });
      
      await emailRecord.save();
      return { imported: true };
    }
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails = [];
    
    // Process based on structure type
    if (isDomainColumnStructure) {
      // Structure: Domains as column headers, emails in rows below
      console.log(`📊 Processing domain columns structure...\n`);
      
      const rows = data.slice(1); // Skip header row
      
      // Process each column (domain)
      for (let colIndex = 0; colIndex < headers.length; colIndex++) {
        const domainHeader = headers[colIndex];
        if (!domainHeader || domainHeader.trim() === '') continue;
        
        // Skip if it's a label column (like "compqsoft email list")
        if (domainHeader.toLowerCase().includes('email list') || 
            domainHeader.toLowerCase().includes('email') && !domainHeader.includes('@')) {
          continue;
        }
        
        // Extract domain from header or use header as domain name
        let domain = domainHeader.trim().toLowerCase();
        
        // Process each row in this column
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
          const row = rows[rowIndex];
          const cellValue = row[colIndex];
          
          if (!cellValue) continue; // Skip empty cells
          
          const rowNum = rowIndex + 2;
          let email = cellValue.toString().trim().toLowerCase();
          
          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            // If not a valid email, might be just a username - construct email
            if (email && !email.includes('@')) {
              email = `${email}@${domain}`;
            } else {
              errors++;
              errorDetails.push(`Row ${rowNum}, Column ${colIndex + 1}: Invalid email format - ${cellValue}`);
              continue;
            }
          } else {
            // If email already has domain, extract it
            const emailDomain = email.split('@')[1];
            if (emailDomain) {
              domain = emailDomain;
            }
          }
          
          // Import this email
          try {
            const result = await importEmail(email, domain, null, null, null, null, 'active', 'custom', adminUser._id);
            if (result.skipped) {
              skipped++;
            } else if (result.imported) {
              imported++;
              if (imported % 10 === 0) {
                process.stdout.write(`\r✅ Imported ${imported} emails...`);
              }
            }
          } catch (error) {
            errors++;
            errorDetails.push(`Row ${rowNum}, Column ${colIndex + 1} (${email}): ${error.message}`);
          }
        }
      }
    } else {
      // Traditional structure: email and domain columns
      if (emailIndex < 0) {
        console.error('❌ Could not find email column in Excel file');
        console.log('💡 Please ensure your Excel file has a column named "Email" or "E-mail"');
        process.exit(1);
      }
      
      const rows = data.slice(1);
      console.log(`📊 Processing ${rows.length} rows...\n`);
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2;
        
        try {
          // Extract email
          let email = row[emailIndex];
          if (!email) {
            skipped++;
            continue;
          }
          
          email = email.toString().trim().toLowerCase();
          
          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(email)) {
            errors++;
            errorDetails.push(`Row ${rowNum}: Invalid email format - ${email}`);
            continue;
          }
          
          // Extract domain
          let domain = '';
          if (domainIndex >= 0 && row[domainIndex]) {
            domain = row[domainIndex].toString().trim().toLowerCase();
          } else {
            domain = email.split('@')[1];
          }
          
          if (!domain) {
            errors++;
            errorDetails.push(`Row ${rowNum}: Could not determine domain for ${email}`);
            continue;
          }
          
          // Import email
          try {
            const result = await importEmail(
              email,
              domain,
              passwordIndex >= 0 ? row[passwordIndex] : null,
              ownerIndex >= 0 ? row[ownerIndex] : null,
              purposeIndex >= 0 ? row[purposeIndex] : null,
              notesIndex >= 0 ? row[notesIndex] : null,
              statusIndex >= 0 ? row[statusIndex] : 'active',
              providerIndex >= 0 ? row[providerIndex] : 'custom',
              adminUser._id
            );
            if (result.skipped) {
              skipped++;
            } else if (result.imported) {
              imported++;
              if (imported % 10 === 0) {
                process.stdout.write(`\r✅ Imported ${imported} emails...`);
              }
            }
          } catch (error) {
            errors++;
            const emailValue = row[emailIndex] ? row[emailIndex].toString() : 'unknown';
            errorDetails.push(`Row ${rowNum} (${emailValue}): ${error.message}`);
          }
        } catch (error) {
          errors++;
          const emailValue = row[emailIndex] ? row[emailIndex].toString() : 'unknown';
          errorDetails.push(`Row ${rowNum} (${emailValue}): ${error.message}`);
        }
      }
    }
    
    console.log('\n');
    console.log('='.repeat(60));
    console.log('📊 Import Summary');
    console.log('='.repeat(60));
    console.log(`✅ Successfully imported: ${imported} emails`);
    console.log(`⏭️  Skipped (duplicates/empty): ${skipped} rows`);
    console.log(`❌ Errors: ${errors} rows`);
    console.log('='.repeat(60));
    
    if (errorDetails.length > 0) {
      console.log('\n❌ Error Details:');
      errorDetails.forEach(err => console.log(`   ${err}`));
    }
    
    if (imported > 0) {
      console.log('\n🎉 Email import completed successfully!');
      console.log(`📧 ${imported} emails are now available in your database.`);
    }
    
    await mongoose.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the import
importEmailsFromExcel();
