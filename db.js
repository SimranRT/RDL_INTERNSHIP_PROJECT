import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const MOCK_FILE = path.join(process.cwd(), 'mock_db.json');

// Initialize mock data if it doesn't exist
if (!fs.existsSync(MOCK_FILE)) {
  const initialData = {
    users: [
      { id: 1, name: 'Administrator', username: 'admin', password: 'password123', role: 'admin', must_change_password: 0 },
      { id: 2, name: 'John Doe', username: 'john.doe', password: 'password123', role: 'employee', department_id: 1, section_id: 1, must_change_password: 1 }
    ],
    departments: [
      { id: 1, name: 'Engineering', description: 'Software development team' }
    ],
    sections: [
      { id: 1, name: 'Frontend', department_id: 1, description: 'UI engineering team' }
    ],
    attendance: [
      { id: 1, user_id: 2, date: '2026-04-01', login_time: '09:05:00', lunch_start: '13:00:00', lunch_end: '13:45:00', logout_time: '18:10:00', overtime: '00:20', status: 'Present' },
      { id: 2, user_id: 2, date: '2026-04-02', login_time: '09:20:00', lunch_start: '13:10:00', lunch_end: '13:40:00', logout_time: '18:30:00', overtime: '00:40', status: 'Present' }
    ],
    holidays: [
      { id: 1, name: 'Ambedkar Jayanti', date: '2026-04-14', type: 'Public' }
    ],
    leaves: [
      { id: 1, user_id: 2, start_date: '2026-04-18', end_date: '2026-04-19', reason: 'Fever recovery', leave_type: 'Sick Leave', is_paid: 1, total_days: 2, status: 'approved', created_at: '2026-04-05T09:30:00.000Z' }
    ],
    time_claims: [],
    notifications: []
  };
  fs.writeFileSync(MOCK_FILE, JSON.stringify(initialData, null, 2));
}

let pool = null;
let isMockMode = false;

// Attempt to connect to MySQL
const initPool = () => {
  try {
    if (process.env.DB_HOST && process.env.DB_HOST !== 'localhost') {
      pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'attendance_db',
        dateStrings: true,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 5000
      });
      console.log('MySQL Pool initialized');
    } else {
      console.warn('DB_HOST not set or is localhost. Using Mock Mode (JSON).');
      isMockMode = true;
    }
  } catch (err) {
    console.error('Failed to initialize MySQL pool:', err.message);
    isMockMode = true;
  }
};

initPool();

const getMockData = () => JSON.parse(fs.readFileSync(MOCK_FILE, 'utf8'));
const saveMockData = (data) => fs.writeFileSync(MOCK_FILE, JSON.stringify(data, null, 2));
const nextId = (items = []) => items.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;

