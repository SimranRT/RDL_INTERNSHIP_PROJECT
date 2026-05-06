import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import URLPage from './pages/URLPage';
import Report from './pages/Report';
import Masters from './pages/Masters';
import Team from './pages/Team';
import Holidays from './pages/Holidays';
import Leaves from './pages/Leaves';
import TimeClaims from './pages/TimeClaims';
import { LogIn } from 'lucide-react';

import { IS_ELECTRON } from './config';
import { apiFetch } from './lib/api';
import { clearSession, getStoredToken, getStoredUser, setSession } from './lib/auth';
import useResponsive from './hooks/useResponsive';

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: 'admin', password: 'password123' });
  const [registerForm, setRegisterForm] = useState({ name: '', username: '', password: '' });
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isMobile } = useResponsive();

  const refreshData = async () => {
    try {
      const res = await apiFetch('/users');
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      const usersList = Array.isArray(data) ? data : [];
      setUsers(usersList);
      
      // If employee, only allow selecting themselves
      if (currentUser?.role === 'employee') {
        const selfUser = usersList.find((user) => user.id === currentUser.id) || currentUser;
        setSelectedUser(selfUser);
      } else if (usersList.length > 0 && !selectedUser) {
        setSelectedUser(usersList[0]);
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
      setUsers([]);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      refreshData();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    const restoreSession = async () => {
      const token = getStoredToken();
      const storedUser = getStoredUser();
      if (!token || !storedUser) return;

      try {
        const res = await apiFetch('/me');
        if (!res.ok) {
          clearSession();
          return;
        }

        const data = await res.json();
        setCurrentUser(data.user || storedUser);
        setIsLoggedIn(true);
      } catch {
        clearSession();
      }
    };

    restoreSession();
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      const res = await apiFetch('/login', {
        method: 'POST',
        body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (res.ok) {
        setSession({ token: data.token, user: data.user });
        if (data.user.must_change_password) {
          setMustChangePassword(true);
          setCurrentUser(data.user);
        } else {
          setCurrentUser(data.user);
          setIsLoggedIn(true);
        }
      } else {
        setFeedback({ type: 'error', message: data.message || 'Login failed' });
      }
    } catch (error) {
      console.error('Login error:', error);
      setFeedback({ type: 'error', message: 'Could not connect to server' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setSelectedUser(null);
    setFeedback({ type: '', message: '' });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      const res = await apiFetch('/register', {
        method: 'POST',
        body: JSON.stringify(registerForm)
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Registration successful! Please login.' });
        setTimeout(() => {
          setIsRegistering(false);
          setLoginForm({ username: registerForm.username, password: registerForm.password });
          setFeedback({ type: '', message: '' });
        }, 2000);
      } else {
        setFeedback({ type: 'error', message: data.message || 'Registration failed' });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setFeedback({ type: 'error', message: 'Could not connect to server' });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: 'Passwords do not match' });
      return;
    }
    if (newPassword.length < 6) {
      setFeedback({ type: 'error', message: 'Password must be at least 6 characters' });
      return;
    }
    setIsLoading(true);
    try {
      const res = await apiFetch('/change-password', {
        method: 'POST',
        body: JSON.stringify({ userId: currentUser.id, newPassword })
      });
      if (res.ok) {
        setMustChangePassword(false);
        setIsLoggedIn(true);
        setFeedback({ type: 'success', message: 'Password changed successfully!' });
      } else {
        setFeedback({ type: 'error', message: 'Failed to update password' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Connection error' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoggedIn) {
    if (mustChangePassword) {
      return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', width: '100%', maxWidth: '400px', border: '1px solid #f3f4f6' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>Change Password</h1>
              <p style={{ color: '#6b7280' }}>For security, please update your password.</p>
            </div>
            
            {feedback.message && (
              <div style={{ padding: '12px', borderRadius: '12px', marginBottom: '24px', fontSize: '14px', textAlign: 'center', backgroundColor: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2', color: feedback.type === 'success' ? '#16a34a' : '#dc2626', border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
                {feedback.message}
              </div>
            )}

            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>New Password</label>
                <input type="password" required style={{ width: '100%', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '12px', outline: 'none' }} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Confirm Password</label>
                <input type="password" required style={{ width: '100%', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '12px', outline: 'none' }} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              </div>
              <button type="submit" disabled={isLoading} style={{ width: '100%', backgroundColor: '#2563eb', color: '#fff', padding: '14px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                {isLoading ? 'UPDATING...' : 'UPDATE PASSWORD'}
              </button>
            </form>
          </div>
        </div>
      );
    }
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <div style={{ backgroundColor: '#fff', padding: '40px', borderRadius: '24px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', width: '100%', maxWidth: '400px', border: '1px solid #f3f4f6' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ width: '64px', height: '64px', backgroundColor: '#2563eb', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '32px', fontWeight: 'bold', margin: '0 auto 16px', boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)' }}>
              R
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>RDL Technologies</h1>
            <p style={{ color: '#6b7280' }}>AttendIQ System</p>
            <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '8px' }}>{IS_ELECTRON ? 'Desktop Mode' : 'Web Mode'}</p>
          </div>

          {feedback.message && (
            <div style={{ 
              padding: '12px', 
              borderRadius: '12px', 
              marginBottom: '24px', 
              fontSize: '14px', 
              textAlign: 'center',
              backgroundColor: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2',
              color: feedback.type === 'success' ? '#16a34a' : '#dc2626',
              border: `1px solid ${feedback.type === 'success' ? '#bbf7d0' : '#fecaca'}`
            }}>
              {feedback.message}
            </div>
          )}
          
          {isRegistering ? (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Full Name</label>
                <input 
                  type="text" 
                  required
                  style={{ width: '100%', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '12px', outline: 'none' }}
                  placeholder="John Doe"
                  value={registerForm.name}
                  onChange={e => setRegisterForm({...registerForm, name: e.target.value})}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Username</label>
                <input 
                  type="text" 
                  required
                  style={{ width: '100%', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '12px', outline: 'none' }}
                  placeholder="johndoe"
                  value={registerForm.username}
                  onChange={e => setRegisterForm({...registerForm, username: e.target.value})}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Password</label>
                <input 
                  type="password" 
                  required
                  style={{ width: '100%', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '12px', outline: 'none' }}
                  placeholder="••••••••"
                  value={registerForm.password}
                  onChange={e => setRegisterForm({...registerForm, password: e.target.value})}
                />
              </div>
              <button 
                type="submit"
                disabled={isLoading}
                style={{ width: '100%', backgroundColor: isLoading ? '#93c5fd' : '#2563eb', color: '#fff', padding: '14px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer' }}
              >
                {isLoading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
              </button>
              <p style={{ textAlign: 'center', fontSize: '14px', color: '#6b7280' }}>
                Already have an account? <span onClick={() => setIsRegistering(false)} style={{ color: '#2563eb', cursor: 'pointer', fontWeight: '600' }}>Login</span>
              </p>
            </form>
          ) : (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Username</label>
                <input 
                  type="text" 
                  required
                  style={{ width: '100%', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '12px', outline: 'none' }}
                  placeholder="admin"
                  value={loginForm.username}
                  onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Password</label>
                <input 
                  type="password" 
                  required
                  style={{ width: '100%', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '12px', outline: 'none' }}
                  placeholder="••••••••"
                  value={loginForm.password}
                  onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                />
              </div>
              <button 
                type="submit"
                disabled={isLoading}
                style={{ width: '100%', backgroundColor: isLoading ? '#93c5fd' : '#2563eb', color: '#fff', padding: '14px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {isLoading ? 'LOGGING IN...' : (
                  <>
                    <LogIn size={20} />
                    LOGIN
                  </>
                )}
              </button>
              <p style={{ textAlign: 'center', fontSize: '14px', color: '#6b7280' }}>
                New user? <span onClick={() => setIsRegistering(true)} style={{ color: '#2563eb', cursor: 'pointer', fontWeight: '600' }}>Create an account</span>
              </p>
            </form>
          )}
        </div>
      </div>
    );
  }

  const handleSelectUser = (user) => {
    console.log('Setting selected user:', user);
    setSelectedUser(user);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <Router>
      <div className="app-shell">
        {isMobile && isSidebarOpen && (
          <div className="sidebar-backdrop" onClick={() => setIsSidebarOpen(false)} />
        )}
        <Sidebar 
          teamMembers={users} 
          selectedUser={selectedUser} 
          setSelectedUser={handleSelectUser} 
          currentUser={currentUser}
          isMobile={isMobile}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        
        <div className="app-main">
          <TopBar
            currentUser={currentUser}
            onLogout={handleLogout}
            isMobile={isMobile}
            onMenuToggle={() => setIsSidebarOpen(prev => !prev)}
          />
          
          <main className="page-scroll">
            <Routes>
              <Route path="/" element={<Dashboard currentUser={currentUser} />} />
              <Route path="/attendance" element={<Attendance selectedUser={selectedUser} currentUser={currentUser} />} />
              <Route path="/report" element={<Report selectedUser={selectedUser} currentUser={currentUser} />} />
              <Route path="/holidays" element={<Holidays currentUser={currentUser} />} />
              <Route path="/leaves" element={<Leaves currentUser={currentUser} />} />
              <Route path="/time-claims" element={<TimeClaims currentUser={currentUser} />} />
              <Route path="/masters" element={<Masters onDataChange={refreshData} currentUser={currentUser} />} />
              <Route path="/team" element={<Team employees={users} />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
};

export default App;
