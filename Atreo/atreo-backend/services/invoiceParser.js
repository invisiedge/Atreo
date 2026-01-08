const OpenAI = require('openai');

class InvoiceParser {
  constructor() {
    this.openaiClient = null;
    if (process.env.OPENAI_API_KEY) {
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
      console.log('✅ OpenAI client initialized for invoice parsing');
    } else {
      console.warn('⚠️  OpenAI API key not found. AI-powered parsing will be disabled.');
    }
  }

  async parseInvoiceFile(file) {
    const extractedData = {};

    try {
      let text = '';

      // Validate file buffer
      if (!file.buffer || file.buffer.length === 0) {
        console.error('File buffer is missing or empty. File:', {
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          hasBuffer: !!file.buffer,
          bufferLength: file.buffer ? file.buffer.length : 0
        });
        throw new Error('File buffer is required for parsing. Please ensure the file is uploaded correctly.');
      }

      console.log(`Starting invoice parsing: ${file.originalname}, type: ${file.mimetype}, size: ${file.buffer.length} bytes`);

      // Handle PDF files
      if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
        try {
          console.log(`Parsing PDF file: ${file.originalname}, size: ${file.buffer.length} bytes`);
          
          // Dynamic import for pdfjs-dist (ESM module)
          const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
            
            if (!pdfjsLib || typeof pdfjsLib.getDocument !== 'function') {
              throw new Error('pdfjs-dist module loaded but getDocument is not available');
            }

            const loadingTask = pdfjsLib.getDocument({
              data: new Uint8Array(file.buffer),
              verbosity: 0,
            });
            const pdf = await loadingTask.promise;

            let extractedText = '';
            const pagesToExtract = Math.min(pdf.numPages, 3);
            
            for (let i = 1; i <= pagesToExtract; i++) {
              try {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                
                let pageText = '';
                let lastY = null;
                let lastX = null;

                for (const item of content.items) {
                  if ('str' in item) {
                    const currentY = item.transform?.[5] || 0;
                    const currentX = item.transform?.[4] || 0;

                    if (lastY !== null && Math.abs(currentY - lastY) > 5) {
                      pageText += '\n';
                    } else if (
                      lastX !== null &&
                      Math.abs(currentX - lastX) > 10 &&
                      pageText.length > 0 &&
                      !pageText.endsWith('\n') &&
                      !pageText.endsWith(' ')
                    ) {
                      pageText += ' ';
                    }

                    pageText += item.str;
                    lastY = currentY;
                    lastX = currentX;
                  }
                }

                extractedText += pageText + '\n\n';
              } catch (pageError) {
                console.warn(`Error extracting page ${i}: ${pageError.message}`);
              }
            }

            text = extractedText
              .replace(/[ \t]+/g, ' ')
              .replace(/\n{3,}/g, '\n\n')
              .trim();

          console.log(`Extracted ${text.length} characters from PDF (${pagesToExtract} pages)`);
          
          // If PDF text extraction resulted in very little text, it might be image-based
          // Note: For image-based PDFs, OpenAI Vision would require converting PDF pages to images
          // This requires additional dependencies. For now, we'll proceed with the extracted text.
          if (text.length < 50) {
            console.warn('PDF has very little text. This might be an image-based PDF. Consider converting to image format for better OCR results.');
          }
          
          if (text.length < 20) {
            console.warn('PDF text extraction resulted in very little text. The PDF might be image-based or corrupted.');
          }
        } catch (error) {
          console.error(`Error parsing PDF: ${error.message}`, error.stack);
          // For image-based PDFs, user should convert to image format first
          throw new Error(`Failed to parse PDF: ${error.message}. If this is an image-based PDF, please convert it to an image format (PNG/JPG) and upload again.`);
        }
      } else if (file.mimetype.startsWith('image/')) {
        // Use OpenAI Vision API for OCR on images
        console.log(`Extracting text from image using OpenAI Vision: ${file.originalname}, buffer size: ${file.buffer.length} bytes`);
        try {
          if (this.openaiClient) {
            // Convert buffer to base64
            const base64Image = file.buffer.toString('base64');
            const imageMimeType = file.mimetype || 'image/jpeg';
            
            console.log('Using OpenAI Vision API for OCR...');
            const visionResponse = await this.openaiClient.chat.completions.create({
              model: 'gpt-4o', // Use gpt-4o for better vision capabilities
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: 'Extract all text from this invoice image. Return the text exactly as it appears, preserving the structure and layout. Include all numbers, dates, amounts, invoice numbers, provider names, and any other text visible in the image.'
                    },
                    {
                      type: 'image_url',
                      image_url: {
                        url: `data:${imageMimeType};base64,${base64Image}`
                      }
                    }
                  ]
                }
              ],
              max_tokens: 4000
            });
            
            text = visionResponse.choices[0]?.message?.content || '';
            console.log(`OpenAI Vision extracted ${text.length} characters from image`);
            
