const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const OpenAI = require('openai');
const { authenticateToken } = require('../middleware/auth');
const Tool = require('../models/Tool');
const User = require('../models/User');
const Employee = require('../models/Employee');
const Submission = require('../models/Submission');
const Admin = require('../models/Admin');
const Invoice = require('../models/Invoice');
const Asset = require('../models/Asset');
const Domain = require('../models/Domain');
const Payment = require('../models/Payment');
const Organization = require('../models/Organization');
const Email = require('../models/Email');
const Customer = mongoose.models.Customer || null;

// Initialize OpenAI client
let openaiClient = null;
const openaiApiKey = process.env.OPENAI_API_KEY;

if (openaiApiKey && openaiApiKey.trim() !== '') {
  try {
    openaiClient = new OpenAI({
      apiKey: openaiApiKey.trim()
    });
    console.log('✅ OpenAI client initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize OpenAI client:', error.message);
  }
}

router.post('/ask', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'AI features are only available for admins' });
    }

    if (!openaiClient) {
      return res.status(503).json({ 
        message: 'AI Assistant is not available. Please configure OPENAI_API_KEY in your environment.' 
      });
    }

    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ message: 'Question is required' });
    }

    // Detect question type to adapt response format (do this early to use in data fetching)
    const questionLower = question.toLowerCase();
    const isSimpleQuery = questionLower.includes('details') || 
                         questionLower.includes('show me') || 
                         questionLower.includes('list') || 
                         questionLower.includes('give me') ||
                         questionLower.includes('username') ||
                         questionLower.includes('password') ||
                         questionLower.includes('credentials');
    
    const isAnalysisQuery = questionLower.includes('analyze') || 
                           questionLower.includes('analysis') || 
                           questionLower.includes('insights') || 
                           questionLower.includes('trends') ||
                           questionLower.includes('compare') ||
                           questionLower.includes('recommendations') ||
                           questionLower.includes('summary');

    // First, find all tool names to check for mentions in the question
    const allToolNames = await Tool.find({ status: 'active' }).select('name').lean();
    
    // Identify which tools are mentioned in the question (case-insensitive)
    const mentionedToolIds = allToolNames
      .filter(t => new RegExp(`\\b${t.name}\\b`, 'i').test(question))
      .map(t => t._id);


    const [
      specificTools, 
      allTools, 
      users, 
      employees, 
      submissions, 
      allInvoices,
      invoiceAnalysis,
      assets,
      domains,
      payments,
      organizations,
      emails,
      customers,
      toolAnalysis,
      invoiceTrends,
      topSpendingTools
    ] = await Promise.all([
      // Fetch full details for mentioned tools (include username/password for simple queries)
      mentionedToolIds.length > 0 
        ? Tool.find({ _id: { $in: mentionedToolIds } }).select(isSimpleQuery ? 'name category description price billingPeriod status isPaid username password apiKey notes tags has2FA twoFactorMethod hasAutopay paymentMethod cardLast4Digits organizationId createdAt updatedAt' : '-password -apiKey').lean()
        : Promise.resolve([]),
      // Fetch ALL tools for comprehensive analysis (limit to active tools for performance)
      Tool.find({ status: 'active' }).select('name category isPaid price billingPeriod status organizationId createdAt updatedAt').lean(),
      User.find().select('name email role isActive createdAt').limit(200).lean(),
      Employee.find().select('name email position department status salary').limit(200).lean(),
      Submission.find().select('employeeName totalAmount status submittedAt approvedAt').sort({ submittedAt: -1 }).limit(20).lean(),
      // Fetch recent invoices for comprehensive analysis (limit to last 50 for performance)
      Invoice.find({
        $or: [
          { 'notes.type': { $ne: 'employee_contractor' } },
          { 'notes.type': { $exists: false } },
          { notes: null }
        ]
      }).select('invoiceNumber amount currency provider billingDate dueDate status category organizationId createdAt').sort({ createdAt: -1 }).limit(200).lean(),
      // Invoice analysis aggregations
      Promise.all([
        Invoice.aggregate([
          {
            $match: {
              $or: [
                { 'notes.type': { $ne: 'employee_contractor' } },
                { 'notes.type': { $exists: false } },
                { notes: null }
              ]
            }
          },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
              totalAmount: { $sum: '$amount' },
              avgAmount: { $avg: '$amount' }
            }
          }
        ]),
        Invoice.aggregate([
          {
            $match: {
              $or: [
                { 'notes.type': { $ne: 'employee_contractor' } },
                { 'notes.type': { $exists: false } },
                { notes: null }
              ]
            }
          },
          {
            $group: {
              _id: '$provider',
              count: { $sum: 1 },
              totalAmount: { $sum: '$amount' }
            }
          },
          { $sort: { totalAmount: -1 } },
          { $limit: 5 }
        ]),
        Invoice.aggregate([
          {
            $match: {
              $or: [
                { 'notes.type': { $ne: 'employee_contractor' } },
                { 'notes.type': { $exists: false } },
                { notes: null }
              ]
            }
          },
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 },
              totalAmount: { $sum: '$amount' }
            }
          },
          { $sort: { totalAmount: -1 } }
        ]),
        Invoice.aggregate([
          {
            $match: {
              $or: [
                { 'notes.type': { $ne: 'employee_contractor' } },
                { 'notes.type': { $exists: false } },
                { notes: null }
              ],
              status: 'approved'
            }
          },
          {
            $group: {
              _id: {
                year: { $year: '$billingDate' },
                month: { $month: '$billingDate' }
              },
              count: { $sum: 1 },
              totalAmount: { $sum: '$amount' }
            }
          },
          { $sort: { '_id.year': -1, '_id.month': -1 } },
          { $limit: 6 }
        ])
      ]),
      Asset.find().select('name type status serialNumber purchaseDate purchasePrice').limit(100).lean(),
      Domain.find().select('domainName provider expiryDate status registrationDate').limit(100).lean(),
      Payment.find().select('amount currency status paymentDate provider').sort({ paymentDate: -1 }).limit(100).lean(),
      Organization.find().select('name domain createdAt').limit(100).lean(),
      Email.find().select('email domain provider status organizationId').limit(200).lean(),
      Customer ? Customer.find().select('name email company status customerType totalRevenue').limit(200).lean() : Promise.resolve([]),
      // Tool analysis aggregations
      Promise.all([
        Tool.aggregate([
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 },
              paidCount: { $sum: { $cond: ['$isPaid', 1, 0] } },
              totalMonthlySpend: {
                $sum: {
                  $cond: [
                    { $and: ['$isPaid', { $eq: ['$billingPeriod', 'yearly'] }] },
                    { $divide: ['$price', 12] },
                    { $cond: ['$isPaid', '$price', 0] }
                  ]
                }
              }
            }
          },
          { $sort: { totalMonthlySpend: -1 } },
          { $limit: 10 }
        ]),
        Tool.aggregate([
          { $match: { isPaid: true, status: 'active' } },
          {
            $project: {
              name: 1,
              category: 1,
              price: 1,
              billingPeriod: 1,
              monthlySpend: {
                $cond: [
                  { $eq: ['$billingPeriod', 'yearly'] },
                  { $divide: ['$price', 12] },
                  '$price'
                ]
              }
            }
          },
          { $sort: { monthlySpend: -1 } },
          { $limit: 10 }
        ]),
        Tool.aggregate([
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ]),
        Tool.aggregate([
          {
            $group: {
              _id: '$billingPeriod',
              count: { $sum: 1 },
              totalSpend: {
                $sum: {
                  $cond: [
                    { $eq: ['$billingPeriod', 'yearly'] },
                    { $divide: ['$price', 12] },
                    '$price'
                  ]
                }
              }
            }
          }
        ])
      ]),
      // Invoice trends by month
      Invoice.aggregate([
        {
          $match: {
            $or: [
              { 'notes.type': { $ne: 'employee_contractor' } },
              { 'notes.type': { $exists: false } },
              { notes: null }
            ]
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$billingDate' },
              month: { $month: '$billingDate' }
            },
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            approvedAmount: {
              $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$amount', 0] }
            }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 }
      ]),
      // Top spending tools
      Tool.aggregate([
        { $match: { isPaid: true, status: 'active' } },
        {
          $project: {
            name: 1,
            category: 1,
            price: 1,
            billingPeriod: 1,
            monthlySpend: {
              $cond: [
                { $eq: ['$billingPeriod', 'yearly'] },
                { $divide: ['$price', 12] },
                '$price'
              ]
            }
          }
        },
        { $sort: { monthlySpend: -1 } },
        { $limit: 10 }
      ])
    ]);

    const [invoiceStatusData, topProviders, invoiceCategories, monthlyInvoiceData] = invoiceAnalysis;
    const [toolCategories, topToolsBySpend, toolStatusData, billingPeriodData] = toolAnalysis;

    // Calculate comprehensive statistics
    const totalTools = allTools.length;
    const activeTools = allTools.filter(t => t.status === 'active').length;
    const paidTools = allTools.filter(t => t.isPaid && t.status === 'active');
    const totalMonthlyToolsSpend = paidTools.reduce((sum, tool) => {
      return sum + (tool.billingPeriod === 'yearly' ? tool.price / 12 : tool.price);
    }, 0);
    
    const totalInvoices = allInvoices.length;
    const totalInvoiceAmount = allInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const approvedInvoices = allInvoices.filter(inv => inv.status === 'approved');
    const approvedAmount = approvedInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const pendingInvoices = allInvoices.filter(inv => inv.status === 'pending');
    const pendingAmount = pendingInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    
    // Helper function to safely format numbers
    const safeToFixed = (value, decimals = 2) => {
      if (value === null || value === undefined || isNaN(value)) return '0.00';
      return Number(value).toFixed(decimals);
    };

    let context = `=== COMPREHENSIVE ATREO DATABASE INTELLIGENCE ===

📊 SYSTEM OVERVIEW:
- Total Users: ${users.length} (Active: ${users.filter(u => u.isActive).length}, Inactive: ${users.filter(u => !u.isActive).length})
- Total Employees: ${employees.length} (Active: ${employees.filter(e => e.status === 'active').length})
- Total Tools: ${totalTools} (Active: ${activeTools}, Inactive: ${totalTools - activeTools})
- Paid Tools: ${paidTools.length} | Free Tools: ${totalTools - paidTools.length}
- Total Invoices: ${totalInvoices} | Total Invoice Amount: $${safeToFixed(totalInvoiceAmount)}
- Approved Invoices: ${approvedInvoices.length} ($${safeToFixed(approvedAmount)})
- Pending Invoices: ${pendingInvoices.length} ($${safeToFixed(pendingAmount)})
- Total Assets: ${assets.length} | Total Domains: ${domains.length}
- Total Organizations: ${organizations.length}
- Total Emails (email list): ${emails.length}
- Total Customers: ${customers.length}
- Monthly Tools Spend (Recurring): $${safeToFixed(totalMonthlyToolsSpend)}
- Total Submissions: ${submissions.length} (Pending: ${submissions.filter(s => s.status === 'pending').length}, Approved: ${submissions.filter(s => s.status === 'approved').length})

💰 FINANCIAL ANALYSIS:

TOOL SPENDING BREAKDOWN:
${toolCategories.map((cat, idx) => `${idx + 1}. ${cat._id || 'Uncategorized'}: ${cat.count} tools, ${cat.paidCount} paid, Monthly Spend: $${safeToFixed(cat.totalMonthlySpend)}`).join('\n')}

TOP SPENDING TOOLS (Monthly):
${topSpendingTools.slice(0, 10).map((tool, idx) => `${idx + 1}. ${tool.name} (${tool.category || 'N/A'}): $${safeToFixed(tool.monthlySpend)}/${tool.billingPeriod || 'month'}`).join('\n')}

TOOL STATUS DISTRIBUTION:
${toolStatusData.map((s, idx) => `${idx + 1}. ${s._id || 'Unknown'}: ${s.count} tools`).join('\n')}

BILLING PERIOD DISTRIBUTION:
${billingPeriodData.map((b, idx) => `${idx + 1}. ${b._id || 'Unknown'}: ${b.count} tools, Monthly Equivalent: $${safeToFixed(b.totalSpend)}`).join('\n')}

INVOICE ANALYSIS:

INVOICE STATUS BREAKDOWN:
${invoiceStatusData.map((status, idx) => `${idx + 1}. ${status._id}: ${status.count} invoices, Total: $${safeToFixed(status.totalAmount)}, Avg: $${safeToFixed(status.avgAmount)}`).join('\n')}

TOP INVOICE PROVIDERS (by Total Amount):
${topProviders.map((p, idx) => `${idx + 1}. ${p._id || 'Unknown'}: ${p.count} invoices, Total: $${safeToFixed(p.totalAmount)}`).join('\n')}

INVOICE CATEGORIES:
${invoiceCategories.map((cat, idx) => `${idx + 1}. ${cat._id || 'Uncategorized'}: ${cat.count} invoices, Total: $${safeToFixed(cat.totalAmount)}`).join('\n')}

MONTHLY INVOICE TRENDS (Last 6 Months):
${monthlyInvoiceData.slice(0, 6).map((m, idx) => `${idx + 1}. ${m._id.year}-${String(m._id.month).padStart(2, '0')}: ${m.count} invoices, Total: $${safeToFixed(m.totalAmount)}`).join('\n')}

INVOICE TRENDS OVER TIME (Last 6 Months):
${invoiceTrends.slice(0, 6).map((t, idx) => `${idx + 1}. ${t._id.year}-${String(t._id.month).padStart(2, '0')}: ${t.count} invoices, $${safeToFixed(t.totalAmount)} total`).join('\n')}

RECENT INVOICES (Last 50):
${allInvoices.slice(0, 50).map((inv, idx) => `${idx + 1}. #${inv.invoiceNumber || 'N/A'} - ${inv.provider || 'N/A'}: ${inv.currency || 'USD'} ${safeToFixed(inv.amount)} (${inv.billingDate ? new Date(inv.billingDate).toLocaleDateString() : 'N/A'}) - ${inv.status || 'N/A'}${inv.category ? ` [${inv.category}]` : ''}`).join('\n')}

