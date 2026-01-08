const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const mongoose = require('mongoose');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// GET /api/payments - Fetch all employee/contractor payments (stored as invoices)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Find all invoices that have the employee_contractor type in notes
    const payments = await Invoice.find({
      'notes.type': 'employee_contractor'
    }).sort({ billingDate: -1 });

    // Transform for frontend
    res.json(payments.map(p => ({
      id: p._id,
      invoiceNumber: p.invoiceNumber,
      amount: p.amount,
      currency: p.currency,
      provider: p.provider,
      billingDate: p.billingDate,
      category: p.category,
      status: p.status,
      notes: p.notes
    })));
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ message: 'Failed to fetch payments' });
  }
});

    // Helper to parse month string to billingDate
    const parseMonthToDate = (monthStr) => {
      if (!monthStr) return new Date();
      const monthsMap = {
        'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5,
        'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11,
        'january': 0, 'february': 1, 'march': 2, 'april': 3, 'may': 4, 'june': 5,
        'july': 6, 'august': 7, 'september': 8, 'october': 9, 'november': 10, 'december': 11
      };
      
      const parts = String(monthStr).toLowerCase().split(/[\s,]+/);
      let month = 0;
      let year = new Date().getFullYear();
      
      for (const part of parts) {
        if (monthsMap[part] !== undefined) {
          month = monthsMap[part];
        } else if (/^\d{4}$/.test(part)) {
          year = parseInt(part);
        } else if (/^\d{2}$/.test(part)) {
          year = 2000 + parseInt(part);
        }
      }
      
      const date = new Date(year, month, 15); // Middle of the month
      return isNaN(date.getTime()) ? new Date() : date;
    };

    // Helper to normalize month string to "Month Year" format
    const normalizeMonthName = (monthStr) => {
      if (!monthStr) {
        const now = new Date();
        return `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
      }
      
      const date = parseMonthToDate(monthStr);
      return `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
    };

    // POST /api/payments - Create a single payment record
    router.post('/', authenticateToken, async (req, res) => {
      try {
        const { name, amount, month: monthRaw, role, contractHours, fulfilledHours } = req.body;

        if (!name || amount === undefined) {
          return res.status(400).json({ message: 'Name and amount are required' });
        }

        const month = normalizeMonthName(monthRaw);
        const billingDate = parseMonthToDate(monthRaw);

        // Fetch user to get organizationId
        const currentUser = await User.findById(req.user.userId);
        const organizationId = currentUser ? currentUser.organizationId : null;

        // Create a unique invoice number
        const random = Math.floor(Math.random() * 10000);
        const invoiceNumber = `PAY-${String(month).replace(/\s+/g, '')}-${String(name).substring(0, 3).toUpperCase()}-${random}`;

        const newPayment = new Invoice({
          invoiceNumber,
          amount: parseFloat(amount),
          currency: 'USD',
          provider: name,
          billingDate,
          category: role || 'Employee Payment',
          status: 'approved',
          uploadedBy: req.user.userId,
          organizationId: organizationId,
          notes: {
            type: 'employee_contractor',
            month,
            role: role || '',
            contractHours: parseFloat(contractHours) || 0,
            fulfilledHours: parseFloat(fulfilledHours) || 0,
            createdAt: new Date()
          }
        });

        await newPayment.save();
        res.status(201).json(newPayment);
      } catch (error) {
        console.error('Error creating payment:', error);
        res.status(500).json({ message: 'Failed to create payment record' });
      }
    });

// POST /api/payments/import-excel - Import payments from Excel
router.post('/import-excel', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Fetch user to get organizationId
    const currentUser = await User.findById(req.user.userId);
    const organizationId = currentUser ? currentUser.organizationId : null;

    // Security: Read with safe options to mitigate prototype pollution
    const workbook = XLSX.read(req.file.buffer, { 
      type: 'buffer',
      cellDates: false,
      cellNF: false,
      cellStyles: false,
      dense: false
    });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get all rows as arrays to find header row dynamically
    const allRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

    console.log(`📂 Processing Excel import: ${allRows.length} total rows found in sheet "${sheetName}"`);

    if (allRows.length === 0) {
      return res.status(400).json({ message: 'The uploaded file is empty' });
    }

    // Define header aliases (normalized: lowercase, alphanumeric only)
    const aliases = {
      name: ['name', 'employeename', 'provider', 'employee', 'worker', 'fullname', 'staff', 'staffname', 'resource', 'consultant', 'user', 'resourcename', 'providername', 'vendor', 'payee', 'fullnames', 'employeenames', 'resource', 'consultants'],
      amount: ['amount', 'total', 'totalamount', 'price', 'cost', 'net', 'gross', 'salary', 'payment', 'wage', 'rate', 'payout', 'due', 'netpay', 'grosspay', 'totalpay', 'salaryamount', 'wageamount', 'paymentamount', 'payoutamount', 'amountusd', 'totalusd', 'payoutusd', 'netamount', 'totalpayout'],
      month: ['month', 'billingmonth', 'period', 'date', 'monthyear', 'timeperiod', 'billingperiod', 'cycle', 'monthof', 'billingcycle', 'payperiod', 'monthperiod'],
      role: ['role', 'position', 'category', 'jobtitle', 'type', 'status', 'designation', 'department', 'title'],
      contractHours: ['contracthours', 'monthlyhours', 'scheduledhours', 'contractedhours', 'basehours', 'targethours', 'workinghours', 'contracthour'],
      fulfilledHours: ['fulfilledhours', 'actualhours', 'workedhours', 'hoursdone', 'totalhours', 'hours', 'billablehours', 'actualworkedhours', 'fulfilledhour', 'actualfulfilledhours']
    };

    const normalize = (str) => String(str || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

    // Find the header row
    let headerRowIndex = -1;
    let colMap = {};

    console.log('🔍 Searching for header row in first 20 rows...');
    for (let i = 0; i < Math.min(allRows.length, 20); i++) {
      const row = allRows[i];
      const normalizedRow = row.map(cell => normalize(cell));
      
      console.log(`Row ${i} normalized:`, normalizedRow);
      
      // Check if this row looks like a header (contains at least name and amount aliases)
      let foundName = false;
      let foundAmount = false;
      let tempMap = {};

      normalizedRow.forEach((cell, index) => {
        if (!cell) return;
        
        for (const [key, searchAliases] of Object.entries(aliases)) {
          if (searchAliases.includes(cell)) {
            tempMap[key] = index;
            if (key === 'name') foundName = true;
            if (key === 'amount') foundAmount = true;
          }
        }
      });

      if (foundName && foundAmount) {
        headerRowIndex = i;
        colMap = tempMap;
        console.log(`✅ Found complete header row at index ${i}:`, colMap);
        break;
      } else if (foundName || foundAmount) {
        // Keep track of the best partial match just in case
        if (headerRowIndex === -1 || (Object.keys(tempMap).length > Object.keys(colMap).length)) {
          headerRowIndex = i;
          colMap = tempMap;
          console.log(`⚠️ Found partial header row at index ${i}:`, colMap);
        }
      }
    }

    // If no header row found with aliases, try using the first non-empty row as header
    if (headerRowIndex === -1 || (!colMap.name && !colMap.amount)) {
      console.log('⚠️ No clear header row found. Attempting to guess from first non-empty row.');
      for (let i = 0; i < Math.min(allRows.length, 10); i++) {
        const row = allRows[i];
        if (row.some(cell => cell !== '')) {
          headerRowIndex = i;
          // Map indices by looking at aliases
          row.forEach((cell, index) => {
            const normCell = normalize(cell);
            for (const [key, searchAliases] of Object.entries(aliases)) {
              if (searchAliases.includes(normCell)) colMap[key] = index;
            }
          });
          
          // If still no luck, take a guess: first string column is name, first number column is amount
          if (!colMap.name) {
            const nameIdx = row.findIndex(cell => typeof cell === 'string' && cell.trim().length > 2);
            if (nameIdx !== -1) colMap.name = nameIdx;
          }
          if (!colMap.amount) {
            const amountIdx = row.findIndex(cell => typeof cell === 'number' && cell > 0);
            if (amountIdx !== -1) colMap.amount = amountIdx;
          }
          
          if (colMap.name !== undefined || colMap.amount !== undefined) {
            console.log(`💡 Guessed header row at index ${i}:`, colMap);
            break;
          }
        }
      }
    }

    if (headerRowIndex === -1 || (colMap.name === undefined && colMap.amount === undefined)) {
      console.error('❌ Could not identify columns in Excel');
      return res.status(400).json({ 
        success: false, 
        message: 'Could not identify data columns. Please ensure your Excel has clear headers like "Name" and "Amount".',
        headersFound: colMap,
        sampleRow: allRows[0]
      });
    }

    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errorDetails = [];
    const importedPayments = [];

        // Parse numeric values helper
        const parseNumeric = (val) => {
          if (val === undefined || val === null || val === '') return 0;
          if (typeof val === 'number') return val;
          const cleaned = String(val).replace(/[^0-9.-]/g, '');
          const parsed = parseFloat(cleaned);
          return isNaN(parsed) ? 0 : parsed;
        };

        console.log(`🚀 Starting processing from row ${headerRowIndex + 1}...`);

        // Process data rows
        for (let i = headerRowIndex + 1; i < allRows.length; i++) {
          const row = allRows[i];
          
          // Skip empty rows
          if (!row || row.length === 0 || row.every(cell => !cell || cell === '')) {
            continue;
          }

          try {
            const name = colMap.name !== undefined ? String(row[colMap.name] || '').trim() : '';
            const amountRaw = colMap.amount !== undefined ? row[colMap.amount] : 0;
            const monthRaw = colMap.month !== undefined ? row[colMap.month] : '';
            const role = colMap.role !== undefined ? String(row[colMap.role] || '').trim() : '';
            const contractHoursRaw = colMap.contractHours !== undefined ? row[colMap.contractHours] : 0;
            const fulfilledHoursRaw = colMap.fulfilledHours !== undefined ? row[colMap.fulfilledHours] : 0;

            const amount = parseNumeric(amountRaw);
            const contractHours = parseNumeric(contractHoursRaw);
            const fulfilledHours = parseNumeric(fulfilledHoursRaw);
            
            const month = normalizeMonthName(monthRaw);
            const billingDate = parseMonthToDate(monthRaw);

            // Skip "TOTAL" rows or rows without a name
            if (!name || name.toUpperCase() === 'TOTAL' || name.toUpperCase().includes('TOTAL ')) {
              skippedCount++;
              continue;
            }

            // We now allow amount 0 as long as there is a name, unless it's a summary row
            // However, if both name and amount are missing, skip
            if (!name && amount === 0) {
              skippedCount++;
              continue;
            }

            // Create a unique invoice number
            const random = Math.floor(Math.random() * 10000);
            const invoiceNumber = `PAY-${String(month).replace(/\s+/g, '')}-${String(name).substring(0, 3).toUpperCase()}-${random}`;

            const newPayment = new Invoice({
              invoiceNumber,
              amount,
              currency: 'USD',
              provider: name,
              billingDate,
              category: role || 'Employee Payment',
              status: 'approved',
              uploadedBy: req.user.userId,
              organizationId: organizationId,
              notes: {
                type: 'employee_contractor',
                month,
                role: role || '',
                contractHours,
                fulfilledHours,
                importedAt: new Date()
              }
            });

            await newPayment.save();
            importedCount++;
            importedPayments.push(newPayment);
          } catch (err) {
            console.error(`Error importing row ${i + 1}:`, err);
            errorCount++;
            errorDetails.push({ row: i + 1, error: err.message });
          }
        }

    res.json({
      success: true,
      message: `Successfully processed ${allRows.length - headerRowIndex - 1} rows.`,
      imported: importedCount,
      skipped: skippedCount,
      errors: errorCount,
      errorDetails,
      payments: importedPayments
    });
  } catch (error) {
    console.error('Error importing Excel:', error);
    res.status(500).json({ message: 'Failed to import Excel' });
  }
});

// DELETE /api/payments/clear-all - Clear all employee payments
router.delete('/clear-all', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const result = await Invoice.deleteMany({
      'notes.type': 'employee_contractor'
    });

    res.json({ 
      success: true, 
      message: `Successfully cleared ${result.deletedCount} payment records` 
    });
  } catch (error) {
    console.error('Clear all payments error:', error);
    res.status(500).json({ message: 'Failed to clear payments' });
  }
});

module.exports = router;
