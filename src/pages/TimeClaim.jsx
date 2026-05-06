import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isSunday, startOfWeek, endOfWeek, startOfDay, endOfDay, addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { apiFetch } from '../lib/api';

const TimeClaim = ({ selectedUser, currentUser }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewType, setViewType] = useState('Month');

  const isRestricted = currentUser?.role === 'employee' && selectedUser?.id !== currentUser?.id;

  useEffect(() => {
    if (selectedUser && !isRestricted) {
      fetchAttendance();
    }
  }, [selectedUser, currentDate, isRestricted, viewType]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const month = format(currentDate, 'MM');
      const year = format(currentDate, 'yyyy');
      console.log(`Fetching attendance for user ${selectedUser.id}, month ${month}, year ${year}`);
      const res = await apiFetch(`/attendance/${selectedUser.id}?month=${month}&year=${year}`);
      const data = await res.json();
      console.log('Fetched attendance data:', data);
      setAttendanceData(data);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isRestricted) {
    return (
      <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ backgroundColor: '#fef2f2', padding: '40px', borderRadius: '24px', border: '1px solid #fee2e2', textAlign: 'center', maxWidth: '400px' }}>
          <h2 style={{ color: '#dc2626', fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Entry Restricted</h2>
          <p style={{ color: '#991b1b' }}>You are not authorized to view time claims for other employees.</p>
        </div>
      </div>
    );
  }

  let days = [];
  if (viewType === 'Month') {
    days = eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate)
    });
  } else if (viewType === 'Week') {
    days = eachDayOfInterval({
      start: startOfWeek(currentDate, { weekStartsOn: 1 }),
      end: endOfWeek(currentDate, { weekStartsOn: 1 })
    });
  } else if (viewType === 'Day') {
    days = [startOfDay(currentDate)];
  } else {
    // Date Range - default to month for now
    days = eachDayOfInterval({
      start: startOfMonth(currentDate),
      end: endOfMonth(currentDate)
    });
  }

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = [2023, 2024, 2025, 2026];

  const handleMonthChange = (e) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(parseInt(e.target.value));
    setCurrentDate(newDate);
  };

  const handleYearChange = (e) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(parseInt(e.target.value));
    setCurrentDate(newDate);
  };

  const navigate = (direction) => {
    if (viewType === 'Month') {
      setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + direction, 1));
    } else if (viewType === 'Week') {
      setCurrentDate(prev => addDays(prev, direction * 7));
    } else if (viewType === 'Day') {
      setCurrentDate(prev => addDays(prev, direction));
    }
  };

  // Timeline Helper
  const getTimelinePosition = (timeStr) => {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    // Start timeline at 7 AM (420 mins)
    let totalMins = h * 60 + m;
    if (h < 7) totalMins += 24 * 60; // Handle next day early hours
    const startMins = 7 * 60;
    const endMins = (7 + 24) * 60;
    const percentage = ((totalMins - startMins) / (endMins - startMins)) * 100;
    return Math.max(0, Math.min(100, percentage));
  };

  const diffMins = (start, end) => {
    if (!start || !end) return 0;
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    if (diff < 0) diff += 24 * 60;
    return diff;
  };

  // Calculations for Summary
  let totalWorkMins = 0;
  let totalSpentMins = 0;

  days.forEach(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const att = attendanceData.find(a => a.date === dateStr);
    
    if (att && att.login_time && att.logout_time) {
      const spent = diffMins(att.login_time, att.logout_time);
      const lunch = diffMins(att.lunch_start, att.lunch_end);
      const work = spent - lunch;
      
      totalSpentMins += spent;
      totalWorkMins += Math.max(0, work);
    }
  });

  const formatMins = (mins) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const idleMins = Math.max(0, totalSpentMins - totalWorkMins);

  return (
    <div style={{ padding: '32px', backgroundColor: '#f8fafc', minHeight: '100%' }}>
      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '4px' }}>
            <button onClick={() => navigate(-1)} style={{ padding: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#64748b' }}><ChevronLeft size={20} /></button>
            <span style={{ padding: '0 12px', fontWeight: '700', color: '#1e293b', minWidth: '140px', textAlign: 'center' }}>
              {viewType === 'Month' ? format(currentDate, 'MMMM yyyy') : 
               viewType === 'Week' ? `Week of ${format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'dd MMM')}` :
               format(currentDate, 'dd MMM yyyy')}
            </span>
            <button onClick={() => navigate(1)} style={{ padding: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#64748b' }}><ChevronRight size={20} /></button>
          </div>
          
          <div style={{ display: 'flex', gap: '8px', backgroundColor: '#fff', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <select value={currentDate.getMonth()} onChange={handleMonthChange} style={{ padding: '8px 12px', border: 'none', backgroundColor: 'transparent', fontWeight: '600', outline: 'none' }}>
              {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select value={currentDate.getFullYear()} onChange={handleYearChange} style={{ padding: '8px 12px', border: 'none', backgroundColor: 'transparent', fontWeight: '600', outline: 'none' }}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', backgroundColor: '#fff', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          {['Day', 'Week', 'Month', 'Date Range'].map(t => (
            <button 
              key={t} 
              onClick={() => setViewType(t)}
              style={{ 
                padding: '8px 20px', 
                borderRadius: '8px', 
                border: 'none', 
                backgroundColor: viewType === t ? '#2563eb' : 'transparent', 
                color: viewType === t ? '#fff' : '#64748b', 
                fontWeight: '600', 
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', border: '4px solid #2563eb', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>Total Working Time</p>
          <p style={{ fontSize: '42px', fontWeight: '800', color: '#2563eb' }}>{formatMins(totalWorkMins)}</p>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', border: '4px solid #2563eb', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>Time Spent</p>
          <p style={{ fontSize: '42px', fontWeight: '800', color: '#2563eb' }}>{formatMins(totalSpentMins)}</p>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '16px', border: '4px solid #2563eb', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>Idle Time</p>
          <p style={{ fontSize: '42px', fontWeight: '800', color: '#2563eb' }}>{formatMins(idleMins)}</p>
        </div>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#2563eb', color: '#fff' }}>
              <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px' }}>Date</th>
              <th style={{ padding: '16px', textAlign: 'center', fontSize: '14px' }}>In Time</th>
              <th style={{ padding: '16px', textAlign: 'center', fontSize: '14px' }}>Finish</th>
              <th style={{ padding: '16px', textAlign: 'center', fontSize: '14px' }}>Work</th>
              <th style={{ padding: '16px', textAlign: 'center', fontSize: '14px' }}>Idle</th>
              <th style={{ padding: '16px', textAlign: 'left', width: '40%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '700' }}>
                  <span>7 AM</span><span>9 AM</span><span>11 AM</span><span>1 PM</span><span>3 PM</span><span>5 PM</span><span>7 PM</span><span>9 PM</span><span>11 PM</span><span>1 AM</span><span>3 AM</span><span>5 AM</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading records...</td></tr>
            ) : days.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No records found for this period.</td></tr>
            ) : days.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const att = attendanceData.find(a => a.date === dateStr);
              const isSun = isSunday(day);
              
              let workStr = "00:00";
              let idleStr = "00:00";
              let loginPos = 0, logoutPos = 0, lunchStartPos = 0, lunchEndPos = 0;

              if (att && att.login_time && att.logout_time) {
                const spent = diffMins(att.login_time, att.logout_time);
                const lunch = diffMins(att.lunch_start, att.lunch_end);
                const work = spent - lunch;
                
                workStr = formatMins(work);
                idleStr = formatMins(lunch);
                
                loginPos = getTimelinePosition(att.login_time);
                logoutPos = getTimelinePosition(att.logout_time);
                
                if (att.lunch_start && att.lunch_end) {
                  lunchStartPos = getTimelinePosition(att.lunch_start);
                  lunchEndPos = getTimelinePosition(att.lunch_end);
                }
              }

              return (
                <tr key={day.toISOString()} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px', fontSize: '14px', color: '#1e293b', fontWeight: '600' }}>{format(day, 'dd MMM yyyy EEE')}</td>
                  {isSun || !att ? (
                    <td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{isSun ? 'Sunday' : 'Absent'}</td>
                  ) : (
                    <>
                      <td style={{ padding: '16px', textAlign: 'center', fontSize: '14px', color: '#64748b' }}>{att.login_time}</td>
                      <td style={{ padding: '16px', textAlign: 'center', fontSize: '14px', color: '#64748b' }}>{att.logout_time}</td>
                      <td style={{ padding: '16px', textAlign: 'center', fontSize: '14px', color: '#1e293b', fontWeight: '700' }}>{workStr}</td>
                      <td style={{ padding: '16px', textAlign: 'center', fontSize: '14px', color: '#64748b' }}>{idleStr}</td>
                      <td style={{ padding: '16px', position: 'relative' }}>
                        <div style={{ height: '12px', backgroundColor: '#f1f5f9', borderRadius: '6px', width: '100%', position: 'relative', overflow: 'hidden' }}>
                          {/* Work Bar 1 */}
                          <div style={{ 
                            position: 'absolute', 
                            left: `${loginPos}%`, 
                            width: `${(att.lunch_start ? lunchStartPos : logoutPos) - loginPos}%`, 
                            height: '100%', 
                            backgroundColor: '#10b981' 
                          }} />
                          {/* Lunch Bar */}
                          {att.lunch_start && att.lunch_end && (
                            <div style={{ 
                              position: 'absolute', 
                              left: `${lunchStartPos}%`, 
                              width: `${lunchEndPos - lunchStartPos}%`, 
                              height: '100%', 
                              backgroundColor: '#ef4444' 
                            }} />
                          )}
                          {/* Work Bar 2 */}
                          {att.lunch_end && (
                            <div style={{ 
                              position: 'absolute', 
                              left: `${lunchEndPos}%`, 
                              width: `${logoutPos - lunchEndPos}%`, 
                              height: '100%', 
                              backgroundColor: '#10b981' 
                            }} />
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TimeClaim;