🔧 TOOL INVENTORY:

TOP TOOLS (${Math.min(allTools.length, 50)} of ${totalTools} total):
${allTools.slice(0, 50).map((tool, idx) => `${idx + 1}. ${tool.name}${tool.category ? ` [${tool.category}]` : ''}${tool.isPaid ? ` - $${tool.price}/${tool.billingPeriod || 'month'}` : ' - FREE'} - Status: ${tool.status}`).join('\n')}

${specificTools.length > 0 ? `\nSPECIFIC TOOLS MENTIONED IN QUESTION (Full Details):\n${specificTools.map((tool, idx) => {
  const toolInfo = `${idx + 1}. TOOL: ${tool.name}
   Category: ${tool.category || 'N/A'}
   Description: ${tool.description || 'No description'}
   Price: ${tool.isPaid ? `$${tool.price}/${tool.billingPeriod || 'month'}` : 'Free'}
   Status: ${tool.status}`;
  
  // Include credentials for simple queries
  const credentials = isSimpleQuery ? `
   Username: ${tool.username || 'N/A'}
   Password: ${tool.password || 'N/A'}
   API Key: ${tool.apiKey || 'N/A'}` : '';
  
  const additionalInfo = `
   Notes: ${tool.notes || 'No notes'}
   Tags: ${tool.tags?.join(', ') || 'None'}
   2FA: ${tool.has2FA ? 'Yes' : 'No'}${tool.twoFactorMethod ? ` (${tool.twoFactorMethod})` : ''}
   Autopay: ${tool.hasAutopay ? 'Yes' : 'No'}
   Payment Method: ${tool.paymentMethod || 'N/A'}${tool.cardLast4Digits ? ` (Card ending in ${tool.cardLast4Digits})` : ''}
   Created: ${new Date(tool.createdAt).toLocaleDateString()}
   Updated: ${new Date(tool.updatedAt).toLocaleDateString()}`;
  
  return toolInfo + credentials + additionalInfo + '\n';
}).join('\n')}` : ''}

