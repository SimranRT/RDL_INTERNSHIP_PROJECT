import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Clock, LogIn, LogOut, Coffee, ClipboardList, Users, UserCheck, UserX, AlertCircle } from 'lucide-react';
import { IS_ELECTRON } from '../config';
import { apiFetch } from '../lib/api';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import useResponsive from '../hooks/useResponsive';

const Dashboard = ({ currentUser }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [holidays, setHolidays] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [stats, setStats] = useState([
    { name: 'Present', value: 0, color: '#22c55e' },
    { name: 'Absent', value: 0, color: '#ef4444' },
    { name: 'Late', value: 0, color: '#f59e0b' },
    { name: 'On Leave', value: 0, color: '#3b82f6' },
  ]);
  const [realtimeStatus, setRealtimeStatus] = useState([]);
  const [latestDate, setLatestDate] = useState('');

  const [notifications, setNotifications] = useState([]);
  const [desktopInfo, setDesktopInfo] = useState(null);
  const { isMobile, isTablet } = useResponsive();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    fetchHolidays();
    fetchLeaves();
    fetchStats();
    fetchRealtimeStatus();
    fetchNotifications();
    if (window.electronAPI?.getVersions) {
      window.electronAPI.getVersions().then(setDesktopInfo).catch(() => setDesktopInfo(null));
    }
    return () => clearInterval(timer);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await apiFetch(`/notifications/${currentUser.id}`);
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await apiFetch('/dashboard-stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      
      if (!data || !data.today || !data.latest) {
        console.warn('Incomplete stats data received');
        return;
      }

      // Use latest data if today's is empty
      const source = (data.today.present > 0 || data.today.late > 0) ? data.today : data.latest;
      
      if (source) {
        setStats([
          { name: 'Present', value: source.present || 0, color: '#22c55e' },
          { name: 'Absent', value: source.absent || 0, color: '#ef4444' },
          { name: 'Late', value: source.late || 0, color: '#f59e0b' },
          { name: 'On Leave', value: source.onLeave || 0, color: '#3b82f6' },
        ]);
        setLatestDate(source.date || '');
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchRealtimeStatus = async () => {
    try {
      const res = await apiFetch('/realtime-status');
      const data = await res.json();
      setRealtimeStatus(data.status);
    } catch (error) {
      console.error('Failed to fetch realtime status:', error);
    }
  };

  const fetchLeaves = async () => {
    try {
      const res = await apiFetch(`/leaves/${currentUser.id}`);
      const data = await res.json();
      setLeaves(data.slice(0, 3)); // Show latest 3
    } catch (error) {
      console.error('Failed to fetch leaves:', error);
    }
  };

  const fetchHolidays = async () => {
    try {
      const res = await apiFetch('/holidays');
      const data = await res.json();
      // Filter for upcoming holidays
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const upcoming = data.filter(h => new Date(h.date) >= today).slice(0, 3);
      setHolidays(upcoming);
    } catch (error) {
      console.error('Failed to fetch holidays:', error);
    }
  };

  return (
    <div className="responsive-page" style={{ backgroundColor: '#f8fafc', minHeight: '100%' }}>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'flex-start', gap: '20px', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.03em' }}>Welcome back, {currentUser?.name}!</h2>
          <p style={{ color: '#64748b', marginTop: '6px', fontSize: '18px', fontWeight: '500' }}>
            Real-time overview for <span style={{ color: '#2563eb', fontWeight: '700' }}>{latestDate ? format(new Date(latestDate), 'MMMM dd, yyyy') : 'Today'}</span>
          </p>
          {IS_ELECTRON && desktopInfo && (
            <p style={{ color: '#94a3b8', marginTop: '8px', fontSize: '12px' }}>
              Desktop runtime: Electron {desktopInfo.electron} / Node {desktopInfo.node}
            </p>
          )}
        </div>
        
        <div style={{ 
          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', 
          padding: isMobile ? '20px 24px' : '24px 32px', 
          borderRadius: '24px', 
          boxShadow: '0 20px 25px -5px rgba(37, 99, 235, 0.2)', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          gap: '4px', 
          minWidth: isMobile ? '100%' : '240px',
          color: '#fff'
        }}>
          <p style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8 }}>Current Time</p>
          <p style={{ fontSize: '42px', fontWeight: '900', letterSpacing: '-0.02em', margin: '4px 0' }}>{format(currentTime, 'HH:mm:ss')}</p>
          <p style={{ fontSize: '16px', fontWeight: '500', opacity: 0.9 }}>{format(currentTime, 'EEEE, MMM dd')}</p>
        </div>
      </div>
      
      {/* Notifications Section */}
      {notifications.some(n => !n.is_read) && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <AlertCircle size={24} color="#2563eb" />
            <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>Recent Notifications</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {notifications.filter(n => !n.is_read).map(notification => (
              <div 
                key={notification.id} 
                onClick={() => markAsRead(notification.id)}
                style={{ 
                  backgroundColor: '#eff6ff', 
                  padding: '16px 24px', 
                  borderRadius: '16px', 
                  borderLeft: '4px solid #2563eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'transform 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563eb' }}></div>
                  <p style={{ color: '#1e40af', fontWeight: '600', fontSize: '15px' }}>{notification.message}</p>
                </div>
                <span style={{ fontSize: '12px', color: '#60a5fa', fontWeight: '500' }}>
                  {format(new Date(notification.created_at), 'MMM dd, HH:mm')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentUser?.role === 'employee' && (
        <div style={{ marginBottom: '32px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '16px' }}>
          <Link
            to="/leaves"
            style={{
              textDecoration: 'none',
              backgroundColor: '#2563eb',
              color: '#fff',
              padding: '14px 20px',
              borderRadius: '14px',
              fontWeight: '700',
              boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.2)'
            }}
          >
            Apply Leave
          </Link>
          <Link
            to="/report"
            style={{
              textDecoration: 'none',
              backgroundColor: '#fff',
              color: '#2563eb',
              padding: '14px 20px',
              borderRadius: '14px',
              fontWeight: '700',
              border: '1px solid #bfdbfe'
            }}
          >
            View Report
          </Link>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
        {stats.map(item => (
          <div key={item.name} style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)', display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '20px', backgroundColor: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color }}>
              {item.name === 'Present' && <UserCheck size={32} />}
              {item.name === 'Absent' && <UserX size={32} />}
              {item.name === 'Late' && <Clock size={32} />}
              {item.name === 'On Leave' && <ClipboardList size={32} />}
            </div>
            <div>
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.name}</p>
              <p style={{ fontSize: '40px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.02em' }}>{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: '32px', marginBottom: '32px' }}>
        <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>Real-time Status</h3>
            <span style={{ fontSize: '12px', padding: '6px 12px', backgroundColor: '#f1f5f9', borderRadius: '100px', fontWeight: '600', color: '#64748b' }}>{realtimeStatus.length} Employees</span>
          </div>
          <div className="responsive-table-wrap">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #f1f5f9' }}>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Employee</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Dept</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>In Time</th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {realtimeStatus.slice(0, 8).map((emp, idx) => (
                  <tr key={`${emp.id}-${idx}`} style={{ borderBottom: idx === realtimeStatus.length - 1 ? 'none' : '1px solid #f8fafc' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: '#64748b', fontSize: '14px' }}>
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b' }}>{emp.name}</p>
                          <p style={{ fontSize: '12px', color: '#94a3b8' }}>{emp.username}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#64748b' }}>{emp.department || 'N/A'}</td>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#1e293b', fontWeight: '600' }}>{emp.login_time || '--:--'}</td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: '100px', 
                        fontSize: '11px', 
                        fontWeight: '700', 
                        textTransform: 'uppercase',
                        backgroundColor: emp.status === 'Present' ? '#f0fdf4' : emp.status === 'Late' ? '#fefce8' : emp.status === 'Absent' ? '#fef2f2' : '#f1f5f9',
                        color: emp.status === 'Present' ? '#16a34a' : emp.status === 'Late' ? '#ca8a04' : emp.status === 'Absent' ? '#dc2626' : '#64748b'
                      }}>
                        {emp.status || 'Unknown'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#0f172a', marginBottom: '24px' }}>Attendance Distribution</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: '600' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: '600' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }} />
                <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={50}>
                  {stats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '32px' }}>
        <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '24px' }}>Upcoming Holidays</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {holidays.length > 0 ? holidays.map((holiday, index) => (
              <div key={`${holiday.id}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '16px' }}>
                <div style={{ width: '48px', height: '48px', backgroundColor: '#eff6ff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                  <Clock size={24} />
                </div>
                <div>
                  <p style={{ fontWeight: '800', fontSize: '14px', color: '#1e293b' }}>{holiday.name}</p>
                  <p style={{ fontSize: '12px', color: '#64748b' }}>{new Date(holiday.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
              </div>
            )) : (
              <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '14px', padding: '24px' }}>No upcoming holidays</p>
            )}
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', marginBottom: '24px' }}>Leave Status</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {leaves.length > 0 ? leaves.map((leave, index) => (
              <div key={`${leave.id}-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '16px' }}>
                <div style={{ 
                  width: '48px', 
                  height: '48px', 
                  backgroundColor: leave.status === 'approved' ? '#f0fdf4' : leave.status === 'rejected' ? '#fef2f2' : '#fefce8', 
                  borderRadius: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: leave.status === 'approved' ? '#16a34a' : leave.status === 'rejected' ? '#dc2626' : '#ca8a04' 
                }}>
                  <ClipboardList size={24} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ fontWeight: '800', fontSize: '14px', color: '#1e293b' }}>{format(new Date(leave.start_date), 'dd MMM')} - {format(new Date(leave.end_date), 'dd MMM')}</p>
                    <span style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', color: leave.status === 'approved' ? '#16a34a' : leave.status === 'rejected' ? '#dc2626' : '#ca8a04' }}>{leave.status}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{leave.reason}</p>
                </div>
              </div>
            )) : (
              <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '14px', padding: '24px' }}>No leave requests</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
