-- MySQL Database Schema for Attendance Management System

CREATE DATABASE IF NOT EXISTS attendance_db;
USE attendance_db;

-- 1. Departments Table
CREATE TABLE IF NOT EXISTS departments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT
);

-- 2. Sections Table
CREATE TABLE IF NOT EXISTS sections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  department_id INT,
  description TEXT,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- 3. Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'employee') DEFAULT 'employee',
  department_id INT,
  section_id INT,
  must_change_password BOOLEAN DEFAULT 0,
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (section_id) REFERENCES sections(id)
);

-- 4. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  date DATE NOT NULL,
  login_time TIME,
  logout_time TIME,
  lunch_start TIME,
  lunch_end TIME,
  overtime VARCHAR(10),
  status VARCHAR(50),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 5. Holidays Table
CREATE TABLE IF NOT EXISTS holidays (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  type VARCHAR(50)
);

-- 6. Leaves Table
CREATE TABLE IF NOT EXISTS leaves (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  total_days INT DEFAULT 0,
  paid_days INT DEFAULT 0,
  lop_days INT DEFAULT 0,
  leave_type VARCHAR(50) DEFAULT 'Paid Leave',
  is_paid BOOLEAN DEFAULT 1,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 7. Time Claims (Corrections) Table
CREATE TABLE IF NOT EXISTS time_claims (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  date DATE NOT NULL,
  actual_login TIME,
  actual_logout TIME,
  reason TEXT,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 8. Performance Snapshots Table
CREATE TABLE IF NOT EXISTS performance_snapshots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  month_key VARCHAR(7) NOT NULL,
  score INT DEFAULT 0,
  attendance_rate DECIMAL(5,2) DEFAULT 0,
  punctuality_rate DECIMAL(5,2) DEFAULT 0,
  absent_days INT DEFAULT 0,
  late_days INT DEFAULT 0,
  short_hours_days INT DEFAULT 0,
  message TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_month (user_id, month_key),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 9. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Insert Default Admin
INSERT IGNORE INTO users (id, name, username, password, role, must_change_password) 
VALUES (1, 'Administrator', 'admin', 'password123', 'admin', 0);

-- Insert Sample Departments
INSERT IGNORE INTO departments (id, name, description) VALUES
(1, 'Engineering', 'Software and hardware development'),
(2, 'Human Resources', 'People management and recruitment'),
(3, 'Operations', 'Daily business operations');

-- Insert Sample Sections
INSERT IGNORE INTO sections (id, name, department_id, description) VALUES
(1, 'Frontend', 1, 'Web interface development'),
(2, 'Backend', 1, 'Server-side logic and databases'),
(3, 'Recruitment', 2, 'Hiring and onboarding');

-- Insert Sample Employees
INSERT IGNORE INTO users (id, name, username, password, role, department_id, section_id, must_change_password) VALUES
(2, 'John Doe', 'john.doe', 'password123', 'employee', 1, 1, 1),
(3, 'Jane Smith', 'jane.smith', 'password123', 'employee', 1, 2, 1),
(4, 'Robert Wilson', 'robert.w', 'password123', 'employee', 2, 3, 1);

-- Insert Sample Holidays
INSERT IGNORE INTO holidays (name, date, type) VALUES
('New Year Day', '2026-01-01', 'Public'),
('Republic Day', '2026-01-26', 'Public'),
('Independence Day', '2026-08-15', 'Public'),
('Christmas', '2026-12-25', 'Public');

-- Insert Sample Attendance for March 2026
INSERT IGNORE INTO attendance (user_id, date, login_time, logout_time, lunch_start, lunch_end, status) VALUES
(2, '2026-03-01', '09:00:00', '18:00:00', '13:00:00', '14:00:00', 'Present'),
(2, '2026-03-02', '09:15:00', '18:15:00', '13:00:00', '14:00:00', 'Present'),
(3, '2026-03-01', '08:55:00', '17:55:00', '13:00:00', '14:00:00', 'Present'),
(4, '2026-03-01', '09:45:00', '18:45:00', '13:00:00', '14:00:00', 'Late');