👥 USERS & EMPLOYEES:

USERS (${users.length} total, showing ${Math.min(users.length, 30)}):
${users.slice(0, 30).map((user, idx) => `${idx + 1}. ${user.name} (${user.email}) - ${user.role}, ${user.isActive ? 'Active' : 'Inactive'}`).join('\n')}

EMPLOYEES (${employees.length} total, showing ${Math.min(employees.length, 30)}):
${employees.slice(0, 30).map((emp, idx) => `${idx + 1}. ${emp.name} - ${emp.position || 'N/A'}, ${emp.status}`).join('\n')}

RECENT SUBMISSIONS (Last 20):
${submissions.map((sub, idx) => `${idx + 1}. ${sub.employeeName || 'N/A'}: $${safeToFixed(sub.totalAmount)} - ${sub.status || 'N/A'}`).join('\n')}

📦 ASSETS & DOMAINS:

ASSETS (${assets.length} total, showing ${Math.min(assets.length, 20)}):
${assets.slice(0, 20).map((asset, idx) => `${idx + 1}. ${asset.name} (${asset.type}) - ${asset.status}`).join('\n')}

DOMAINS (${domains.length} total, showing ${Math.min(domains.length, 20)}):
${domains.slice(0, 20).map((dom, idx) => `${idx + 1}. ${dom.domainName} (${dom.provider}) - ${dom.status}`).join('\n')}

