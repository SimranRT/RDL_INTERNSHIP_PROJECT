import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import db from "./db.js";
import multer from "multer";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_SECRET = process.env.JWT_SECRET || "attendance-app-dev-secret";
const MAX_PAID_LEAVE_DAYS = 10;
const DEFAULT_LEAVE_BALANCE = {
  "Paid Leave": MAX_PAID_LEAVE_DAYS
};

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `pbkdf2$${salt}$${hash}`;
}

function isHashedPassword(value) {
  return typeof value === "string" && value.startsWith("pbkdf2$");
}

function verifyPassword(password, storedValue) {
  if (!storedValue) return false;
  if (!isHashedPassword(storedValue)) {
    return password === storedValue;
  }

  const [, salt, expectedHash] = storedValue.split("$");
  const actualHash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(actualHash, "hex"), Buffer.from(expectedHash, "hex"));
}

function createToken(user) {
  const payload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = base64UrlEncode(
    crypto.createHmac("sha256", AUTH_SECRET).update(encodedPayload).digest()
  );
  return `${encodedPayload}.${signature}`;
}

function verifyToken(token) {
  if (!token || !token.includes(".")) return null;
  const [encodedPayload, signature] = token.split(".");
  const expectedSignature = base64UrlEncode(
    crypto.createHmac("sha256", AUTH_SECRET).update(encodedPayload).digest()
  );

  if (signature !== expectedSignature) {
    return null;
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload));
  if (!payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

function parseTimeToMinutes(timeValue) {
  if (!timeValue) return null;
  const text = String(timeValue).trim();
  const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatMinutesAsHours(totalMinutes) {
  const safeMinutes = Math.max(0, Number(totalMinutes) || 0);
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
}

function calculateWorkedMinutes(record) {
  const login = parseTimeToMinutes(record?.login_time);
  const logout = parseTimeToMinutes(record?.logout_time);
  if (login === null || logout === null || logout < login) {
    return 0;
  }

  let breakMinutes = 0;
  const lunchStart = parseTimeToMinutes(record?.lunch_start);
  const lunchEnd = parseTimeToMinutes(record?.lunch_end);
  if (lunchStart !== null && lunchEnd !== null && lunchEnd >= lunchStart) {
    breakMinutes = lunchEnd - lunchStart;
  }

  return Math.max(0, logout - login - breakMinutes);
}

function calculateBreakMinutes(record) {
  const lunchStart = parseTimeToMinutes(record?.lunch_start);
  const lunchEnd = parseTimeToMinutes(record?.lunch_end);
  if (lunchStart === null || lunchEnd === null || lunchEnd < lunchStart) {
    return 0;
  }
  return lunchEnd - lunchStart;
}

function calculateLeaveDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0;
  }
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
}

function enrichAttendanceRecord(record) {
  const workedMinutes = calculateWorkedMinutes(record);
  const breakMinutes = calculateBreakMinutes(record);
  return {
    ...normalizeAttendanceRecord(record),
    worked_minutes: workedMinutes,
    worked_duration: formatMinutesAsHours(workedMinutes),
    break_minutes: breakMinutes,
    break_duration: formatMinutesAsHours(breakMinutes)
  };
}

function buildLeaveSummary(leaves = []) {
  const overview = buildLeaveOverview(leaves);
  return Object.entries(DEFAULT_LEAVE_BALANCE).map(([type, allocated]) => ({
    type,
    allocated,
    used: overview.paid_used,
    remaining: overview.remaining_paid
  }));
}

function enrichLeavesWithAllocation(leaves = []) {
  const approvedLeaves = [...leaves]
    .filter((leave) => leave.status === "approved")
    .sort((a, b) => {
      const aKey = `${a.start_date || ""}-${a.created_at || ""}-${a.id || 0}`;
      const bKey = `${b.start_date || ""}-${b.created_at || ""}-${b.id || 0}`;
      return aKey.localeCompare(bKey);
    });

  let paidUsed = 0;
  const allocationById = new Map();

  for (const leave of approvedLeaves) {
    const totalDays = leave.total_days || calculateLeaveDays(leave.start_date, leave.end_date);
    const remainingPaid = Math.max(MAX_PAID_LEAVE_DAYS - paidUsed, 0);
    const paidDays = Math.min(totalDays, remainingPaid);
    const lopDays = Math.max(totalDays - paidDays, 0);
    paidUsed += paidDays;

    allocationById.set(leave.id, {
      total_days: totalDays,
      paid_days: paidDays,
      lop_days: lopDays,
      leave_category: lopDays === 0 ? "Paid Leave" : paidDays === 0 ? "Loss of Pay" : "Partially Paid",
      is_paid: lopDays === 0 ? 1 : 0
    });
  }

  return leaves.map((leave) => {
    const totalDays = leave.total_days || calculateLeaveDays(leave.start_date, leave.end_date);
    const approvedAllocation = allocationById.get(leave.id);
    return {
      ...leave,
      total_days: totalDays,
      paid_days: approvedAllocation?.paid_days || 0,
      lop_days: approvedAllocation?.lop_days || 0,
      leave_category: approvedAllocation?.leave_category || (leave.status === "approved" ? "Paid Leave" : "Pending Review"),
      is_paid: approvedAllocation?.is_paid ?? (leave.status === "approved" ? 1 : null)
    };
  });
}

