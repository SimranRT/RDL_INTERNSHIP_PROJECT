import * as XLSX from 'xlsx';
import fs from 'fs';

const files = fs.readdirSync('./uploads');
const excelFile = files.find(f => f.endsWith('.xlsx'));

if (excelFile) {
  const workbook = XLSX.readFile(`./uploads/${excelFile}`);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet);
  
  console.log('--- DATASET INFO ---');
  console.log('File Name:', excelFile);
  console.log('Total Rows:', data.length);
  if (data.length > 0) {
    console.log('Columns Found:', Object.keys(data[0]).join(', '));
    console.log('First Row Sample:', JSON.stringify(data[0], null, 2));
  }
} else {
  console.log('No Excel file found in uploads.');
}
