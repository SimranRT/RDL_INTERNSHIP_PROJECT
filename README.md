# AttendIQ – Attendance Management System

This project is a full-stack attendance management system designed for RDL Technologies Pvt Ltd.

## 📁 Project Structure

- `src/`: React frontend application
- `backend/`: PHP backend for XAMPP deployment
- `public/`: Static assets

## 🚀 Setup Instructions

### Backend (XAMPP)
1. Start Apache and MySQL in XAMPP.
2. Import `backend/schema.sql` into phpMyAdmin.
3. Copy `backend/` contents to `htdocs/attendance-api/`.

### 🚀 Setup Instructions (VS Code & XAMPP)

Follow these steps to set up the project on your local machine.

#### 1. Prerequisites
- **Node.js**: Install from [nodejs.org](https://nodejs.org/).
- **XAMPP**: Install from [apachefriends.org](https://www.apachefriends.org/).
- **VS Code**: Install from [code.visualstudio.com](https://code.visualstudio.com/).

#### 2. Database Setup (XAMPP)
1. Open **XAMPP Control Panel** and start **Apache** and **MySQL**.
2. Go to `http://localhost/phpmyadmin`.
3. Create a new database named `attendance_db`.
4. Import the file `schema.sql` (located in the root directory) into this database.

#### 3. Project Configuration
1. Open the project folder in **VS Code**.
2. Open the terminal (`Ctrl + ` `).
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file in the root directory with your MySQL credentials:
   ```env
   DB_HOST=127.0.0.1
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=attendance_db
   ```
   *(Note: XAMPP default user is `root` with no password)*

#### 4. Running the Application
1. In the VS Code terminal, start the server:
   ```bash
   npm run dev
   ```
2. Open `http://localhost:3000` in your browser.

### 🔑 Login Credentials

You can use the following credentials to test the application:

#### Admin User (Full Access)
- **Username**: `admin`
- **Password**: `password123`

#### Sample Employee Users
- **Username**: `john.doe` | **Password**: `password123`
- **Username**: `jane.smith` | **Password**: `password123`
- **Username**: `robert.w` | **Password**: `password123`

*(Note: New users can be added by the Admin through the **Masters > User Management** tab)*

### 📊 Dataset Upload
You can upload datasets (Excel/CSV) through the **Masters > Dataset Upload** tab. The application will automatically parse the files and store the data in your local XAMPP MySQL database.

## 🛠 Tech Stack
- React 18
- PHP 8
- MySQL 8
- Recharts
