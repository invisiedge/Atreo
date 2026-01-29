const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '../../../Tools_Credentails_Updated (1).xlsx');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet, { defval: null, raw: false });

console.log('Row count:', data.length);
if (data.length > 0) {
  console.log('Headers (column names):', Object.keys(data[0]));
  console.log('First row sample:', JSON.stringify(data[0], null, 2));
}
