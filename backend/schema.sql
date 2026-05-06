-- Database: attendance_db
CREATE DATABASE IF NOT EXISTS attendance_db;
USE attendance_db;

-- Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT
);

-- Sections Table
CREATE TABLE IF NOT EXISTS sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    department_id INT,
    description TEXT,
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Users Table (Employees)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'employee') DEFAULT 'employee',
    department_id INT,
    section_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (section_id) REFERENCES sections(id)
);

-- Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    date DATE NOT NULL,
    login_time TIME,
    lunch_start TIME,
    lunch_end TIME,
    logout_time TIME,
    status VARCHAR(50),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Leaves Table
CREATE TABLE IF NOT EXISTS leaves (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Holidays Table
CREATE TABLE IF NOT EXISTS holidays (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    type VARCHAR(50) DEFAULT 'National'
);

-- Seed Data
INSERT INTO departments (name, description) VALUES ('IT', 'Information Technology');
INSERT INTO departments (name, description) VALUES ('HR', 'Human Resources');

INSERT INTO sections (name, department_id, description) VALUES ('Development', 1, 'Software Development');

-- Admin User (password: password123)
-- Note: In a real app, use the hashed password from the Node.js server or a PHP hash function.
-- This is a placeholder for manual insertion if needed.
-- INSERT INTO users (username, name, password, role, department_id) VALUES ('milan', 'Milan Gangadiya', '$2a$10$...', 'admin', 1);