function buildLeaveOverview(leaves = []) {
  const enrichedLeaves = enrichLeavesWithAllocation(leaves);
  const approvedLeaves = enrichedLeaves.filter((leave) => leave.status === "approved");
  const pendingLeaves = enrichedLeaves.filter((leave) => leave.status === "pending");
  const paidUsed = approvedLeaves.reduce((sum, leave) => sum + (leave.paid_days || 0), 0);
  const lopDays = approvedLeaves.reduce((sum, leave) => sum + (leave.lop_days || 0), 0);
  const approvedDays = approvedLeaves.reduce((sum, leave) => sum + (leave.total_days || 0), 0);
  const pendingDays = pendingLeaves.reduce((sum, leave) => sum + (leave.total_days || 0), 0);

  return {
    total_paid_allowed: MAX_PAID_LEAVE_DAYS,
    paid_used: paidUsed,
    remaining_paid: Math.max(MAX_PAID_LEAVE_DAYS - paidUsed, 0),
    lop_days: lopDays,
    approved_days: approvedDays,
    pending_days: pendingDays
  };
}

function groupLeavesByUser(leaves = []) {
  return leaves.reduce((acc, leave) => {
    const key = leave.user_id;
    acc[key] = acc[key] || [];
    acc[key].push(leave);
    return acc;
  }, {});
}

function expandApprovedLeaveDates(leaves = [], monthStart, monthEnd) {
  const dateSet = new Set();
  leaves
    .filter((leave) => leave.status === "approved")
    .forEach((leave) => {
      const start = new Date(`${leave.start_date}T00:00:00`);
      const end = new Date(`${leave.end_date}T00:00:00`);
      const from = start > monthStart ? start : monthStart;
      const to = end < monthEnd ? end : monthEnd;
      for (let date = new Date(from); date <= to; date.setDate(date.getDate() + 1)) {
        dateSet.add(formatApiDate(new Date(date)));
      }
    });
  return dateSet;
}

function buildPerformanceSummary({ attendanceRecords = [], leaves = [], holidays = [], year, month }) {
  const monthStart = new Date(Number(year), Number(month) - 1, 1);
  const monthEnd = new Date(Number(year), Number(month), 0);
  const holidaySet = new Set((holidays || []).map((holiday) => holiday.date));
  const leaveDateSet = expandApprovedLeaveDates(leaves, monthStart, monthEnd);
  const attendanceByDate = new Map();

  for (const record of attendanceRecords) {
    if (record?.date) {
      attendanceByDate.set(formatApiDate(record.date), enrichAttendanceRecord(record));
    }
  }

  let workingDays = 0;
  let presentDays = 0;
  let lateDays = 0;
  let absentDays = 0;
  let leaveDays = 0;
  let shortHoursDays = 0;
  let productiveDays = 0;

  for (let date = new Date(monthStart); date <= monthEnd; date.setDate(date.getDate() + 1)) {
    const isoDate = formatApiDate(new Date(date));
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || holidaySet.has(isoDate)) {
      continue;
    }

    workingDays += 1;

    if (leaveDateSet.has(isoDate)) {
      leaveDays += 1;
      continue;
    }

    const record = attendanceByDate.get(isoDate);
    if (!record) {
      absentDays += 1;
      continue;
    }

    const status = String(record.status || "").toLowerCase();
    const workedMinutes = record.worked_minutes || 0;

    if (status === "late") {
      lateDays += 1;
      presentDays += 1;
    } else if (status === "present") {
      presentDays += 1;
      productiveDays += 1;
    } else if (status === "absent") {
      absentDays += 1;
    } else {
      presentDays += 1;
    }

    if (workedMinutes > 0 && workedMinutes < 480) {
      shortHoursDays += 1;
    }
  }

  const score = Math.max(0, 100 - absentDays * 5 - lateDays * 2 - shortHoursDays);
  const attendanceRate = workingDays > 0 ? Number((((presentDays + leaveDays) / workingDays) * 100).toFixed(1)) : 0;
  const punctualityRate = presentDays > 0 ? Number((((presentDays - lateDays) / presentDays) * 100).toFixed(1)) : 100;

  let message = "Good work. Keep maintaining this attendance pattern.";
  if (absentDays > 0) {
    message = `Your score dropped mainly because of ${absentDays} absence${absentDays === 1 ? "" : "s"}. Try to avoid unplanned absences.`;
  } else if (lateDays > 0) {
    message = `Your score dropped because of ${lateDays} late arrival${lateDays === 1 ? "" : "s"}. Try to come on time more consistently.`;
  } else if (shortHoursDays > 0) {
    message = `You had ${shortHoursDays} short-working day${shortHoursDays === 1 ? "" : "s"}. Completing full hours will improve your score.`;
  }

  return {
    score,
    rating: score >= 90 ? "Excellent" : score >= 75 ? "Good" : score >= 60 ? "Average" : "Needs Improvement",
    attendance_rate: attendanceRate,
    punctuality_rate: punctualityRate,
    working_days: workingDays,
    present_days: presentDays,
    late_days: lateDays,
    absent_days: absentDays,
    leave_days: leaveDays,
    short_hours_days: shortHoursDays,
    productive_days,
    message
  };
}

// Configure multer for dataset uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

import fs from 'fs';
import csv from 'csv-parser';
import * as XLSX from 'xlsx';

// Ensure uploads directory exists (still needed for other things maybe)
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

