const XLSX = require('xlsx');
const path = require('path');

const outputPath = path.join(process.cwd(), 'Project_Test_Cases_Template.xlsx');

const headers = [
  'S.NO',
  'Main PRD',
  'Sub PRD',
  'Requirement description',
  'Test case seq',
  'Test inputs',
  'Expected result',
  'Actual result',
  'Status(Pass/fail)',
  'Observation'
];

const rows = [
  headers,
  [1, 'Login', 'Authentication', 'Verify admin login with valid credentials', 1, 'Username: admin, Password: password123', 'Admin user logs in successfully and lands on dashboard', '', '', ''],
  ['', '', '', 'Verify login with invalid credentials', 2, 'Username: admin, Password: wrongpass', 'System shows invalid credentials message', '', '', ''],
  ['', '', '', 'Verify login validation for blank fields', 3, 'Leave username and password blank', 'Browser/UI prevents submit or shows validation error', '', '', ''],
  [2, 'Registration', 'User Account', 'Verify new employee registration', 1, 'Enter valid name, username, and password', 'Registration succeeds and user can use new credentials to log in', '', '', ''],
  ['', '', '', 'Verify duplicate username registration is blocked', 2, 'Register with an existing username', 'System shows username already exists message', '', '', ''],
  [3, 'Password', 'First Login', 'Verify forced password change for imported employee', 1, 'Login using imported employee with default password123', 'User is redirected to change password screen before entering app', '', '', ''],
  ['', '', '', 'Verify password confirmation mismatch handling', 2, 'Enter different new password and confirm password values', 'System shows passwords do not match message', '', '', ''],
  [4, 'Dashboard', 'Overview', 'Verify dashboard loads for admin user', 1, 'Login as admin and open dashboard', 'Dashboard cards, employee status, holidays, and leaves sections are visible', '', '', ''],
  ['', '', 'Employee View', 'Verify employee can access only own dashboard context', 2, 'Login as employee user', 'Employee dashboard opens without admin-only management access', '', '', ''],
  ['', '', 'Realtime Status', 'Verify dashboard shows latest attendance date data', 3, 'Upload attendance dataset and open dashboard', 'Present, late, absent, and realtime status reflect latest uploaded attendance date', '', '', ''],
  [5, 'Attendance', 'Monthly Attendance', 'Verify attendance page loads selected month data', 1, 'Open Attendance page for a user and select month/year', 'Attendance records for that month are displayed', '', '', ''],
  ['', '', 'Claim Request', 'Verify employee can submit time claim', 2, 'Select date and submit corrected login/logout with reason', 'Time claim is created successfully', '', '', ''],
  ['', '', 'Access Control', 'Verify employee cannot see other employee attendance', 3, 'Login as employee and try to open another employee record', 'System shows restricted access message', '', '', ''],
  [6, 'Report', 'Working Hours', 'Verify report page shows daily bars for uploaded attendance', 1, 'Upload attendance dataset and open Report for imported employee', 'Daily performance chart and monthly summary are displayed for the selected month', '', '', ''],
  ['', '', 'Latest Data', 'Verify Jump to Latest Data button works', 2, 'Open report in an older month and click Jump to Latest Data', 'Report switches to the latest uploaded month', '', '', ''],
  ['', '', 'Access Control', 'Verify employee cannot see report for another employee', 3, 'Login as employee and try to open another employee report', 'System shows restricted access message', '', '', ''],
  [7, 'Leaves', 'Apply Leave', 'Verify employee can apply for leave', 1, 'Create leave request with start date, end date, and reason', 'Leave request is submitted and appears in leave list', '', '', ''],
  ['', '', 'Approval', 'Verify admin can approve or reject leave request', 2, 'Login as admin and update leave status', 'Leave status changes and notification is generated for user', '', '', ''],
  ['', '', 'Delete Pending', 'Verify only pending leave can be deleted', 3, 'Delete a pending leave request', 'Pending leave is deleted successfully', '', '', ''],
  [8, 'Holidays', 'Holiday Management', 'Verify admin can add a holiday', 1, 'Enter holiday name, date, and type', 'Holiday is saved and visible in holiday list', '', '', ''],
  ['', '', '', 'Verify admin can edit a holiday', 2, 'Update an existing holiday', 'Holiday details are updated successfully', '', '', ''],
  ['', '', '', 'Verify admin can delete a holiday', 3, 'Delete an existing holiday', 'Holiday is removed from the list', '', '', ''],
  [9, 'Time Claims', 'Admin Review', 'Verify admin can view all submitted time claims', 1, 'Open Time Claims page as admin', 'All submitted claims are listed with requester details', '', '', ''],
  ['', '', 'Approval Flow', 'Verify approved time claim updates attendance', 2, 'Approve a pending claim', 'Attendance entry for that date is inserted or updated to Present with corrected times', '', '', ''],
  [10, 'Masters', 'Department', 'Verify admin can add a department', 1, 'Create department with name and description', 'Department is added successfully', '', '', ''],
  ['', '', 'Section', 'Verify admin can add a section linked to department', 2, 'Create section and select department', 'Section is added and linked to department', '', '', ''],
  ['', '', 'Dataset Upload', 'Verify attendance dataset upload imports users and attendance', 3, 'Upload valid attendance Excel report', 'Users and attendance records are imported successfully', '', '', ''],
  [11, 'Team', 'Employee List', 'Verify team page shows employee cards/data', 1, 'Login as admin and open Team page', 'Employee list displays attendance rate and today/latest status information', '', '', ''],
  [12, 'Navigation', 'Sidebar and TopBar', 'Verify main navigation routes work correctly', 1, 'Click Dashboard, Attendance, Report, Holidays, Leaves, Time Claims, Masters, Team', 'Each menu opens the correct page without errors', '', '', ''],
  [13, 'Session', 'Logout', 'Verify logout returns user to login page', 1, 'Click logout from top bar', 'User session ends and login page is shown', '', '', '']
];

const workbook = XLSX.utils.book_new();

const sheet = XLSX.utils.aoa_to_sheet(rows);
sheet['!cols'] = [
  { wch: 8 },
  { wch: 18 },
  { wch: 20 },
  { wch: 42 },
  { wch: 14 },
  { wch: 42 },
  { wch: 46 },
  { wch: 34 },
  { wch: 18 },
  { wch: 28 }
];
sheet['!autofilter'] = { ref: `A1:J${rows.length}` };
sheet['!freeze'] = { xSplit: 0, ySplit: 1 };

const summary = XLSX.utils.aoa_to_sheet([
  ['Project Test Cases Summary', ''],
  ['Generated File', outputPath],
  ['Total Test Cases', rows.length - 1],
  ['Template Use', 'Fill Actual result, Status(Pass/fail), and Observation during testing'],
  ['Admin Login', 'username: admin | password: password123'],
  ['Employee Login Option 1', 'Register a new employee from the login page'],
  ['Employee Login Option 2', 'Upload dataset, then use employee username with default password123 and change password on first login']
]);
summary['!cols'] = [{ wch: 24 }, { wch: 95 }];

XLSX.utils.book_append_sheet(workbook, summary, 'Summary');
XLSX.utils.book_append_sheet(workbook, sheet, 'Test Cases');

XLSX.writeFile(workbook, outputPath);

console.log(`Created: ${outputPath}`);
