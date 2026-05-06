const XLSX = require('xlsx');
const path = require('path');

const inputPath = String.raw`c:\Users\Simran Thakarkar\Downloads\test cases (1).xlsx`;
const outputPath = path.join(process.cwd(), 'Test_Execution_Report_With_Observation.xlsx');

const workbook = XLSX.readFile(inputPath);
const sourceSheetName = workbook.SheetNames[0];
const sourceSheet = workbook.Sheets[sourceSheetName];
const rows = XLSX.utils.sheet_to_json(sourceSheet, { header: 1, defval: '' });

if (!rows.length) {
  throw new Error('The source workbook is empty.');
}

const header = rows[0].map((value) => String(value).trim());
const observationIndex = header.findIndex((value) => value.toLowerCase() === 'observation');

if (observationIndex === -1) {
  header.push('Observation');
  rows[0] = header;
  for (let i = 1; i < rows.length; i += 1) {
    rows[i].push('');
  }
}

const dataRowCount = rows.slice(1).filter((row) => row.some((cell) => String(cell).trim() !== '')).length;
const passCount = rows.slice(1).filter((row) => String(row[8]).trim().toLowerCase() === 'pass').length;
const failCount = rows.slice(1).filter((row) => String(row[8]).trim().toLowerCase() === 'fail').length;
const blankObservationCount = rows.slice(1).filter((row) => String(row[9] || '').trim() === '').length;

const reportWorkbook = XLSX.utils.book_new();

const executionSheet = XLSX.utils.aoa_to_sheet(rows);
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
executionSheet['!autofilter'] = { ref: `A1:J${rows.length}` };
executionSheet['!freeze'] = { xSplit: 0, ySplit: 1 };

const summaryRows = [
  ['Test Execution Report Summary', ''],
  ['Source File', inputPath],
  ['Generated File', outputPath],
  ['Total Test Rows', dataRowCount],
  ['Pass', passCount],
  ['Fail', failCount],
  ['Observation Pending', blankObservationCount],
  ['', ''],
  ['Note', 'Use the Execution Report sheet to enter your observations for each test case.']
];
const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
summarySheet['!cols'] = [{ wch: 24 }, { wch: 100 }];

XLSX.utils.book_append_sheet(reportWorkbook, summarySheet, 'Summary');
XLSX.utils.book_append_sheet(reportWorkbook, executionSheet, 'Execution Report');

XLSX.writeFile(reportWorkbook, outputPath);

console.log(`Created: ${outputPath}`);