💳 PAYMENTS (Recent 30):
${payments.map((p, idx) => `${idx + 1}. ${p.currency || 'USD'} ${safeToFixed(p.amount)} to ${p.provider || 'N/A'} - ${p.status || 'N/A'}`).join('\n')}

🏢 ORGANIZATIONS (${organizations.length} total, showing ${Math.min(organizations.length, 50)}):
${organizations.slice(0, 50).map((org, idx) => `${idx + 1}. ${org.name}${org.domain ? ` (${org.domain})` : ''}`).join('\n')}

📧 EMAILS / EMAIL LIST (${emails.length} total, showing ${Math.min(emails.length, 100)}):
${emails.length > 0 ? emails.slice(0, 100).map((e, idx) => `${idx + 1}. ${e.email} - domain: ${e.domain || 'N/A'}, provider: ${e.provider || 'N/A'}, status: ${e.status || 'N/A'}`).join('\n') : 'No emails in database.'}

👤 CUSTOMERS (${customers.length} total, showing ${Math.min(customers.length, 100)}):
${customers.length > 0 ? customers.slice(0, 100).map((c, idx) => `${idx + 1}. ${c.name} (${c.email})${c.company ? ` - ${c.company}` : ''} - status: ${c.status || 'N/A'}${c.totalRevenue != null ? `, revenue: $${safeToFixed(c.totalRevenue)}` : ''}`).join('\n') : 'No customers in database.'}