            if (text.length < 10) {
              console.warn('OpenAI Vision extracted very little text. The image might be low quality or contain no text.');
            }
          } else {
            throw new Error('OpenAI client not available. Please set OPENAI_API_KEY environment variable.');
          }
        } catch (error) {
          console.error(`OpenAI Vision OCR failed: ${error.message}`, error.stack);
          // Fallback: try to extract text from filename
          text = file.originalname;
        }
      } else {
        console.log(`Processing text file: ${file.originalname}`);
        text = file.buffer.toString('utf-8');
        console.log(`Extracted ${text.length} characters from text file`);
      }

      // Clean and normalize text
      text = text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]+/g, ' ')
        .trim();

      text = `${text}\n\nFilename: ${file.originalname}`;

      console.log(`Processing text (${text.length} chars) for invoice extraction`);
      
      if (text.length < 20) {
        console.warn('Extracted text is very short. Invoice parsing may not work well.');
        console.log('Extracted text preview:', text.substring(0, 200));
      }

      // Try OpenAI parsing first if available
      if (this.openaiClient && text.length > 50) {
        try {
          console.log(`Attempting OpenAI-powered parsing (text length: ${text.length} chars)`);
          const aiExtracted = await this.parseWithOpenAI(text, file.originalname);
          console.log('OpenAI extraction results:', JSON.stringify(aiExtracted, null, 2));

          extractedData.invoiceNumber = aiExtracted.invoiceNumber || this.extractInvoiceNumber(text);

          const aiAmount = aiExtracted.amount;
          if (aiAmount !== null && aiAmount !== undefined) {
            const numAmount = typeof aiAmount === 'number' ? aiAmount : parseFloat(String(aiAmount));
            if (!isNaN(numAmount) && isFinite(numAmount) && numAmount > 0) {
              extractedData.amount = Math.round(numAmount * 100) / 100;
              console.log(`Using OpenAI amount: ${extractedData.amount}`);
            } else {
              const regexAmount = this.extractAmount(text);
              if (regexAmount) {
                extractedData.amount = regexAmount;
              }
            }
          } else {
            const regexAmount = this.extractAmount(text);
            if (regexAmount) {
              extractedData.amount = regexAmount;
            }
          }

          // Extract currency (no conversion)
          let detectedCurrency = aiExtracted.currency ? String(aiExtracted.currency).trim().toUpperCase() : null;
          
          // If currency is not detected, try extracting from text
          if (!detectedCurrency) {
            detectedCurrency = this.extractCurrency(text);
          }
          
          // Use detected currency or default to USD
          extractedData.currency = detectedCurrency || 'USD';
          extractedData.provider = aiExtracted.provider || this.extractProvider(text, file.originalname);
          extractedData.billingDate = aiExtracted.billingDate || this.extractDate(text, 'billing');
          extractedData.dueDate = aiExtracted.dueDate || this.extractDate(text, 'due');
          extractedData.category = aiExtracted.category || this.extractCategory(text, extractedData.provider);
        } catch (error) {
          console.warn(`OpenAI parsing failed, using regex fallback: ${error.message}`);
          // Fallback to regex extraction
          extractedData.invoiceNumber = this.extractInvoiceNumber(text);
          const regexAmount = this.extractAmount(text);
          if (regexAmount !== null && regexAmount !== undefined) {
            const numAmount = typeof regexAmount === 'number' ? regexAmount : parseFloat(String(regexAmount));
            if (!isNaN(numAmount) && isFinite(numAmount) && numAmount > 0) {
              extractedData.amount = Math.round(numAmount * 100) / 100;
            }
          }
          // Extract currency (no conversion)
          const detectedCurrency = this.extractCurrency(text);
          extractedData.currency = detectedCurrency || 'USD';
          extractedData.provider = this.extractProvider(text, file.originalname);
          extractedData.billingDate = this.extractDate(text, 'billing');
          extractedData.dueDate = this.extractDate(text, 'due');
          extractedData.category = this.extractCategory(text, extractedData.provider);
        }
      } else {
        // Use regex patterns for extraction
        console.log('Using regex-based extraction (OpenAI not available or text too short)');
        
        extractedData.invoiceNumber = this.extractInvoiceNumber(text);
        
        const regexAmount = this.extractAmount(text);
        if (regexAmount !== null && regexAmount !== undefined) {
          const numAmount = typeof regexAmount === 'number' ? regexAmount : parseFloat(String(regexAmount));
          if (!isNaN(numAmount) && isFinite(numAmount) && numAmount > 0) {
            extractedData.amount = Math.round(numAmount * 100) / 100;
          }
        }
        
        // Extract currency (no conversion)
        const detectedCurrency = this.extractCurrency(text);
        extractedData.currency = detectedCurrency || 'USD';
        extractedData.provider = this.extractProvider(text, file.originalname);
        extractedData.billingDate = this.extractDate(text, 'billing');
        extractedData.dueDate = this.extractDate(text, 'due');
        extractedData.category = this.extractCategory(text, extractedData.provider);
      }

      const extractedFields = Object.keys(extractedData).filter(
        (key) => extractedData[key] !== null && extractedData[key] !== undefined,
      );
      console.log(`Invoice extraction completed. Extracted fields: ${extractedFields.join(', ') || 'none'}`);

      return extractedData;
    } catch (error) {
      console.error(`Error parsing invoice: ${error.message}`, error.stack);
      return extractedData;
    }
  }

  async parseWithOpenAI(text, filename) {
    if (!this.openaiClient) {
      return {};
    }

    try {
      const prompt = `You are an expert invoice parser. Extract the following information from this invoice text and return ONLY a valid JSON object.

REQUIRED FIELDS (use null if not found):
{
  "invoiceNumber": "string or null",
  "amount": number (not string, no quotes),
  "currency": "string (detected currency code: USD, INR, EUR, etc.)",
  "provider": "string or null",
  "billingDate": "YYYY-MM-DD format or null",
  "dueDate": "YYYY-MM-DD format or null",
  "category": "string or null"
}

CRITICAL EXTRACTION RULES:

1. AMOUNT (MOST IMPORTANT):
   - Look for: "Total", "Amount", "Balance", "Due", "Grand Total", "Invoice Amount", "Payable", "Amount Due"
   - Extract the LARGEST amount if multiple found (this is usually the total)
   - Keep the amount AS-IS with currency symbol if present (e.g., "₹1,234.56" → extract 1234.56, but note the currency)
   - Remove currency symbols and commas ONLY for the number value
   - Convert to pure number: "₹1,234.56" → 1234.56, "$5,000.00" → 5000.00
   - Handle formats: "1,234.56", "1234.56", "1 234.56", "$1,234.56", "USD 1,234.56", "₹8,300.00", "Rs. 8,300"
   - Amount MUST be a number (not string) in JSON
   - If multiple amounts found, choose the one labeled as "Total", "Amount Due", or "Grand Total"
   - IMPORTANT: If you see ₹ or Rs. or INR, the amount is in Indian Rupees

2. DATES (CRITICAL):
   - Billing Date: Look for "Invoice Date", "Billing Date", "Date of Invoice", "Issue Date", "Bill Date", "Invoice Issued"
   - Due Date: Look for "Due Date", "Payment Due", "Pay By", "Due By", "Payment Due Date", "Amount Due By"
   - Accept formats: "12/20/2024", "20/12/2024", "2024-12-20", "December 20, 2024", "20-Dec-2024", "12.20.2024"
   - Convert ALL dates to YYYY-MM-DD format
   - For ambiguous dates (12/20/2024), prefer DD/MM/YYYY if day > 12, otherwise try both formats
   - If year is 2 digits (24), assume 2024 if < 50, else 1924
   - Dates must be valid calendar dates

3. INVOICE NUMBER:
   - Look for: "Invoice Number", "Invoice #", "Invoice No", "Bill Number", "Reference", "Invoice ID"
   - Patterns: INV-2024-001, #12345, BILL-001, etc.

4. PROVIDER:
   - Extract company/vendor name from "From:", "Vendor:", "Billed By:", or invoice header
   - Common providers: AWS, Azure, Google Cloud, GitHub, Stripe, etc.

5. CURRENCY (CRITICAL - MUST DETECT ACCURATELY):
   - Detect the ACTUAL currency from the invoice - DO NOT default to USD
   - Look for currency symbols: $ (USD), ₹ (INR), € (EUR), £ (GBP), ¥ (JPY/CNY), etc.
   - Look for currency codes: USD, INR, EUR, GBP, CAD, AUD, JPY, CNY, SGD, HKD, CHF, NZD, SEK, NOK, DKK, PLN, ZAR, BRL, MXN, AED, SAR, THB, MYR, IDR, PHP, KRW, VND, ILS, TRY, RUB, PKR, BDT, LKR, NPR
   - Look for currency labels: "Currency: USD", "Currency Code: INR", etc.
   - Indian Rupee indicators: ₹, Rs., Rs, INR, "Indian Rupee", "Rupees"
   - Return the detected currency code in uppercase (e.g., "USD", "INR", "EUR")
   - If you see ₹, Rs., Rs, or INR anywhere, return "INR"
   - Only default to "USD" if absolutely no currency indicator is found

Invoice Text:
${text.substring(0, 6000)} ${text.length > 6000 ? '... (truncated)' : ''}

Filename: ${filename}

Return ONLY valid JSON. No explanations, no markdown, just the JSON object.`;

      const response = await this.openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert invoice parser. Extract invoice data with high accuracy, especially for amounts and dates. Always return valid JSON only. Amount must be a number (not string). Dates must be in YYYY-MM-DD format.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) {
        return {};
      }

      // Try to parse JSON (might be wrapped in markdown code blocks)
      let jsonStr = content;
      if (content.startsWith('```')) {
        jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      }

      const parsed = JSON.parse(jsonStr);
      
      // Normalize the response
      const result = {};
      if (parsed.invoiceNumber) {
        const cleaned = String(parsed.invoiceNumber).trim().replace(/\s+/g, '-');
        if (cleaned.length >= 3 && cleaned.length <= 50) {
          result.invoiceNumber = cleaned;
        }
      }

      // Ensure amount is a valid number
      if (parsed.amount !== null && parsed.amount !== undefined) {
        let amountValue;
        if (typeof parsed.amount === 'number') {
          amountValue = parsed.amount;
        } else if (typeof parsed.amount === 'string') {
          const cleaned = parsed.amount.replace(/[₹$€£¥,\s]/g, '').trim();
          amountValue = parseFloat(cleaned);
        } else {
          amountValue = parseFloat(String(parsed.amount).replace(/[₹$€£¥,\s]/g, ''));
        }

        if (!isNaN(amountValue) && isFinite(amountValue) && amountValue > 0 && amountValue < 1000000000) {
          result.amount = Math.round(amountValue * 100) / 100;
        }
      }

      // Extract currency (no conversion)
      let detectedCurrency = parsed.currency ? String(parsed.currency).trim().toUpperCase() : null;
      
      // If currency is not detected, try extracting from text
      if (!detectedCurrency) {
        detectedCurrency = this.extractCurrency(text);
      }
      
      result.currency = detectedCurrency || 'USD';
      
      if (parsed.provider) {
        result.provider = String(parsed.provider).trim();
      }

      // Normalize dates
      if (parsed.billingDate) {
        const normalized = this.normalizeDate(String(parsed.billingDate));
        if (normalized) {
          result.billingDate = normalized;
        } else {
          const dateStr = String(parsed.billingDate).trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            result.billingDate = dateStr;
          }
        }
      }

      if (parsed.dueDate) {
        const normalized = this.normalizeDate(String(parsed.dueDate));
        if (normalized) {
          result.dueDate = normalized;
        } else {
          const dateStr = String(parsed.dueDate).trim();
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            result.dueDate = dateStr;
          }
        }
      }

      if (parsed.category) {
        result.category = String(parsed.category).trim();
      }

      return result;
    } catch (error) {
      console.error('OpenAI parsing error:', error.message);
      return {};
    }
  }

  extractInvoiceNumber(text) {
    const patterns = [
      /invoice\s*(?:number|#|no\.?|num\.?|id)\s*:?\s*([A-Z0-9\-_\/]+)/i,
      /(?:invoice|inv)\.?\s*([A-Z0-9\-_\/]+)/i,
      /#\s*([A-Z0-9\-_\/]+)/i,
      /\b(INV[-\s_]?\d{4}[-\s_]?\d{2,})\b/i,
      /\b(\d{4}[-\s_\/]?[A-Z]{2,4}[-\s_\/]?\d{2,})\b/i,
      /invoice\s*id\s*:?\s*([A-Z0-9\-_\/]+)/i,
      /bill\s*(?:number|#|no\.?|id)?\s*:?\s*([A-Z0-9\-_\/]+)/i,
      /\b(INV[-\s_]?\d{3,})\b/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const candidate = match[1].trim();
        if (
          candidate.length >= 3 &&
          candidate.length <= 50 &&
          !/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(candidate) &&
          !/^\$?[\d,]+\.?\d*$/.test(candidate) &&
          !/^\d{4}-\d{2}-\d{2}$/.test(candidate)
        ) {
          return candidate;
        }
      }
    }
    return null;
  }

  extractAmount(text) {
    // Look for currency amounts: $1,234.56, USD 1,234.56, ₹1,234.56, INR 1,234.56, Total: $1,234.56, etc.
    const patterns = [
      // Total/Amount/Balance/Due with currency symbols (highest priority)
      /(?:total|amount|subtotal|balance|due|grand\s*total|invoice\s*amount|payable|charges|bill\s*amount|payment\s*amount|amount\s*due|balance\s*due|final\s*amount|net\s*amount)\s*(?:amount)?\s*:?\s*[₹$€£¥]?\s*([\d,]+\.?\d{1,2}?)/i,
      // Amount with label and colon/equals: "Total: $123.45" or "Amount = 123.45"
      /(?:total|amount|balance|due|payable)\s*[:=]\s*[₹$€£¥]?\s*([\d,]+\.?\d{1,2}?)/i,
      // Currency symbols: $, ₹, €, £, ¥ (with decimal places) - handle spaces
      /[₹$€£¥]\s*([\d,\s]+\.?\d{1,2}?)/,
      // Currency codes: USD, INR, EUR, GBP, CAD, etc. (with decimal places)
      /(?:USD|INR|EUR|GBP|CAD|AUD|JPY|CNY)\s*([\d,\s]+\.?\d{1,2}?)/i,
      // Indian Rupee formats: Rs. 1,234.56, Rs 1,234.56, ₹1,234.56
      /Rs\.?\s*([\d,\s]+\.?\d{1,2}?)/i,
      // Amount with "USD" or currency code after number
      /([\d,\s]+\.?\d{1,2}?)\s*(?:USD|INR|EUR|GBP|CAD|AUD)/i,
      // Decimal amounts with 2 decimal places (common invoice format)
      /([\d]{1,3}(?:[,\s]\d{3})*\.\d{2})\b/,
      // Amounts with commas/spaces and optional decimals: 1,234.56 or 1 234.56
      /([\d]{1,3}(?:[,\s]\d{3})+(?:\.\d{1,2})?)\b/,
      // Any number that looks like an amount (with commas/spaces and decimals)
      /([\d]{1,3}(?:[,\s]\d{3})*(?:\.\d{1,2})?)\b/,
      // Amounts without thousand separators but with decimals: 1234.56
      /([\d]{2,}\.\d{2})\b/,
      // Large numbers that might be amounts: 12345.67
      /([\d]{4,}\.\d{1,2})\b/,
    ];

    let bestMatch = null;
    const seenAmounts = new Set();

    for (const pattern of patterns) {
      try {
        const matches = text.matchAll(new RegExp(pattern.source, pattern.flags + 'g'));
        for (const match of matches) {
          if (match && match[1]) {
            const amountStr = match[1].replace(/[,\s]/g, '').trim();
            const amount = parseFloat(amountStr);

            if (!isNaN(amount) && amount > 0 && amount < 1000000000 && !seenAmounts.has(amount)) {
              seenAmounts.add(amount);

              // Higher confidence for amounts with currency indicators
              let confidence = 5;
              if (pattern.source.includes('total|amount|balance|due|payable|charges')) {
                confidence = 10; // Highest confidence for labeled amounts
              } else if (pattern.source.includes('[₹$€£¥]')) {
                confidence = 9; // High confidence for currency symbols
              } else if (pattern.source.includes('USD|INR|EUR')) {
                confidence = 8; // Good confidence for currency codes
              } else if (pattern.source.includes('\\.\\d{2}')) {
                confidence = 7; // Good confidence for decimal amounts
              }

              // Prefer larger amounts (likely to be totals, not line items)
              if (amount >= 1 && amount <= 100000) {
                confidence += 1;
              } else if (amount > 100000) {
                confidence -= 2; // Penalize very large amounts
              }

              // Prefer amounts with 2 decimal places (more likely to be currency)
              if (amountStr.includes('.') && amountStr.split('.')[1]?.length === 2) {
                confidence += 1;
              }

              if (!bestMatch || confidence > bestMatch.confidence) {
                bestMatch = { amount, confidence };
              }
            }
          }
        }
      } catch (patternError) {
        console.warn(`Error with pattern ${pattern.source}: ${patternError.message}`);
      }
    }

    if (bestMatch) {
      console.log(`Extracted amount: ${bestMatch.amount} with confidence: ${bestMatch.confidence}`);
      return bestMatch.amount;
    }

    console.warn('Could not extract amount from invoice text');
    return null;
  }

  extractCurrency(text) {
    // Currency symbol to code mapping (INR has priority for Rs/Rs./₹)
    const symbolToCurrency = {
      '₹': 'INR', // Indian Rupee symbol (highest priority for INR)
      'Rs.': 'INR', // Indian Rupee (with period)
      'Rs': 'INR', // Indian Rupee (without period) - check context
      '$': 'USD',
      '€': 'EUR',
      '£': 'GBP',
      '¥': 'JPY',
      'C$': 'CAD',
      'A$': 'AUD',
      'S$': 'SGD',
      'HK$': 'HKD',
      'CHF': 'CHF',
      'NZ$': 'NZD',
      'kr': 'SEK', // Swedish Krona
      'zł': 'PLN', // Polish Zloty
      'R': 'ZAR', // South African Rand
      'R$': 'BRL', // Brazilian Real
      'Mex$': 'MXN', // Mexican Peso
      'د.إ': 'AED', // UAE Dirham
      'ر.س': 'SAR', // Saudi Riyal
      '฿': 'THB', // Thai Baht
      'RM': 'MYR', // Malaysian Ringgit
      'Rp': 'IDR', // Indonesian Rupiah
      '₱': 'PHP', // Philippine Peso
      '₩': 'KRW', // South Korean Won
      '₫': 'VND', // Vietnamese Dong
      '₪': 'ILS', // Israeli Shekel
      '₺': 'TRY', // Turkish Lira
      '₽': 'RUB', // Russian Ruble
      '₨': 'PKR', // Pakistani Rupee
      '৳': 'BDT', // Bangladeshi Taka
    };

    // Currency code patterns (ISO 4217)
    const currencyCodes = [
      'USD', 'INR', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'SGD', 'HKD',
      'CHF', 'NZD', 'SEK', 'NOK', 'DKK', 'PLN', 'ZAR', 'BRL', 'MXN', 'AED',
      'SAR', 'THB', 'MYR', 'IDR', 'PHP', 'KRW', 'VND', 'ILS', 'TRY', 'RUB',
      'PKR', 'BDT', 'LKR', 'NPR'
    ];

    // Priority patterns (most specific first) - INR patterns have higher priority
    const patterns = [
      // Indian Rupee formats (highest priority for INR detection): ₹1,234.56, Rs. 1,234.56, Rs 1,234.56, INR 5,000
      /[₹]\s*[\d,]+\.?\d*/,
      /Rs\.?\s*[\d,]+\.?\d*/i,
      /INR\s*[\d,]+\.?\d*/i,
      // Currency code with amount: "USD 1,234.56", "INR 5,000", "EUR 100.00"
      /(?:USD|INR|EUR|GBP|CAD|AUD|JPY|CNY|SGD|HKD|CHF|NZD|SEK|NOK|DKK|PLN|ZAR|BRL|MXN|AED|SAR|THB|MYR|IDR|PHP|KRW|VND|ILS|TRY|RUB|PKR|BDT|LKR|NPR)\s*[\d,]+\.?\d*/i,
      // Amount with currency code: "1,234.56 USD", "5,000 INR"
      /[\d,]+\s*(?:USD|INR|EUR|GBP|CAD|AUD|JPY|CNY|SGD|HKD|CHF|NZD|SEK|NOK|DKK|PLN|ZAR|BRL|MXN|AED|SAR|THB|MYR|IDR|PHP|KRW|VND|ILS|TRY|RUB|PKR|BDT|LKR|NPR)/i,
      // Currency symbol patterns: $, ₹, €, £, ¥, etc.
      /[₹$€£¥]\s*[\d,]+\.?\d*/,
      // Currency label: "Currency: USD", "Currency Code: INR"
      /(?:currency|currency\s*code|currency\s*type)\s*:?\s*(USD|INR|EUR|GBP|CAD|AUD|JPY|CNY|SGD|HKD|CHF|NZD|SEK|NOK|DKK|PLN|ZAR|BRL|MXN|AED|SAR|THB|MYR|IDR|PHP|KRW|VND|ILS|TRY|RUB|PKR|BDT|LKR|NPR)/i,
    ];

    // Try to find INR first (highest priority for Indian invoices)
    const inrPatterns = [
      /\bINR\b/i,
      /[₹]/,
      /Rs\.?\s*[\d,]+/i,
      /Indian\s+Rupee/i,
      /Rupees?/i
    ];
    
    for (const pattern of inrPatterns) {
      if (pattern.test(text)) {
        console.log(`Extracted currency: INR from pattern ${pattern.source}`);
        return 'INR';
      }
    }
    
    // Try to find other currency codes
    for (const code of currencyCodes) {
      if (code === 'INR') continue; // Already checked
      const codePattern = new RegExp(`\\b${code}\\b`, 'i');
      if (codePattern.test(text)) {
        console.log(`Extracted currency: ${code.toUpperCase()} from currency code`);
        return code.toUpperCase();
      }
    }

    // Try patterns to extract currency
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        // Extract currency code from match
        const matchText = match[0];
        
        // Check for currency code in match
        for (const code of currencyCodes) {
          if (new RegExp(`\\b${code}\\b`, 'i').test(matchText)) {
            console.log(`Extracted currency: ${code.toUpperCase()} from pattern`);
            return code.toUpperCase();
          }
        }

        // Check for currency symbol
        for (const [symbol, currency] of Object.entries(symbolToCurrency)) {
          if (matchText.includes(symbol)) {
            console.log(`Extracted currency: ${currency} from symbol ${symbol}`);
            return currency;
          }
        }
      }
    }

    // Default to USD if not found
    console.log('Currency not detected, defaulting to USD');
    return 'USD';
  }

  extractProvider(text, filename) {
    // Common providers
    const commonProviders = [
      'AWS', 'Amazon Web Services', 'Microsoft', 'Azure', 'Google Cloud', 'GCP',
      'GitHub', 'GitLab', 'Stripe', 'PayPal', 'Shopify', 'Salesforce',
      'Adobe', 'Slack', 'Zoom', 'Atlassian', 'Jira', 'Confluence',
      'Notion', 'Figma', 'Canva', 'HubSpot', 'Mailchimp', 'SendGrid',
      'Twilio', 'Auth0', 'Okta', 'Cloudflare', 'Vercel', 'Netlify',
      'Heroku', 'DigitalOcean', 'Linode', 'Vultr', 'Fastly', 'CloudFront'
    ];

    // Check for common providers in text
    for (const provider of commonProviders) {
      const regex = new RegExp(`\\b${provider.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(text)) {
        return provider;
      }
    }

    // Try to extract from filename
    const filenameMatch = filename.match(/^([A-Za-z0-9\s]+?)[\s_-]/);
    if (filenameMatch && filenameMatch[1]) {
      return filenameMatch[1].trim();
    }

    // Look for company/vendor patterns
    const vendorPatterns = [
      /(?:from|vendor|company|provider|billed\s*by)\s*:?\s*([A-Z][A-Za-z0-9\s&.,-]+)/i,
      /^([A-Z][A-Za-z0-9\s&.,-]+?)\s+(?:invoice|bill|statement)/i,
    ];

    for (const pattern of vendorPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const provider = match[1].trim();
        if (provider.length > 2 && provider.length < 100) {
          return provider;
        }
      }
    }

    return null;
  }

  extractDate(text, type) {
    // Look for date patterns: MM/DD/YYYY, YYYY-MM-DD, DD-MM-YYYY, etc.
    const datePatterns = [
      // ISO format: YYYY-MM-DD
      /\b(\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/,
      // US format: MM/DD/YYYY or M/D/YYYY
      /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/,
      // European format: DD/MM/YYYY or D/M/YYYY
      /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/,
      // Dash format: DD-MM-YYYY or MM-DD-YYYY or D-M-YYYY
      /\b(\d{1,2}-\d{1,2}-\d{4})\b/,
      // Dot format: DD.MM.YYYY or MM.DD.YYYY
      /\b(\d{1,2}\.\d{1,2}\.\d{4})\b/,
      // Month name: January 15, 2024 or Jan 15, 2024 or 15 January 2024
      /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}\b/i,
      /\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})\b/i,
      // Month name with dashes: 15-Jan-2024 or Jan-15-2024
      /\b(\d{1,2}[-/](?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-/]\d{4})\b/i,
      /\b((?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-/]\d{1,2}[-/]\d{4})\b/i,
      // Short year format: DD/MM/YY or MM/DD/YY
      /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2})\b/,
    ];

    // Look for specific date labels (more comprehensive)
    const labelPatterns = {
      billing: [
        // Date with label and various separators
        /(?:invoice\s*date|billing\s*date|date\s*of\s*invoice|issue\s*date|invoice\s*issued|date\s*issued|bill\s*date|invoice\s*no\.?\s*date|invoice\s*#\s*date)\s*[:=\s]+\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        /(?:invoice\s*date|billing\s*date|date\s*of\s*invoice|issue\s*date|invoice\s*issued|date\s*issued|bill\s*date)\s*[:=\s]+\s*(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/i,
        // Date with label and month names
        /(?:invoice\s*date|billing\s*date|date\s*of\s*invoice|issue\s*date)\s*[:=\s]+\s*((?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4})/i,
        /(?:invoice\s*date|billing\s*date|date\s*of\s*invoice|issue\s*date)\s*[:=\s]+\s*(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/i,
        // Handle label on one line, date on next (with newline)
        /(?:invoice\s*date|billing\s*date|date\s*of\s*invoice|issue\s*date)\s*[:=\s]*\s*\n\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      ],
      due: [
        // Date with label and various separators
        /(?:due\s*date|payment\s*due|pay\s*by|due\s*by|payment\s*due\s*date|amount\s*due\s*by|payable\s*by|pay\s*on)\s*[:=\s]+\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
        /(?:due\s*date|payment\s*due|pay\s*by|due\s*by|payment\s*due\s*date|amount\s*due\s*by)\s*[:=\s]+\s*(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/i,
        // Date with label and month names
        /(?:due\s*date|payment\s*due|pay\s*by|due\s*by)\s*[:=\s]+\s*((?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4})/i,
        /(?:due\s*date|payment\s*due|pay\s*by|due\s*by)\s*[:=\s]+\s*(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})/i,
        // Handle label on one line, date on next (with newline)
        /(?:due\s*date|payment\s*due|pay\s*by|due\s*by)\s*[:=\s]*\s*\n\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i,
      ],
    };

    // First try label-specific patterns (highest priority)
    for (const pattern of labelPatterns[type]) {
      try {
        const match = text.match(pattern);
        if (match && match[1]) {
          const dateStr = this.normalizeDate(match[1]);
          if (dateStr) {
            console.log(`Extracted ${type} date: ${dateStr} using label pattern`);
            return dateStr;
          }
        }
      } catch (error) {
        console.warn(`Error with date pattern ${pattern.source}: ${error.message}`);
      }
    }

    // Then try general date patterns (match all occurrences and pick the best one)
    const dateCandidates = [];

    for (const pattern of datePatterns) {
      try {
        const matches = text.matchAll(new RegExp(pattern.source, pattern.flags + 'g'));
        for (const match of matches) {
          if (match && match[1]) {
            const dateStr = this.normalizeDate(match[1]);
            if (dateStr) {
              // Higher confidence for ISO dates and dates with month names
              let confidence = 5;
              if (pattern.source.includes('\\d{4}-\\d{2}-\\d{2}')) {
                confidence = 8; // ISO format is reliable
              } else if (pattern.source.includes('January|February')) {
                confidence = 7; // Month names are reliable
              }

              dateCandidates.push({ date: dateStr, confidence });
            }
          }
        }
      } catch (error) {
        console.warn(`Error with date pattern ${pattern.source}: ${error.message}`);
      }
    }

    // Return the date with highest confidence, or first valid date if all equal
    if (dateCandidates.length > 0) {
      dateCandidates.sort((a, b) => b.confidence - a.confidence);
      const bestDate = dateCandidates[0].date;
      console.log(`Extracted ${type} date: ${bestDate} using general pattern (confidence: ${dateCandidates[0].confidence})`);
      return bestDate;
    }

    console.log(`Could not extract ${type} date from text`);
    return null;
  }

  normalizeDate(dateStr) {
    if (!dateStr) return null;

    try {
      let date;
      const cleaned = dateStr.trim();

      // Handle month name formats: "January 15, 2024" or "Jan 15, 2024"
      const monthNamePattern = /(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})/i;
      const monthMatch = cleaned.match(monthNamePattern);
      if (monthMatch) {
        const monthNames = {
          january: 0, jan: 0,
          february: 1, feb: 1,
          march: 2, mar: 2,
          april: 3, apr: 3,
          may: 4,
          june: 5, jun: 5,
          july: 6, jul: 6,
          august: 7, aug: 7,
          september: 8, sep: 8,
          october: 9, oct: 9,
          november: 10, nov: 10,
          december: 11, dec: 11,
        };
        const month = monthNames[monthMatch[1].toLowerCase()];
        const day = parseInt(monthMatch[2], 10);
        const year = parseInt(monthMatch[3], 10);
        if (month !== undefined && !isNaN(day) && !isNaN(year)) {
          date = new Date(year, month, day);
        } else {
          date = new Date(cleaned);
        }
      } else if (cleaned.includes('-')) {
        // ISO format or DD-MM-YYYY or MM-DD-YYYY
        const parts = cleaned.split('-').map(p => p.trim());
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            // YYYY-MM-DD
            date = new Date(cleaned);
          } else {
            // Handle 2-digit years
            let year = parseInt(parts[2], 10);
            if (year < 100) {
              year = year < 50 ? 2000 + year : 1900 + year;
            }
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            // If day > 12, it's DD-MM-YYYY, otherwise try both
            if (day > 12 && day <= 31) {
              // DD-MM-YYYY
              date = new Date(`${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
            } else {
              // Try MM-DD-YYYY first, then DD-MM-YYYY
              date = new Date(`${year}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`);
              if (isNaN(date.getTime())) {
                date = new Date(`${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
              }
            }
          }
        } else {
          date = new Date(cleaned);
        }
      } else if (cleaned.includes('/')) {
        // MM/DD/YYYY or DD/MM/YYYY
        const parts = cleaned.split('/').map(p => p.trim());
        if (parts.length === 3) {
          let year = parseInt(parts[2], 10);
          if (year < 100) {
            year = year < 50 ? 2000 + year : 1900 + year;
          }
          if (parts[0].length <= 2 && parts[1].length <= 2) {
            // Try DD/MM/YYYY first (common internationally), then MM/DD/YYYY
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            if (day > 12 && day <= 31) {
              // Definitely DD/MM/YYYY
              date = new Date(`${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
            } else if (month > 12 && month <= 31) {
              // Definitely MM/DD/YYYY (swapped)
              date = new Date(`${year}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`);
            } else {
              // Ambiguous - try DD/MM/YYYY first (more common internationally)
              date = new Date(`${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
              if (isNaN(date.getTime()) || date.getDate() !== day) {
                date = new Date(`${year}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`);
              }
            }
          } else {
            date = new Date(cleaned);
          }
        } else {
          date = new Date(cleaned);
        }
      } else if (cleaned.includes('.')) {
        // DD.MM.YYYY or MM.DD.YYYY (dot format)
        const parts = cleaned.split('.').map(p => p.trim());
        if (parts.length === 3) {
          let year = parseInt(parts[2], 10);
          if (year < 100) {
            year = year < 50 ? 2000 + year : 1900 + year;
          }
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10);
          if (day > 12 && day <= 31) {
            // DD.MM.YYYY
            date = new Date(`${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
          } else {
            // Try MM.DD.YYYY first, then DD.MM.YYYY
            date = new Date(`${year}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`);
            if (isNaN(date.getTime())) {
              date = new Date(`${year}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`);
            }
          }
        } else {
          date = new Date(cleaned);
        }
      } else {
        date = new Date(cleaned);
      }

      if (isNaN(date.getTime())) {
        console.warn(`Invalid date: ${dateStr}`);
        return null;
      }

      // Validate date is reasonable (not too far in past/future)
      const now = new Date();
      const year = date.getFullYear();
      if (year < 2000 || year > 2100) {
        console.warn(`Date out of reasonable range: ${dateStr} (year: ${year})`);
        return null;
      }

      // Return in YYYY-MM-DD format
      const normalized = date.toISOString().split('T')[0];
      console.log(`Normalized date: ${dateStr} -> ${normalized}`);
      return normalized;
    } catch (error) {
      console.error(`Error normalizing date ${dateStr}: ${error.message}`);
      return null;
    }
  }

  extractCategory(text, provider) {
    // Map providers to categories
    const categoryMap = {
      'AWS': 'Cloud Services',
      'Azure': 'Cloud Services',
      'Google Cloud': 'Cloud Services',
      'GCP': 'Cloud Services',
      'GitHub': 'Development Tools',
      'GitLab': 'Development Tools',
      'Stripe': 'Payment Processing',
      'PayPal': 'Payment Processing',
      'Adobe': 'Software Licenses',
      'Microsoft': 'Software Licenses',
      'Slack': 'Communication',
      'Zoom': 'Communication',
    };

    if (provider) {
      for (const [key, category] of Object.entries(categoryMap)) {
        if (provider.toLowerCase().includes(key.toLowerCase())) {
          return category;
        }
      }
    }

    // Look for category keywords
    const categoryKeywords = {
      'Cloud Services': /cloud|aws|azure|gcp|infrastructure/i,
      'Software Licenses': /license|software|subscription/i,
      'Development Tools': /development|code|git|ci\/cd/i,
      'Communication': /communication|chat|messaging|video/i,
      'Marketing': /marketing|advertising|campaign/i,
      'Analytics': /analytics|tracking|metrics/i,
    };

    for (const [category, pattern] of Object.entries(categoryKeywords)) {
      if (pattern.test(text)) {
        return category;
      }
    }

    return null;
  }

}

module.exports = new InvoiceParser();

