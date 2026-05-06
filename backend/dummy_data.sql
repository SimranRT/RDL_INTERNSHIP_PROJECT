-- Dummy Data for AttendIQ
-- Database: attendance_db

USE attendance_db;

-- 1. Insert Departments
INSERT INTO departments (name, description) VALUES ('IT', 'Information Technology');
INSERT INTO departments (name, description) VALUES ('HR', 'Human Resources');
INSERT INTO departments (name, description) VALUES ('Finance', 'Finance and Accounts');

-- 2. Insert Sections
INSERT INTO sections (name, department_id, description) VALUES ('Development', 1, 'Software Development');
INSERT INTO sections (name, department_id, description) VALUES ('QA', 1, 'Quality Assurance');
INSERT INTO sections (name, department_id, description) VALUES ('Recruitment', 2, 'Talent Acquisition');

-- 3. Insert Users (Password is 'password123' for all)
-- Hashed password for 'password123': $2a$10$7v.X7E9vXb.YpY8vXb.YpY8v.X7E9vXb.YpY8vXb.YpY8v.X7E9vXb.Yp
-- Note: Replace with actual hashes if you want to test manual login.
-- Better yet, use the 'Create an account' feature in the app to get real hashes.
INSERT INTO users (username, name, password, role, department_id, section_id) VALUES 
('milan', 'Milan Gangadiya', '$2a$10$7v.X7E9vXb.YpY8vXb.YpY8v.X7E9vXb.YpY8vXb.YpY8v.X7E9vXb.Yp', 'admin', 1, 1),
('john_doe', 'John Doe', '$2a$10$7v.X7E9vXb.YpY8vXb.YpY8v.X7E9vXb.YpY8vXb.YpY8v.X7E9vXb.Yp', 'employee', 1, 1),
('jane_smith', 'Jane Smith', '$2a$10$7v.X7E9vXb.YpY8vXb.YpY8v.X7E9vXb.YpY8vXb.YpY8v.X7E9vXb.Yp', 'employee', 2, 3);

-- 4. Insert Sample Attendance
INSERT INTO attendance (user_id, date, login_time, logout_time, status) VALUES 
(1, '2025-10-01', '09:00:00', '18:00:00', 'Present'),
(1, '2025-10-02', '09:15:00', '18:10:00', 'Present'),
(2, '2025-10-01', '09:35:00', '18:30:00', 'Late'),
(3, '2025-10-01', '08:55:00', '17:50:00', 'Present');

-- 5. Insert Sample Holidays
INSERT INTO holidays (name, date, type) VALUES 
('Republic Day', '2025-01-26', 'National'),
('Independence Day', '2025-08-15', 'National'),
('Gandhi Jayanti', '2025-10-02', 'National');