=== END OF COMPREHENSIVE DATA ===\n\n`;


    const systemPrompt = `You are a professional AI assistant for Atreo with FULL KNOWLEDGE of the entire database. You have access to ALL data: tools/credentials, users, employees, invoices, payments, organizations, assets, domains, submissions, emails (email list), and customers. Answer ANY question about this data accurately. If the answer is not in the context, say so; otherwise use the provided data to answer completely.

RESPONSE FORMAT (choose based on the question):

1. SHORT ANSWERS (counts, single value, yes/no, one sentence):
   - Answer in plain text. No tables. Example: "You have 24 active tools and 12 paid subscriptions."

2. LISTS OF ITEMS (e.g. "list all tools", "show me invoices", "which users"):
   - Use a markdown table ONLY when listing multiple rows with the same columns (e.g. 5+ tools, 5+ invoices).
   - Format: header row, then separator line (|---|---|), then data rows.
   - For 1–4 items, use bullet points instead of a table.

3. ANALYSIS / INSIGHTS (analyze, trends, recommendations):
   - Start with a short summary in paragraphs.
   - Use section headers (## and ###).
   - Use bullet points and numbered lists for findings and recommendations.
   - Use a table only when comparing many rows (e.g. top 10 tools by spend). Otherwise use bullets.

4. GENERAL:
   - Prefer paragraphs, bullet points (- or *), and headers. Use tables only when the answer is clearly "rows of data" (many items with same columns).
   - Format numbers with commas and $ for currency. Use professional tone.

Do NOT use a table for: single numbers, short lists (under 5 items), summaries, explanations, or when the user asked a simple "how many" or "what is" question. Use tables only for multi-row structured data (e.g. "list all paid tools" with 10+ rows).`;

    // Build user message based on question type
    let userMessage;
    if (isSimpleQuery) {
      userMessage = `DATABASE CONTEXT:\n${context}\n\nQUESTION: ${question}\n\nAnswer concisely. Use a markdown table only if listing many items (e.g. 5+ tools or invoices with same columns). For few items use bullet points. For counts or single values use plain text.`;
    } else if (isAnalysisQuery) {
      userMessage = `DATABASE CONTEXT:\n${context}\n\nQUESTION: ${question}\n\nProvide analysis with: 1) Short summary in paragraphs. 2) Key findings with bullet points or numbered lists. 3) Section headers (##). Use a table only when showing many comparable rows; otherwise use bullets and prose.`;
    } else {
      userMessage = `DATABASE CONTEXT:\n${context}\n\nQUESTION: ${question}\n\nAnswer clearly. Use paragraphs and bullet points by default. Use a markdown table only when the answer is a list of many rows with the same columns (e.g. 5+ items).`;
    }

    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: isSimpleQuery ? 800 : 1500 // Shorter responses for simple queries
    });

    const answer = response.choices[0]?.message?.content;
    if (!answer) {
      return res.status(500).json({ message: 'AI did not generate a response. Please try again.' });
    }
    
    res.json({ answer });
  } catch (error) {
    console.error('AI Assistant error:', error);
    
    // Provide more specific error messages
    if (error.response?.status === 401) {
      return res.status(500).json({ message: 'OpenAI API key is invalid or expired. Please check your OPENAI_API_KEY environment variable.' });
    }
    if (error.response?.status === 429) {
      return res.status(500).json({ message: 'OpenAI API rate limit exceeded. Please try again in a moment.' });
    }
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return res.status(500).json({ message: 'Cannot connect to OpenAI API. Please check your internet connection.' });
    }
    
    res.status(500).json({ 
      message: error.message || 'Failed to get AI response. Please try again or contact support if the issue persists.' 
    });
  }
});

module.exports = router;
