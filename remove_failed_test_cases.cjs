const XLSX = require('xlsx');
const path = require('path');

const inputPath = path.join(process.cwd(), 'Test_Execution_Report_With_Observation.xlsx');
const outputPath = path.join(process.cwd(), 'Test_Execution_Report_Pass_Only.xlsx');

const workbook = XLSX.readFile(inputPath);
const rows = XLSX.utils.sheet_to_json(workbook.Sheets['Execution Report'], { header: 1, defval: '' });

if (!rows.length) {
  throw new Error('Execution Report sheet is empty.');
}

const header = rows[0];
const filteredRows = [
  header,
  ...rows.slice(1).filter((row) => String(row[8] || '').trim().toLowerCase() !== 'fail')
];

const passCount = filteredRows.slice(1).filter((row) => String(row[8] || '').trim().toLowerCase() === 'pass').length;
const removedCount = rows.length - filteredRows.length;

const summaryRows = [
  ['Filtered Test Report Summary', ''],
  ['Source File', inputPath],
  ['Generated File', outputPath],
  ['Rows Kept', filteredRows.length - 1],
  ['Rows Removed', removedCount],
  ['Pass Rows Remaining', passCount],
  ['', ''],
  ['Note', 'All rows marked Fail/fail were removed from the Execution Report sheet.']
];

const resultWorkbook = XLSX.utils.book_new();
const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
summarySheet['!cols'] = [{ wch: 24 }, { wch: 100 }];

const executionSheet = XLSX.utils.aoa_to_sheet(filteredRows);
executionSheet['!cols'] = [
  { wch: 8 },
  { wch: 18 },
  { wch: 20 },
  { wch: 45 },
  { wch: 18 },
  { wch: 45 },
  { wch: 45 },
  { wch: 35 },
  { wch: 16 },
  { wch: 30 }
];
executionSheet['!autofilter'] = { ref: `A1:J${filteredRows.length}` };
executionSheet['!freeze'] = { xSplit: 0, ySplit: 1 };

XLSX.utils.book_append_sheet(resultWorkbook, summarySheet, 'Summary');
XLSX.utils.book_append_sheet(resultWorkbook, executionSheet, 'Execution Report');

XLSX.writeFile(resultWorkbook, outputPath);

console.log(`Created: ${outputPath}`);