function extractYearMonthFromText(text) {
  if (!text) return null;
  const value = String(text);

  let match = value.match(/(\d{4})-(\d{2})-\d{2}/);
  if (match) return `${match[1]}-${match[2]}`;

  match = value.match(/(\d{4})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}`;

  match = value.match(/(\d{4})\/(\d{1,2})/);
  if (match) return `${match[1]}-${String(match[2]).padStart(2, '0')}`;

  match = value.match(/(\d{1,2})\/(\d{4})/);
  if (match) return `${match[2]}-${String(match[1]).padStart(2, '0')}`;

  return null;
}

function normalizeTime(value) {
  if (!value && value !== 0) return null;
  const text = String(value).trim();
  if (!text || text === '--') return null;

  const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (Number.isNaN(hour) || Number.isNaN(minute) || hour > 23 || minute > 59) {
    return null;
  }

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function calculateOvertime(loginTime, logoutTime) {
  if (!loginTime || !logoutTime) return "00:00";

  const [loginHour, loginMinute] = loginTime.split(":").map(Number);
  const [logoutHour, logoutMinute] = logoutTime.split(":").map(Number);
  const totalMinutes = (logoutHour * 60 + logoutMinute) - (loginHour * 60 + loginMinute);

  if (totalMinutes <= 480) {
    return "00:00";
  }

  const overtimeMinutes = totalMinutes - 480;
  return `${String(Math.floor(overtimeMinutes / 60)).padStart(2, '0')}:${String(overtimeMinutes % 60).padStart(2, '0')}`;
}

function buildImportedUsername(name, empId) {
  const normalized = String(name || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_.-]/g, '');

  return normalized || String(empId || '').trim();
}

async function resolveUniqueImportedUsername(executor, name, empId, currentUserId = null) {
  const baseUsername = buildImportedUsername(name, empId) || `employee_${empId}`;
  const candidates = [baseUsername, `${baseUsername}_${empId}`];

  for (const candidate of candidates) {
    const existing = await executor.get("SELECT * FROM users WHERE username = ?", [candidate]);
    if (!existing || existing.id === currentUserId) {
      return candidate;
    }
  }

  let suffix = 2;
  while (true) {
    const candidate = `${baseUsername}_${empId}_${suffix}`;
    const existing = await executor.get("SELECT * FROM users WHERE username = ?", [candidate]);
    if (!existing || existing.id === currentUserId) {
      return candidate;
    }
    suffix++;
  }
}

function ensureUserRecord(results, employeeMap, empId, name, dept = "") {
  if (!empId || !name || employeeMap[empId]) return;

  const username = buildImportedUsername(name, empId);
  employeeMap[empId] = { name, dept };
  results.users.push({
    id: empId,
    name,
    username,
    department: dept
  });
}

function formatApiDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const text = String(value).trim();
  if (!text) return null;
  if (text.includes('T')) return text.split('T')[0];
  return text;
}

function formatApiTime(value) {
  if (!value) return null;
  if (value instanceof Date) {
    const hours = String(value.getUTCHours()).padStart(2, '0');
    const minutes = String(value.getUTCMinutes()).padStart(2, '0');
    const seconds = String(value.getUTCSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  const text = String(value).trim();
  if (!text) return null;
  const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return text;

  return `${String(Number(match[1])).padStart(2, '0')}:${match[2]}:${match[3] || '00'}`;
}

function normalizeAttendanceRecord(record) {
  return {
    ...record,
    date: formatApiDate(record.date),
    login_time: formatApiTime(record.login_time),
    logout_time: formatApiTime(record.logout_time),
    lunch_start: formatApiTime(record.lunch_start),
    lunch_end: formatApiTime(record.lunch_end)
  };
}

async function processDataset(fileBuffer, originalName) {
  console.log(`Processing dataset: ${originalName}`);
  
  const xlsxLib = XLSX.default || XLSX;
  const workbook = xlsxLib.read(fileBuffer, { type: 'buffer' });
  const sheetNames = workbook.SheetNames;
  console.log(`Sheet names: ${sheetNames.join(', ')}`);
  
  const isAttendanceReport = sheetNames.some(n => n.includes("Att.log") || n.includes("Schedule Infor"));
  
  if (isAttendanceReport) {
    console.log('Detected attendance report format');
    const results = {
      users: [],
      attendance: []
    };
    
    // 1. Get User Info from "Schedule Infor."
    const schedSheetName = sheetNames.find(n => n.includes("Schedule Infor"));
    const employeeMap = {};
    if (schedSheetName) {
      const schedData = xlsxLib.utils.sheet_to_json(workbook.Sheets[schedSheetName], { header: 1 });
      console.log(`Schedule Infor. rows: ${schedData.length}`);
      
      // Find header row dynamically
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(20, schedData.length); i++) {
        const row = schedData[i];
        if (row && row.some(c => c && c.toString().toLowerCase().includes('id'))) {
          headerRowIndex = i;
          break;
        }
      }
      
      const startRow = headerRowIndex !== -1 ? headerRowIndex + 1 : 4;
      console.log(`Starting user parsing from row: ${startRow}`);
      
      for (let i = startRow; i < schedData.length; i++) {
        const row = schedData[i];
        if (row && (row[0] || row[1])) {
          const empId = (row[0] || "").toString().trim();
          const name = (row[1] || "").toString().trim();
          const dept = (row[2] || "").toString().trim();
          
          if (empId && name && !employeeMap[empId]) {
            employeeMap[empId] = { name, dept };
            results.users.push({
              id: empId,
              name: name,
              username: empId,
              department: dept
            });
          }
        }
      }
      console.log(`Parsed ${results.users.length} users from Schedule Infor.`);
    }

    // 2. Parse daily records from Card Report sheets, which match this workbook layout.
    const cardSheetNames = sheetNames.filter((sheetName) => {
      const rows = xlsxLib.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "" });
      return String(rows?.[0]?.[0] || "").toLowerCase().includes("card report");
    });

    console.log(`Detected ${cardSheetNames.length} card report sheets`);

    for (const cardSheetName of cardSheetNames) {
      const sheetRows = xlsxLib.utils.sheet_to_json(workbook.Sheets[cardSheetName], { header: 1, defval: "" });
      console.log(`Processing card sheet ${cardSheetName} with ${sheetRows.length} rows`);

      const yearMonthSource = sheetRows
        .slice(0, 6)
        .flat()
        .find((cell) => extractYearMonthFromText(cell));
      const yearMonth = extractYearMonthFromText(yearMonthSource) || "2025-12";

      const blockWidth = 15;
      for (let blockStart = 0; blockStart < 45; blockStart += blockWidth) {
        const empId = String(sheetRows[3]?.[blockStart + 9] || "").trim();
        const name = String(sheetRows[2]?.[blockStart + 9] || "").trim();
        const dept = String(sheetRows[2]?.[blockStart + 1] || "").trim();

        if (!empId || !name) {
          continue;
        }

        ensureUserRecord(results, employeeMap, empId, name, dept);

        for (let rowIndex = 11; rowIndex < sheetRows.length; rowIndex++) {
          const row = sheetRows[rowIndex] || [];
          const dayLabel = String(row[blockStart] || "").trim();
          const dayMatch = dayLabel.match(/^(\d{1,2})\b/);
          if (!dayMatch) {
            continue;
          }

          const day = Number(dayMatch[1]);
          const login1 = normalizeTime(row[blockStart + 10]);
          const logout2 = normalizeTime(row[blockStart + 12]);

          if (!login1 && !logout2) {
            continue;
          }

          results.attendance.push({
            empId,
            date: `${yearMonth}-${String(day).padStart(2, '0')}`,
            login1,
            logout1: null,
            login2: null,
            logout2,
            overtime: calculateOvertime(login1, logout2),
            status: login1 && login1 > "09:30" ? "Late" : "Present"
          });
        }
      }
    }

    console.log(`Parsed ${results.attendance.length} attendance records.`);
    return { type: 'attendance_report', data: results };
  }

  // Fallback to standard user import
  console.log('Falling back to standard user import');
  const sheet = workbook.Sheets[sheetNames[0]];
  return { type: 'user_list', data: xlsxLib.utils.sheet_to_json(sheet) };
}

let activeServer = null;

export async function startServer(options = {}) {
  if (activeServer) {
    return activeServer;
  }

  const app = express();
  const PORT = Number(options.port || process.env.PORT || 3000);
  const HOST = options.host || process.env.HOST || "127.0.0.1";
  const withRenderer = options.withRenderer ?? process.env.DISABLE_VITE !== "true";

  app.use(express.json());
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  });

  if (db.isUsingMock()) {
    db.writeState((state) => {
      state.users = (state.users || []).map((user) => ({
        ...user,
        password: isHashedPassword(user.password) ? user.password : hashPassword(user.password || "password123")
      }));
      state.notifications = state.notifications || [];
      state.leaves = (state.leaves || []).map((leave) => ({
        ...leave,
        leave_type: leave.leave_type || "Request",
        is_paid: leave.is_paid ?? (leave.leave_type === "LOP" ? 0 : 1),
        total_days: leave.total_days || calculateLeaveDays(leave.start_date, leave.end_date)
      }));
      return state;
    });
  }

  const authenticateRequest = async (req, res, next) => {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    const payload = verifyToken(token);
    if (!payload?.sub) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const user = await db.get("SELECT * FROM users WHERE id = ?", [payload.sub]);
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid session" });
    }

    req.user = sanitizeUser(user);
    next();
  };

  const requireAdmin = (req, res, next) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }
    next();
  };

  const requireSelfOrAdmin = (resolver) => (req, res, next) => {
    const targetUserId = Number(typeof resolver === "function" ? resolver(req) : req.params[resolver || "userId"]);
    if (req.user?.role === "admin" || Number(req.user?.id) === targetUserId) {
      return next();
    }
    return res.status(403).json({ success: false, message: "You can only access your own records." });
  };

  // API Routes
  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    console.log(`Login attempt for username: ${username}`);
    try {
      let user = await db.get("SELECT * FROM users WHERE username = ?", [username]);
      if (!user) {
        user = await db.get("SELECT * FROM users WHERE name = ?", [username]);
      }
      if (user && verifyPassword(password, user.password)) {
        console.log(`Login successful for: ${username}`);
        const safeUser = sanitizeUser(user);
        const token = createToken(safeUser);
        res.json({ success: true, user: safeUser, token });
      } else {
        console.log(`Login failed for: ${username}`);
        res.status(401).json({ success: false, message: "Invalid credentials" });
      }
    } catch (error) {
      console.error(`Login error for ${username}:`, error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post("/api/register", async (req, res) => {
    const { name, username, password } = req.body;
    console.log(`Registration attempt for username: ${username}, name: ${name}`);
    console.log('Request body:', req.body);
    try {
      if (!name || !username || !password) {
        console.log('Registration failed: Missing required fields');
        return res.status(400).json({ success: false, message: "Missing required fields" });
      }
      
      // Check if username exists
      const existing = await db.get("SELECT * FROM users WHERE username = ?", [username]);
      if (existing) {
        console.log(`Registration failed: Username ${username} already exists`);
        return res.status(400).json({ success: false, message: "Username already exists" });
      }

      const [result] = await db.execute(
        "INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)",
        [name, username, hashPassword(password), 'employee']
      );
      
      console.log(`User registered with ID: ${result.insertId}`);
      const user = await db.get("SELECT * FROM users WHERE id = ?", [result.insertId]);
      res.json({ success: true, user: sanitizeUser(user) });
    } catch (error) {
      console.error(`Registration error for ${username}:`, error);
      res.status(400).json({ success: false, message: error.message });
    }
  });

  app.get("/api/me", authenticateRequest, async (req, res) => {
    res.json({ success: true, user: req.user });
  });

  app.post("/api/change-password", authenticateRequest, async (req, res) => {
    const { userId, newPassword } = req.body;
    try {
      if (req.user.role !== "admin" && Number(req.user.id) !== Number(userId)) {
        return res.status(403).json({ success: false, message: "You can only change your own password." });
      }
      await db.execute("UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?", [hashPassword(newPassword), userId]);
      res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get("/api/time-claims", authenticateRequest, async (req, res) => {
    const { userId } = req.query;
    try {
      let claims;
      if (userId) {
        if (req.user.role !== "admin" && Number(req.user.id) !== Number(userId)) {
          return res.status(403).json({ success: false, message: "You can only access your own claims." });
        }
        claims = await db.all("SELECT * FROM time_claims WHERE user_id = ? ORDER BY created_at DESC", [userId]);
      } else {
        if (req.user.role !== "admin") {
          claims = await db.all("SELECT * FROM time_claims WHERE user_id = ? ORDER BY created_at DESC", [req.user.id]);
          return res.json(claims);
        }
        claims = await db.all(`
          SELECT tc.*, u.name as user_name, u.name as employee_name, u.username as employee_id
          FROM time_claims tc 
          JOIN users u ON tc.user_id = u.id 
          ORDER BY tc.created_at DESC
        `);
      }
      res.json(claims);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post("/api/time-claims", authenticateRequest, async (req, res) => {
    const { userId, date, actualLogin, actualLogout, reason } = req.body;
    try {
      if (req.user.role !== "admin" && Number(req.user.id) !== Number(userId)) {
        return res.status(403).json({ success: false, message: "You can only submit claims for your own account." });
      }
      await db.execute(
        "INSERT INTO time_claims (user_id, date, actual_login, actual_logout, reason) VALUES (?, ?, ?, ?, ?)",
        [userId, date, actualLogin, actualLogout, reason]
      );
      res.json({ success: true, message: "Claim submitted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post("/api/time-claims/approve", authenticateRequest, requireAdmin, async (req, res) => {
    const { claimId, status } = req.body;
    try {
      await db.transaction(async (tx) => {
        await tx.execute("UPDATE time_claims SET status = ? WHERE id = ?", [status, claimId]);
        
        if (status === 'approved') {
          const claim = await tx.get("SELECT * FROM time_claims WHERE id = ?", [claimId]);
          const existing = await tx.get("SELECT id FROM attendance WHERE user_id = ? AND date = ?", [claim.user_id, claim.date]);
          
          if (existing) {
            await tx.execute(
              "UPDATE attendance SET login_time = ?, logout_time = ?, status = 'Present' WHERE id = ?",
              [claim.actual_login, claim.actual_logout, existing.id]
            );
          } else {
            await tx.execute(
              "INSERT INTO attendance (user_id, date, login_time, logout_time, status) VALUES (?, ?, ?, ?, 'Present')",
              [claim.user_id, claim.date, claim.actual_login, claim.actual_logout]
            );
          }
        }
      });
      res.json({ success: true, message: `Claim ${status} successfully` });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
  app.get("/api/departments", authenticateRequest, async (req, res) => {
    const depts = await db.all("SELECT * FROM departments");
    res.json(depts);
  });

  app.post("/api/departments", authenticateRequest, requireAdmin, async (req, res) => {
    const { name, description } = req.body;
    const [result] = await db.execute("INSERT INTO departments (name, description) VALUES (?, ?)", [name, description]);
    res.json({ id: result.insertId });
  });

  app.get("/api/sections", authenticateRequest, async (req, res) => {
    const sections = await db.all(`
      SELECT s.*, d.name as department_name 
      FROM sections s 
      JOIN departments d ON s.department_id = d.id
    `);
    res.json(sections);
  });

  app.post("/api/sections", authenticateRequest, requireAdmin, async (req, res) => {
    const { name, department_id, description } = req.body;
    const [result] = await db.execute(
      "INSERT INTO sections (name, department_id, description) VALUES (?, ?, ?)",
      [name, department_id, description]
    );
    res.json({ id: result.insertId });
  });

  app.get("/api/users", authenticateRequest, async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const latestDateRow = await db.get("SELECT MAX(date) as latest FROM attendance");
      const latestDate = latestDateRow?.latest || today;

      const users = await db.all(`
        SELECT u.id, u.name, u.username, u.role, u.department_id, u.section_id, 
               d.name as department_name, s.name as section_name,
               a.status as today_status, a.login_time as today_login
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN sections s ON u.section_id = s.id
        LEFT JOIN attendance a ON u.id = a.user_id AND a.date = ?
        ORDER BY u.name ASC
      `, [latestDate]);

      // Calculate attendance rate for each user
      for (const user of users) {
        const stats = await db.get(`
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status IN ('Present', 'Late') THEN 1 ELSE 0 END) as present
          FROM attendance 
          WHERE user_id = ?
        `, [user.id]);
        
        user.attendance_rate = stats.total > 0 
          ? ((stats.present / stats.total) * 100).toFixed(1) 
          : "0.0";
      }

      const filteredUsers = req.user.role === "admin"
        ? users
        : users.filter((user) => Number(user.id) === Number(req.user.id));

      res.json(filteredUsers);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get("/api/holidays", authenticateRequest, async (req, res) => {
    try {
      const holidays = await db.all("SELECT * FROM holidays ORDER BY date ASC");
      res.json(holidays);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post("/api/holidays", authenticateRequest, requireAdmin, async (req, res) => {
    const { name, date, type } = req.body;
    try {
      const [result] = await db.execute("INSERT INTO holidays (name, date, type) VALUES (?, ?, ?)", [name, date, type || 'National']);
      res.json({ success: true, id: result.insertId });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.put("/api/holidays/:id", authenticateRequest, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, date, type } = req.body;
    try {
      await db.execute("UPDATE holidays SET name = ?, date = ?, type = ? WHERE id = ?", [name, date, type, id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.delete("/api/holidays/:id", authenticateRequest, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
      await db.execute("DELETE FROM holidays WHERE id = ?", [id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Leave Management Routes
  app.get("/api/leaves", authenticateRequest, requireAdmin, async (req, res) => {
    try {
      const leaves = await db.all(`
        SELECT l.*, u.name as user_name, u.username 
        FROM leaves l 
        JOIN users u ON l.user_id = u.id 
        ORDER BY l.created_at DESC
      `);
      const groupedLeaves = groupLeavesByUser(leaves);
      const enrichedLeaves = Object.values(groupedLeaves)
        .flatMap((userLeaves) => enrichLeavesWithAllocation(userLeaves))
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      res.json(enrichedLeaves);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get("/api/leaves/:userId", authenticateRequest, requireSelfOrAdmin("userId"), async (req, res) => {
    const { userId } = req.params;
    try {
      const leaves = await db.all("SELECT * FROM leaves WHERE user_id = ? ORDER BY created_at DESC", [userId]);
      res.json(enrichLeavesWithAllocation(leaves));
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get("/api/leave-balance/:userId", authenticateRequest, requireSelfOrAdmin("userId"), async (req, res) => {
    const { userId } = req.params;
    try {
      const leaves = await db.all("SELECT * FROM leaves WHERE user_id = ? ORDER BY created_at DESC", [userId]);
      res.json(buildLeaveOverview(leaves));
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post("/api/leaves", authenticateRequest, async (req, res) => {
    const { user_id, start_date, end_date, reason } = req.body;
    try {
      if (req.user.role !== "admin" && Number(req.user.id) !== Number(user_id)) {
        return res.status(403).json({ success: false, message: "You can only submit leave for your own account." });
      }
      const totalDays = calculateLeaveDays(start_date, end_date);
      if (!user_id || !start_date || !end_date || totalDays <= 0) {
        return res.status(400).json({ success: false, message: "Please provide a valid leave date range." });
      }

      const [result] = await db.execute(
        "INSERT INTO leaves (user_id, start_date, end_date, reason) VALUES (?, ?, ?, ?)",
        [user_id, start_date, end_date, reason]
      );
      res.json({ success: true, id: result.insertId });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.put("/api/leaves/:id", authenticateRequest, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
      // Get leave details to notify the user
      const leave = await db.get("SELECT user_id, start_date, end_date FROM leaves WHERE id = ?", [id]);
      
      await db.execute("UPDATE leaves SET status = ? WHERE id = ?", [status, id]);

      if (leave) {
        let message = `Your leave request for ${leave.start_date} to ${leave.end_date} has been ${status}.`;
        if (status === "approved") {
          const userLeaves = await db.all("SELECT * FROM leaves WHERE user_id = ? ORDER BY created_at DESC", [leave.user_id]);
          const approvedLeave = enrichLeavesWithAllocation(userLeaves).find((item) => Number(item.id) === Number(id));
          if (approvedLeave?.lop_days) {
            message += ` ${approvedLeave.paid_days} day(s) are paid and ${approvedLeave.lop_days} day(s) are Loss of Pay.`;
          } else if (approvedLeave?.paid_days) {
            message += ` ${approvedLeave.paid_days} day(s) were approved as paid leave.`;
          }
        }
        await db.execute("INSERT INTO notifications (user_id, message) VALUES (?, ?)", [leave.user_id, message]);
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Notification Routes
  app.get("/api/notifications/:userId", authenticateRequest, requireSelfOrAdmin("userId"), async (req, res) => {
    const { userId } = req.params;
    try {
      const notifications = await db.all(
        "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20",
        [userId]
      );
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.put("/api/notifications/:id/read", authenticateRequest, async (req, res) => {
    const { id } = req.params;
    try {
      const notification = await db.get("SELECT * FROM notifications WHERE id = ?", [id]);
      if (!notification || (req.user.role !== "admin" && Number(notification.user_id) !== Number(req.user.id))) {
        return res.status(403).json({ success: false, message: "You can only update your own notifications." });
      }
      await db.execute("UPDATE notifications SET is_read = 1 WHERE id = ?", [id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.delete("/api/leaves/:id", authenticateRequest, async (req, res) => {
    const { id } = req.params;
    try {
      const leave = await db.get("SELECT * FROM leaves WHERE id = ?", [id]);
      if (!leave || (req.user.role !== "admin" && Number(leave.user_id) !== Number(req.user.id))) {
        return res.status(403).json({ success: false, message: "You can only delete your own pending leave requests." });
      }
      await db.execute("DELETE FROM leaves WHERE id = ? AND status = 'pending'", [id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.get("/api/attendance/:userId", authenticateRequest, requireSelfOrAdmin("userId"), async (req, res) => {
    const { userId } = req.params;
    const { month, year } = req.query;
    const datePattern = `${year}-${month}%`;
    const attendance = await db.all("SELECT * FROM attendance WHERE user_id = ? AND date LIKE ? ORDER BY date ASC", [userId, datePattern]);
    res.json(attendance.map(normalizeAttendanceRecord));
  });

  app.get("/api/performance/:userId", authenticateRequest, requireSelfOrAdmin("userId"), async (req, res) => {
    const { userId } = req.params;
    const { month, year } = req.query;
    try {
      const safeMonth = String(month || "").padStart(2, "0");
      const safeYear = String(year || "");
      if (!safeMonth || !safeYear) {
        return res.status(400).json({ success: false, message: "Month and year are required." });
      }

      const attendance = await db.all(
        "SELECT * FROM attendance WHERE user_id = ? AND date LIKE ? ORDER BY date ASC",
        [userId, `${safeYear}-${safeMonth}%`]
      );
      const leaves = await db.all("SELECT * FROM leaves WHERE user_id = ? ORDER BY created_at DESC", [userId]);
      const holidays = await db.all("SELECT * FROM holidays ORDER BY date ASC");
      const enrichedLeaves = enrichLeavesWithAllocation(leaves);
      const performance = buildPerformanceSummary({
        attendanceRecords: attendance,
        leaves: enrichedLeaves,
        holidays,
        year: safeYear,
        month: safeMonth
      });

      res.json({
        ...performance,
        leave_overview: buildLeaveOverview(leaves)
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  app.post("/api/attendance/log", authenticateRequest, async (req, res) => {
    const { user_id, date, type, time } = req.body;
    try {
      if (req.user.role !== "admin" && Number(req.user.id) !== Number(user_id)) {
        return res.status(403).json({ success: false, message: "You can only log attendance for your own account." });
      }
      const existing = await db.get("SELECT * FROM attendance WHERE user_id = ? AND date = ?", [user_id, date]);
      
      if (existing) {
        let updateField = "";
        if (type === "login") updateField = "login_time";
        else if (type === "lunch_start") updateField = "lunch_start";
        else if (type === "lunch_end") updateField = "lunch_end";
        else if (type === "logout") updateField = "logout_time";

        if (updateField) {
          await db.execute(`UPDATE attendance SET ${updateField} = ? WHERE id = ?`, [time, existing.id]);
        }
      } else {
        const login_time = type === "login" ? time : null;
        let status = "Present";
        if (type === "login" && time > "09:30") status = "Late";
        
        await db.execute("INSERT INTO attendance (user_id, date, login_time, status) VALUES (?, ?, ?, ?)", [user_id, date, login_time, status]);
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Dashboard Stats Route
  app.get("/api/dashboard-stats", authenticateRequest, async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get counts for today
      const present = await db.get("SELECT count(*) as count FROM attendance WHERE date = ? AND status = 'Present'", [today]);
      const late = await db.get("SELECT count(*) as count FROM attendance WHERE date = ? AND status = 'Late'", [today]);
      const absent = await db.get("SELECT count(*) as count FROM attendance WHERE date = ? AND status = 'Absent'", [today]);
      
      // Get leave count for today
      const onLeave = await db.get(`
        SELECT count(*) as count FROM leaves 
        WHERE status = 'approved' 
        AND ? BETWEEN start_date AND end_date
      `, [today]);

      // Get total active users
      const totalUsers = await db.get("SELECT count(*) as count FROM users WHERE role = 'employee'");

      // If no attendance records for today yet (e.g. early morning), 
      // we might want to show yesterday's or just 0.
      // But for "real-time" based on uploaded data, we should probably look at the LATEST date in the attendance table.
      
      const latestDateRow = await db.get("SELECT MAX(date) as latest FROM attendance");
      const latestDate = latestDateRow?.latest || today;

      const lPresent = await db.get("SELECT count(*) as count FROM attendance WHERE date = ? AND status = 'Present'", [latestDate]);
      const lLate = await db.get("SELECT count(*) as count FROM attendance WHERE date = ? AND status = 'Late'", [latestDate]);
      const lAbsent = await db.get("SELECT count(*) as count FROM attendance WHERE date = ? AND status = 'Absent'", [latestDate]);
      const lOnLeave = await db.get(`
        SELECT count(*) as count FROM leaves 
        WHERE status = 'approved' 
        AND ? BETWEEN start_date AND end_date
      `, [latestDate]);

      res.json({
        today: {
          present: present.count,
          late: late.count,
          absent: absent.count,
          onLeave: onLeave.count,
          total: totalUsers.count
        },
        latest: {
          date: latestDate,
          present: lPresent.count,
          late: lLate.count,
          absent: lAbsent.count,
          onLeave: lOnLeave.count
        }
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });

  // Real-time Status Route
  app.get("/api/realtime-status", authenticateRequest, async (req, res) => {
    try {
      const latestDateRow = await db.get("SELECT MAX(date) as latest FROM attendance");
      const latestDate = latestDateRow?.latest || new Date().toISOString().split('T')[0];

      const status = await db.all(`
        SELECT u.id, u.name, u.username, d.name as department, a.login_time, a.logout_time, a.status, a.date
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN attendance a ON u.id = a.user_id AND a.date = ?
        WHERE u.role = 'employee'
        ORDER BY u.name ASC
      `, [latestDate]);

      const filteredStatus = req.user.role === "admin"
        ? status
        : status.filter((item) => Number(item.id) === Number(req.user.id));

      res.json({ date: latestDate, status: filteredStatus });
    } catch (error) {
      console.error('Realtime status error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  });
  // Dataset Upload Route
  app.post("/api/upload-dataset", authenticateRequest, requireAdmin, upload.single('dataset'), async (req, res) => {
    console.log('Upload dataset route hit');
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    try {
      console.log(`File received: ${req.file.originalname}, size: ${req.file.size}`);
      const result = await processDataset(req.file.buffer, req.file.originalname);
      
      if (result.type === 'attendance_report') {
        const { users, attendance } = result.data;
        let userCount = 0;
        let attendanceCount = 0;

        console.log(`Starting DB import for ${users.length} users and ${attendance.length} attendance records`);

        try {
          await db.transaction(async (tx) => {
            // 1. Import Users
            for (const u of users) {
              const existing = await tx.get(
                "SELECT id, username FROM users WHERE username = ? OR name = ?",
                [u.username, u.name]
              );
              let userId;
              if (!existing) {
                const uniqueUsername = await resolveUniqueImportedUsername(tx, u.name, u.id);
                u.username = uniqueUsername;
                // Handle Dept
                let deptId = null;
                if (u.department) {
                  let dept = await tx.get("SELECT id FROM departments WHERE name = ?", [u.department]);
                  if (!dept) {
                    const [res] = await tx.execute("INSERT INTO departments (name) VALUES (?)", [u.department]);
                    deptId = res.insertId;
                  } else {
                    deptId = dept.id;
                  }
                }

                const [res] = await tx.execute(
                  "INSERT INTO users (name, username, password, role, department_id, must_change_password) VALUES (?, ?, ?, ?, ?, ?)",
                  [u.name, u.username, hashPassword('password123'), 'employee', deptId, 1]
                );
                userId = res.insertId;
                userCount++;
              } else {
                userId = existing.id;
                const uniqueUsername = await resolveUniqueImportedUsername(tx, u.name, u.id, userId);
                u.username = uniqueUsername;
                if (existing.username !== uniqueUsername) {
                  await tx.execute("UPDATE users SET username = ? WHERE id = ?", [uniqueUsername, userId]);
                }
              }
              u.dbId = userId;
            }

            // 2. Replace existing imported data for the same user/month before re-inserting.
            const importedUserMonths = new Map();
            for (const a of attendance) {
              const user = users.find(u => u.id === a.empId);
              if (!user?.dbId || !a.date) continue;

              const monthKey = a.date.slice(0, 7);
              if (!importedUserMonths.has(user.dbId)) {
                importedUserMonths.set(user.dbId, new Set());
              }
              importedUserMonths.get(user.dbId).add(monthKey);
            }

            for (const [userId, months] of importedUserMonths.entries()) {
              for (const monthKey of months) {
                await tx.execute(
                  "DELETE FROM attendance WHERE user_id = ? AND date LIKE ?",
                  [userId, `${monthKey}%`]
                );
              }
            }

            // 3. Import Attendance
            for (const a of attendance) {
              const user = users.find(u => u.id === a.empId);
              if (!user || !user.dbId) continue;

              await tx.execute(
                "INSERT INTO attendance (user_id, date, login_time, lunch_start, lunch_end, logout_time, overtime, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [user.dbId, a.date, a.login1, a.logout1, a.login2, a.logout2, a.overtime, a.status]
              );
              attendanceCount++;
            }
          });

          console.log(`Import completed: ${userCount} new users, ${attendanceCount} attendance records`);
          return res.json({ 
            success: true, 
            message: `Attendance report processed. ${userCount} new users and ${attendanceCount} attendance records imported/updated.` 
          });
        } catch (err) {
          console.error('Transaction error during import:', err);
          return res.status(500).json({ success: false, message: "Error during database import: " + err.message });
        }
      }

      // Standard user list processing
      const data = result.data;
      let importedCount = 0;
      for (const row of data) {
        const name = row.Name || row.name || row['Full Name'] || row['full name'];
        const username = row.Username || row.username || row['User Name'] || row['user name'];
        const password = row.Password || row.password || 'password123';
        const role = row.Role || row.role || 'employee';
        const deptName = row.Department || row.department;
        const sectionName = row.Section || row.section;

        if (!name || !username) continue;

        const existing = await db.get("SELECT * FROM users WHERE username = ?", [username]);
        if (existing) continue;

        let deptId = null;
        if (deptName) {
          let dept = await db.get("SELECT id FROM departments WHERE name = ?", [deptName]);
          if (!dept) {
            const [res] = await db.execute("INSERT INTO departments (name) VALUES (?)", [deptName]);
            deptId = res.insertId;
          } else {
            deptId = dept.id;
          }
        }

        let sectionId = null;
        if (sectionName && deptId) {
          let section = await db.get("SELECT id FROM sections WHERE name = ? AND department_id = ?", [sectionName, deptId]);
          if (!section) {
            const [res] = await db.execute("INSERT INTO sections (name, department_id) VALUES (?, ?)", [sectionName, deptId]);
            sectionId = res.insertId;
          } else {
            sectionId = section.id;
          }
        }

        await db.execute(
          "INSERT INTO users (name, username, password, role, department_id, section_id) VALUES (?, ?, ?, ?, ?, ?)",
          [name, username, hashPassword(password.toString()), role, deptId, sectionId]
        );
        importedCount++;
      }

      res.json({ 
        success: true, 
        message: `Dataset processed successfully. ${importedCount} users imported.`,
        importedCount
      });
    } catch (error) {
      console.error('Dataset processing error:', error);
      res.status(500).json({ success: false, message: "Error processing dataset: " + error.message });
    }
  });

  // Vite middleware for development
  if (withRenderer && process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (withRenderer) {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  activeServer = app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });

  return activeServer;
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  startServer();
}
 
