import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, AlertCircle, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSunday, isSameMonth } from 'date-fns';

import { apiFetch } from '../lib/api';
import useResponsive from '../hooks/useResponsive';

const Attendance = ({ selectedUser, currentUser }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimData, setClaimData] = useState({ date: '', actualLogin: '', actualLogout: '', reason: '' });
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [claims, setClaims] = useState([]);
  const [latestDataInfo, setLatestDataInfo] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  const { isMobile, isTablet } = useResponsive();

  const fetchLatestInfo = async () => {
    if (!selectedUser) return;
    try {
      const res = await apiFetch('/dashboard-stats');
      if (res.ok) {
        const data = await res.json();
        if (data.latest && data.latest.date) {
          setLatestDataInfo(data.latest.date);
        }
      }
    } catch (error) {
      console.error('Failed to fetch latest info:', error);
    }
  };

  const isRestricted = currentUser?.role === 'employee' && selectedUser?.id !== currentUser?.id;

  useEffect(() => {
    fetchHolidays();
  }, []);

  useEffect(() => {
    if (selectedUser && !isRestricted) {
      fetchAttendance();
      fetchClaims();
      fetchLatestInfo();
    }
  }, [selectedUser, currentDate, isRestricted]);

  const fetchClaims = async () => {
    try {
      const res = await apiFetch(`/time-claims?userId=${selectedUser.id}`);
      const data = await res.json();
      setClaims(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch claims:', error);
      setClaims([]);
    }
  };

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const month = format(currentDate, 'MM');
      const year = format(currentDate, 'yyyy');
      const res = await apiFetch(`/attendance/${selectedUser.id}?month=${month}&year=${year}`);
      const data = await res.json();
      setAttendanceData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchHolidays = async () => {
    try {
      const res = await apiFetch('/holidays');
      const data = await res.json();
      setHolidays(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch holidays:', error);
      setHolidays([]);
    }
  };

  const getHolidayForDay = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return holidays.find((h) => h.date === dateStr);
  };

  if (isRestricted) {
    return (
      <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ backgroundColor: '#fef2f2', padding: '40px', borderRadius: '24px', border: '1px solid #fee2e2', textAlign: 'center', maxWidth: '400px' }}>
          <h2 style={{ color: '#dc2626', fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Entry Restricted</h2>
          <p style={{ color: '#991b1b' }}>You are not authorized to view attendance records for other employees.</p>
        </div>
      </div>
    );
  }

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  const getAttendanceForDay = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return attendanceData.find((a) => {
      const aDate = typeof a.date === 'string' ? a.date.split('T')[0] : format(new Date(a.date), 'yyyy-MM-dd');
      return aDate === dateStr;
    });
  };

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

  const jumpToLatest = () => {
    if (latestDataInfo) {
      setCurrentDate(new Date(latestDataInfo));
    }
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch('/time-claims', {
        method: 'POST',
        body: JSON.stringify({ ...claimData, userId: selectedUser.id })
      });
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Claim submitted successfully!' });
        setTimeout(() => {
          setIsClaimModalOpen(false);
          setClaimData({ date: '', actualLogin: '', actualLogout: '', reason: '' });
          setFeedback({ type: '', message: '' });
          fetchClaims();
        }, 2000);
      } else {
        setFeedback({ type: 'error', message: 'Failed to submit claim' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Connection error' });
    } finally {
      setLoading(false);
    }
  };

  const openClaimModal = (day) => {
    setClaimData({ ...claimData, date: format(day, 'yyyy-MM-dd') });
    setIsClaimModalOpen(true);
  };

  const getClaimForDay = (day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    return claims.find(c => c.date === dateStr);
  };

  return (
    <div className="responsive-page">
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.025em' }}>Attendance Log</h2>
          <p style={{ color: '#64748b', marginTop: '4px' }}>Daily records for <span style={{ fontWeight: '700', color: '#2563eb' }}>{selectedUser?.name}</span></p>
        </div>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', gap: '12px', width: isMobile ? '100%' : 'auto' }}>
          {currentUser?.role === 'admin' && (
            <button 
              onClick={() => setShowDebug(!showDebug)}
              style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '12px', border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}
            >
              {showDebug ? 'HIDE DEBUG' : 'DEBUG DATA'}
            </button>
          )}
          {latestDataInfo && !isSameMonth(new Date(latestDataInfo), currentDate) && (
            <button 
              onClick={jumpToLatest}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '12px', border: '1px solid #fde68a', cursor: 'pointer', fontSize: '12px', fontWeight: '700' }}
            >
              <AlertCircle size={16} />
              JUMP TO LATEST ({format(new Date(latestDataInfo), 'MMM yyyy')})
            </button>
          )}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: '12px', backgroundColor: '#fff', padding: '8px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)', width: isMobile ? '100%' : 'auto' }}>
            <select 
              value={currentDate.getMonth()} 
              onChange={handleMonthChange}
              style={{ padding: '8px 16px', borderRadius: '12px', border: 'none', backgroundColor: '#f8fafc', fontWeight: '700', color: '#1e293b', outline: 'none', cursor: 'pointer' }}
            >
              {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select 
              value={currentDate.getFullYear()} 
              onChange={handleYearChange}
              style={{ padding: '8px 16px', borderRadius: '12px', border: 'none', backgroundColor: '#f8fafc', fontWeight: '700', color: '#1e293b', outline: 'none', cursor: 'pointer' }}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {showDebug && (
        <div style={{ backgroundColor: '#1e293b', color: '#cbd5e1', padding: '24px', borderRadius: '16px', marginBottom: '32px', fontSize: '12px', overflowX: 'auto' }}>
          <h4 style={{ color: '#fff', marginBottom: '12px', fontSize: '14px' }}>Debug: Raw Attendance Data for {format(currentDate, 'MMM yyyy')}</h4>
          <pre>{JSON.stringify(attendanceData, null, 2)}</pre>
        </div>
      )}

      <div style={{ backgroundColor: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)' }}>
        <div className="responsive-table-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
              <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Login 1</th>
              <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Logout 1</th>
              <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Login 2</th>
              <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Logout 2</th>
              <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overtime</th>
              <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: '14px', color: '#1e293b' }}>
            {days.map((day, index) => {
              const att = getAttendanceForDay(day);
              const holiday = getHolidayForDay(day);
              const isSun = isSunday(day);
              const claim = getClaimForDay(day);
              
              return (
                <tr key={`${day.toISOString()}-${index}`} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: isSun || holiday ? '#f8fafc' : 'transparent' }}>
                  <td style={{ padding: '16px 24px', fontWeight: '600', color: '#0f172a' }}>{format(day, 'dd MMM yyyy')} <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: '500' }}>{format(day, 'EEE')}</span></td>
                  {isSun || holiday || (!att && !claim) ? (
                    <td colSpan={6} style={{ padding: '16px 24px', textAlign: 'center' }}>
                      {isSun ? (
                        <span style={{ color: '#94a3b8', fontWeight: '600' }}>Sunday</span>
                      ) : holiday ? (
                        <span style={{ color: '#16a34a', fontWeight: '700', backgroundColor: '#f0fdf4', padding: '4px 12px', borderRadius: '100px' }}>{holiday.name}</span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <span style={{ color: '#94a3b8' }}>No Record</span>
                          {currentUser?.role === 'employee' && (
                            <button onClick={() => openClaimModal(day)} style={{ padding: '4px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#fff', fontSize: '11px', fontWeight: '700', color: '#2563eb', cursor: 'pointer' }}>Claim</button>
                          )}
                        </div>
                      )}
                    </td>
                  ) : (
                    <>
                      <td style={{ padding: '16px 24px' }}>{att?.login_time || '--'}</td>
                      <td style={{ padding: '16px 24px' }}>{att?.lunch_start || '--'}</td>
                      <td style={{ padding: '16px 24px' }}>{att?.lunch_end || '--'}</td>
                      <td style={{ padding: '16px 24px' }}>{att?.logout_time || '--'}</td>
                      <td style={{ padding: '16px 24px', fontWeight: '700', color: att?.overtime && att?.overtime !== '00:00' ? '#dc2626' : '#1e293b' }}>{att?.overtime || '00:00'}</td>
                      <td style={{ padding: '16px 24px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <span style={{ 
                            padding: '4px 12px', 
                            borderRadius: '100px', 
                            fontSize: '11px', 
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            backgroundColor: att?.status === 'Present' ? '#f0fdf4' : att?.status === 'Late' ? '#fefce8' : '#f1f5f9',
                            color: att?.status === 'Present' ? '#16a34a' : att?.status === 'Late' ? '#ca8a04' : '#64748b'
                          }}>{att?.status || 'Pending'}</span>
                          
                          {currentUser?.role === 'employee' && !claim && (
                            <button 
                              onClick={() => openClaimModal(day)}
                              style={{ padding: '4px', borderRadius: '6px', border: 'none', backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'pointer' }}
                              title="Claim Correction"
                            >
                              <Clock size={14} />
                            </button>
                          )}
                          
                          {claim && (
                            <div 
                              title={`Claim: ${claim.status}`} 
                              style={{ 
                                width: '10px', 
                                height: '10px', 
                                borderRadius: '50%', 
                                backgroundColor: claim.status === 'approved' ? '#16a34a' : claim.status === 'rejected' ? '#dc2626' : '#f59e0b',
                                border: '2px solid #fff',
                                boxShadow: '0 0 0 1px #e2e8f0'
                              }} 
                            />
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

      {isClaimModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: isMobile ? '24px 16px' : '32px', borderRadius: '24px', width: 'calc(100% - 24px)', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>Submit Time Claim</h3>
            {feedback.message && (
              <div style={{ padding: '12px', borderRadius: '12px', marginBottom: '16px', fontSize: '14px', textAlign: 'center', backgroundColor: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2', color: feedback.type === 'success' ? '#16a34a' : '#dc2626' }}>
                {feedback.message}
              </div>
            )}
            <form onSubmit={handleClaimSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Date</label>
                <input type="text" disabled value={claimData.date} style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#f9fafb' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Actual Login</label>
                  <input type="time" required value={claimData.actualLogin} onChange={e => setClaimData({...claimData, actualLogin: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Actual Logout</label>
                  <input type="time" required value={claimData.actualLogout} onChange={e => setClaimData({...claimData, actualLogout: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>Reason</label>
                <textarea required value={claimData.reason} onChange={e => setClaimData({...claimData, reason: e.target.value})} style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', minHeight: '80px' }} placeholder="Why are you claiming this correction?" />
              </div>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsClaimModalOpen(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#fff', fontWeight: '600' }}>Cancel</button>
                <button type="submit" disabled={loading} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontWeight: '600' }}>
                  {loading ? 'Submitting...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