const dbWrapper = {
  execute: async (query, params = []) => {
    if (!isMockMode && pool) {
      try {
        const [result] = await pool.execute(query, params);
        return [result];
      } catch (err) {
        if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ENOTFOUND') {
          if (!isMockMode) {
            console.warn('MySQL connection failed (ECONNREFUSED). Falling back to Mock Mode (JSON).');
            isMockMode = true;
          }
        } else {
          console.error('MySQL Execute Error:', err.message);
          throw err;
        }
      }
    }

    // Mock Logic
    const data = getMockData();
    const q = query.toLowerCase();

    if (q.includes('insert into departments')) {
      const newDepartment = {
        id: nextId(data.departments),
        name: params[0],
        description: params[1] || null
      };
      data.departments.push(newDepartment);
      saveMockData(data);
      return [{ insertId: newDepartment.id }];
    }

    if (q.includes('insert into sections')) {
      const newSection = {
        id: nextId(data.sections),
        name: params[0],
        department_id: params[1] || null,
        description: params[2] || null
      };
      data.sections.push(newSection);
      saveMockData(data);
      return [{ insertId: newSection.id }];
    }

    if (q.includes('insert into users')) {
      const newUser = { 
        id: nextId(data.users), 
        name: params[0], 
        username: params[1], 
        password: params[2], 
        role: params[3] || 'employee',
        department_id: q.includes('department_id') ? params[4] || null : null,
        section_id: q.includes('section_id') ? params[5] || null : null,
        must_change_password: q.includes('must_change_password') ? params[params.length - 1] || 0 : 0
      };
      data.users.push(newUser);
      saveMockData(data);
      return [{ insertId: newUser.id }];
    }
    
    if (q.includes('insert into attendance')) {
      const newRecord = { 
        id: nextId(data.attendance), 
        user_id: params[0], 
        date: params[1], 
        login_time: params[2], 
        lunch_start: params[3],
        lunch_end: params[4],
        logout_time: params[5],
        overtime: params[6],
        status: params[7] 
      };
      data.attendance.push(newRecord);
      saveMockData(data);
      return [{ insertId: newRecord.id }];
    }

    if (q.includes('insert into leaves')) {
      const newLeave = {
        id: nextId(data.leaves),
        user_id: Number(params[0]),
        start_date: params[1],
        end_date: params[2],
        reason: params[3] || '',
        status: 'pending',
        created_at: new Date().toISOString()
      };
      data.leaves.push(newLeave);
      saveMockData(data);
      return [{ insertId: newLeave.id }];
    }

    if (q.includes('update leaves set status = ? where id = ?')) {
      const leave = data.leaves.find((item) => item.id === Number(params[1]));
      if (leave) {
        leave.status = params[0];
        saveMockData(data);
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 0 }];
    }

    if (q.includes("delete from leaves where id = ? and status = 'pending'")) {
      const beforeCount = data.leaves.length;
      data.leaves = data.leaves.filter((item) => !(item.id === Number(params[0]) && item.status === 'pending'));
      saveMockData(data);
      return [{ affectedRows: beforeCount - data.leaves.length }];
    }

    if (q.includes('insert into notifications')) {
      const notification = {
        id: nextId(data.notifications),
        user_id: Number(params[0]),
        message: params[1],
        is_read: 0,
        created_at: new Date().toISOString()
      };
      data.notifications.unshift(notification);
      saveMockData(data);
      return [{ insertId: notification.id }];
    }

    if (q.includes('insert into time_claims')) {
      const claim = {
        id: nextId(data.time_claims),
        user_id: Number(params[0]),
        date: params[1],
        actual_login: params[2],
        actual_logout: params[3],
        reason: params[4] || '',
        status: 'pending',
        created_at: new Date().toISOString()
      };
      data.time_claims.unshift(claim);
      saveMockData(data);
      return [{ insertId: claim.id }];
    }

    if (q.includes('update time_claims set status = ? where id = ?')) {
      const claim = data.time_claims.find((item) => item.id === Number(params[1]));
      if (claim) {
        claim.status = params[0];
        saveMockData(data);
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 0 }];
    }

    if (q.includes('update notifications set is_read = 1 where id = ?')) {
      const notification = data.notifications.find((item) => item.id === Number(params[0]));
      if (notification) {
        notification.is_read = 1;
        saveMockData(data);
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 0 }];
    }

    if (q.includes('delete from attendance where user_id = ? and date like ?')) {
      const userId = Number(params[0]);
      const dateLike = String(params[1] || '').replace('%', '');
      const beforeCount = data.attendance.length;
      data.attendance = data.attendance.filter(a => !(a.user_id === userId && String(a.date).startsWith(dateLike)));
      saveMockData(data);
      return [{ affectedRows: beforeCount - data.attendance.length }];
    }

    if (q.includes('update users set password = ?')) {
      const user = data.users.find(u => u.id === params[2]);
      if (user) {
        user.password = params[0];
        user.must_change_password = params[1];
        saveMockData(data);
        return [{ affectedRows: 1 }];
      }
    }

    if (q.includes('update users set username = ? where id = ?')) {
      const user = data.users.find(u => u.id === params[1]);
      if (user) {
        user.username = params[0];
        saveMockData(data);
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 0 }];
    }

    if (q.includes('update attendance')) {
      let record;
      if (q.includes('where id = ?')) {
        const id = params[params.length - 1];
        record = data.attendance.find(a => a.id === id);
      } else if (q.includes('where user_id = ? and date = ?')) {
        const userId = params[params.length - 2];
        const date = params[params.length - 1];
        record = data.attendance.find(a => a.user_id === userId && a.date === date);
      }

      if (record) {
        if (q.includes('set login_time = ?, lunch_start = ?, lunch_end = ?, logout_time = ?, overtime = ?, status = ?')) {
          record.login_time = params[0];
          record.lunch_start = params[1];
          record.lunch_end = params[2];
          record.logout_time = params[3];
          record.overtime = params[4];
          record.status = params[5];
        } else if (q.includes("set login_time = ?, logout_time = ?, status = 'present'")) {
          record.login_time = params[0];
          record.logout_time = params[1];
          record.status = 'Present';
        } else if (q.includes('set')) {
          if (q.includes('login_time')) record.login_time = params[0];
          if (q.includes('lunch_start')) record.lunch_start = params[0];
          if (q.includes('lunch_end')) record.lunch_end = params[0];
          if (q.includes('logout_time')) record.logout_time = params[0];
        }
        saveMockData(data);
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 0 }];
    }

    return [{ affectedRows: 0 }];
  },

  get: async (query, params = []) => {
    if (!isMockMode && pool) {
      try {
        const [rows] = await pool.execute(query, params);
        return rows[0];
      } catch (err) {
        if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ENOTFOUND') {
          if (!isMockMode) {
            console.warn('MySQL connection failed (ECONNREFUSED). Falling back to Mock Mode (JSON).');
            isMockMode = true;
          }
        } else {
          console.error('MySQL Get Error:', err.message);
          throw err;
        }
      }
    }

    const data = getMockData();
    const q = query.toLowerCase();

    if (q.includes('select id from departments where name = ?')) {
      return data.departments.find(d => d.name === params[0]) || null;
    }

    if (q.includes('select id from sections where name = ? and department_id = ?')) {
      return data.sections.find(s => s.name === params[0] && s.department_id === params[1]) || null;
    }

    if (q.includes('from users where username = ?')) {
      return data.users.find(u => u.username === params[0]);
    }

    if (q.includes('from users where name = ?')) {
      return data.users.find(u => u.name === params[0]);
    }

    if (q.includes('select id, username from users where username = ? or name = ?')) {
      return data.users.find(u => u.username === params[0] || u.name === params[1]) || null;
    }
    
    if (q.includes('from users where id = ?')) {
      return data.users.find(u => u.id === params[0]);
    }

    if (q.includes('from attendance where user_id = ? and date = ?')) {
      return data.attendance.find(a => a.user_id === params[0] && a.date === params[1]);
    }

    if (q.includes('select user_id, start_date, end_date from leaves where id = ?')) {
      const leave = data.leaves.find((item) => item.id === Number(params[0]));
      if (!leave) return null;
      return {
        user_id: leave.user_id,
        start_date: leave.start_date,
        end_date: leave.end_date
      };
    }

    if (q.includes('select * from leaves where id = ?')) {
      return data.leaves.find((item) => item.id === Number(params[0])) || null;
    }

    if (q.includes('select * from notifications where id = ?')) {
      return data.notifications.find((item) => item.id === Number(params[0])) || null;
    }

    if (q.includes('select max(date) as latest from attendance')) {
      const latest = data.attendance.reduce((max, record) => {
        if (!record.date) return max;
        return !max || record.date > max ? record.date : max;
      }, null);
      return { latest };
    }

    if (q.includes('select * from time_claims where id = ?')) {
      return data.time_claims.find((item) => item.id === Number(params[0])) || null;
    }

    if (q.includes('count(*)')) {
      if (q.includes("from attendance where date = ? and status = 'present'")) {
        return { count: data.attendance.filter(a => a.date === params[0] && a.status === 'Present').length };
      }
      if (q.includes("from attendance where date = ? and status = 'late'")) {
        return { count: data.attendance.filter(a => a.date === params[0] && a.status === 'Late').length };
      }
      if (q.includes("from attendance where date = ? and status = 'absent'")) {
        return { count: data.attendance.filter(a => a.date === params[0] && a.status === 'Absent').length };
      }
      if (q.includes("from users where role = 'employee'")) {
        return { count: data.users.filter(u => u.role === 'employee').length };
      }
      if (q.includes('from attendance') && q.includes('where user_id = ?')) {
        const records = data.attendance.filter((item) => item.user_id === Number(params[0]));
        const present = records.filter((item) => ['Present', 'Late'].includes(item.status)).length;
        return { total: records.length, present };
      }
      if (q.includes("from leaves") && q.includes("status = 'approved'")) {
        const targetDate = params[0];
        return {
          count: data.leaves.filter((leave) => (
            leave.status === 'approved' &&
            leave.start_date <= targetDate &&
            leave.end_date >= targetDate
          )).length
        };
      }
      return { count: 0 };
    }

    return null;
  },

  all: async (query, params = []) => {
    if (!isMockMode && pool) {
      try {
        const [rows] = await pool.execute(query, params);
        return rows;
      } catch (err) {
        if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ENOTFOUND') {
          if (!isMockMode) {
            console.warn('MySQL connection failed (ECONNREFUSED). Falling back to Mock Mode (JSON).');
            isMockMode = true;
          }
        } else {
          console.error('MySQL All Error:', err.message);
          throw err;
        }
      }
    }

    const data = getMockData();
    const q = query.toLowerCase();

    if (q.includes('from users')) return data.users;
    if (q.includes('from departments')) return data.departments;
    if (q.includes('from sections')) return data.sections;
    if (q.includes('from attendance where user_id = ? and date like ?')) {
      const userId = Number(params[0]);
      const dateLike = String(params[1] || '').replace('%', '');
      return data.attendance.filter(a => a.user_id === userId && String(a.date).startsWith(dateLike));
    }
    if (q.includes('from attendance')) return data.attendance;
    if (q.includes('from holidays')) return data.holidays;
    if (q.includes('from leaves l') && q.includes('join users u')) {
      return data.leaves
        .map((leave) => {
          const user = data.users.find((item) => item.id === leave.user_id) || {};
          return {
            ...leave,
            user_name: user.name || 'Unknown User',
            username: user.username || 'unknown'
          };
        })
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }
    if (q.includes('from leaves where user_id = ?')) {
      return data.leaves
        .filter((leave) => leave.user_id === Number(params[0]))
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }
    if (q.includes('from leaves')) return data.leaves;
    if (q.includes('from notifications where user_id = ?')) {
      return data.notifications
        .filter((notification) => notification.user_id === Number(params[0]))
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(0, 20);
    }
    if (q.includes('from time_claims tc') && q.includes('join users u')) {
      return data.time_claims.map((claim) => {
        const user = data.users.find((item) => item.id === claim.user_id) || {};
        return {
          ...claim,
          user_name: user.name || 'Unknown User',
          employee_name: user.name || 'Unknown User',
          employee_id: user.username || 'unknown'
        };
      });
    }
    if (q.includes('from time_claims where user_id = ?')) {
      return data.time_claims.filter((claim) => claim.user_id === Number(params[0]));
    }
    if (q.includes('from time_claims')) return data.time_claims;

    return [];
  },
  
  transaction: async (callback) => {
    if (isMockMode || !pool) {
      const mockTx = {
        execute: dbWrapper.execute,
        get: dbWrapper.get,
        all: dbWrapper.all
      };
      return await callback(mockTx);
    }

    const connection = await pool.getConnection();
    await connection.beginTransaction();
    try {
      // Wrap the connection to provide get and all methods
      const tx = {
        execute: async (query, params) => {
          const [result] = await connection.execute(query, params);
          return [result];
        },
        get: async (query, params) => {
          const [rows] = await connection.execute(query, params);
          return rows[0];
        },
        all: async (query, params) => {
          const [rows] = await connection.execute(query, params);
          return rows;
        },
        rollback: () => connection.rollback(),
        commit: () => connection.commit(),
        release: () => connection.release()
      };

      const result = await callback(tx);
      await connection.commit();
      return result;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }
};

dbWrapper.isUsingMock = () => isMockMode;
dbWrapper.readState = () => getMockData();
dbWrapper.writeState = (updater) => {
  const currentData = getMockData();
  const nextData = typeof updater === 'function' ? updater(currentData) || currentData : updater;
  saveMockData(nextData);
  return nextData;
};

export default dbWrapper;
