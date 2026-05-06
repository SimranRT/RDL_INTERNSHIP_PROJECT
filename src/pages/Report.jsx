import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isSameMonth } from 'date-fns';
import { AlertCircle, Download } from 'lucide-react';
import { apiFetch } from '../lib/api';
import useResponsive from '../hooks/useResponsive';

const Report = ({ selectedUser, currentUser }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewType, setViewType] = useState('Month');
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
    if (selectedUser && !isRestricted) {
      fetchAttendance();
      fetchPerformance();
      fetchLatestInfo();
    }
  }, [selectedUser, currentDate, isRestricted]);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const month = format(currentDate, 'MM');
      const year = format(currentDate, 'yyyy');
      const res = await apiFetch(`/attendance/${selectedUser.id}?month=${month}&year=${year}`);
      if (!res.ok) throw new Error('Failed to fetch attendance');
      const data = await res.json();
      setAttendanceData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
      setAttendanceData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPerformance = async () => {
    try {
      const month = format(currentDate, 'MM');
      const year = format(currentDate, 'yyyy');
      const res = await apiFetch(`/performance/${selectedUser.id}?month=${month}&year=${year}`);
      if (!res.ok) throw new Error('Failed to fetch performance');
      const data = await res.json();
      setPerformance(data);
    } catch (error) {
      console.error('Failed to fetch performance:', error);
      setPerformance(null);
    }
  };

  if (isRestricted) {
    return (
      <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ backgroundColor: '#fef2f2', padding: '40px', borderRadius: '24px', border: '1px solid #fee2e2', textAlign: 'center', maxWidth: '400px' }}>
          <h2 style={{ color: '#dc2626', fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Entry Restricted</h2>
          <p style={{ color: '#991b1b' }}>You are not authorized to view reports for other employees.</p>
        </div>
      </div>
    );
  }

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate)
  });

  const chartData = days.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const att = Array.isArray(attendanceData) ? attendanceData.find(a => {
      const aDate = typeof a.date === 'string' ? a.date.split('T')[0] : format(new Date(a.date), 'yyyy-MM-dd');
      return aDate === dateStr;
    }) : null;
    let workingHours = 0;
    let spentHours = 0;
    let label = "00m";
    
    if (att && att.login_time && att.logout_time) {
      try {
        const parseTime = (timeStr) => {
          if (!timeStr || timeStr === '--') return [0, 0];
          const parts = timeStr.split(':').map(Number);
          return [parts[0] || 0, parts[1] || 0];
        };

        const [h1, m1] = parseTime(att.login_time);
        const [h2, m2] = parseTime(att.logout_time);
        
        const loginMins = h1 * 60 + m1;
        const logoutMins = h2 * 60 + m2;
        
        let totalSpentMins = logoutMins - loginMins;
        spentHours = Math.max(0, totalSpentMins / 60);

        let workingMins = totalSpentMins;
        
        // Subtract lunch if exists
        if (att.lunch_start && att.lunch_end && att.lunch_start !== '--' && att.lunch_end !== '--') {
          const [lsH, lsM] = parseTime(att.lunch_start);
          const [leH, leM] = parseTime(att.lunch_end);
          const lunchStartMins = lsH * 60 + lsM;
          const lunchEndMins = leH * 60 + leM;
          
          // Working time = (Lunch Start - Login) + (Logout - Lunch End)
          if (lunchStartMins >= loginMins && lunchEndMins <= logoutMins) {
            workingMins = Math.max(0, (lunchStartMins - loginMins) + (logoutMins - lunchEndMins));
          }
        }
        
        workingHours = Math.max(0, workingMins / 60);
        const h = Math.floor(workingMins / 60);
        const m = Math.round(workingMins % 60);
        label = h > 0 ? `${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m` : `${m}m`;
      } catch (e) {
        console.error('Error calculating hours:', e);
      }
    }
    
    return {
      day: format(day, 'dd'),
      hours: parseFloat(workingHours.toFixed(2)),
      spentHours: parseFloat(spentHours.toFixed(2)),
      idleHours: parseFloat(Math.max(0, spentHours - workingHours).toFixed(2)),
      label: workingHours > 0 ? label : "00m",
      fullDate: format(day, 'dd MMM yyyy')
    };
  });

  const totalWorkingMinutes = chartData.reduce((acc, curr) => acc + (Number(curr.hours) * 60), 0);
  const totalWorkingHours = Math.floor(totalWorkingMinutes / 60);
  const remainingWorkingMinutes = Math.round(totalWorkingMinutes % 60);

  const totalSpentMinutes = chartData.reduce((acc, curr) => acc + (Number(curr.spentHours) * 60), 0);
  const totalSpentHours = Math.floor(totalSpentMinutes / 60);
  const remainingSpentMinutes = Math.round(totalSpentMinutes % 60);

  const totalIdleMinutes = Math.max(0, totalSpentMinutes - totalWorkingMinutes);
  const totalIdleHours = Math.floor(totalIdleMinutes / 60);
  const remainingIdleMinutes = Math.round(totalIdleMinutes % 60);

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

  const renderCustomBarLabel = ({ x, y, width, value, index }) => {
    const data = chartData[index];
    return (
      <text 
        x={x + width / 2} 
        y={y - 10} 
        fill="#64748b" 
        textAnchor="middle" 
        dominantBaseline="middle"
        style={{ fontSize: '10px', fontWeight: '600' }}
      >
        {data.label}
      </text>
    );
  };

  return (
    <div className="responsive-page" style={{ backgroundColor: '#f8fafc', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ backgroundColor: '#2563eb', color: '#fff', padding: isMobile ? '20px' : '24px 32px', borderRadius: '16px', marginBottom: '32px', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '28px', fontWeight: '800' }}>{selectedUser?.name || 'Milan Gangadiya'}</h2>
          <p style={{ fontSize: '14px', opacity: 0.8 }}>Employee ID: {selectedUser?.username || 'N/A'}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px', width: isMobile ? '100%' : 'auto' }}>
          {currentUser?.role === 'admin' && (
            <button 
              onClick={() => setShowDebug(!showDebug)}
              style={{ padding: '10px 16px', backgroundColor: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
            >
              {showDebug ? 'HIDE DEBUG' : 'DEBUG DATA'}
            </button>
          )}
          {latestDataInfo && !isSameMonth(new Date(latestDataInfo), currentDate) && (
            <button 
              onClick={jumpToLatest}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: '12px', border: '1px solid #fde68a', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
            >
              <AlertCircle size={18} />
              JUMP TO LATEST DATA ({format(new Date(latestDataInfo), 'MMM yyyy')})
            </button>
          )}
        </div>
      </div>

      {showDebug && (
        <div style={{ backgroundColor: '#1e293b', color: '#cbd5e1', padding: '24px', borderRadius: '16px', marginBottom: '32px', fontSize: '12px', overflowX: 'auto' }}>
          <h4 style={{ color: '#fff', marginBottom: '12px', fontSize: '14px' }}>Debug: Raw Attendance Data for {format(currentDate, 'MMM yyyy')}</h4>
          <pre>{JSON.stringify(attendanceData, null, 2)}</pre>
        </div>
      )}

      {/* Navigation and Filters */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '32px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', backgroundColor: '#fff', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          {['Day', 'Week', 'Month', 'Date Range'].map(type => (
            <button
              key={type}
              onClick={() => setViewType(type)}
              style={{
                padding: '8px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: viewType === type ? '#2563eb' : 'transparent',
                color: viewType === type ? '#fff' : '#64748b',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {type}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '8px', backgroundColor: '#fff', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0', width: isMobile ? '100%' : 'auto' }}>
            <select 
              value={currentDate.getMonth()} 
              onChange={handleMonthChange}
              style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', fontWeight: '600', outline: 'none', color: '#1e293b' }}
            >
              {months.map((m, i) => <option key={m} value={i}>{m}</option>)}
            </select>
            <select 
              value={currentDate.getFullYear()} 
              onChange={handleYearChange}
              style={{ padding: '8px 12px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', fontWeight: '600', outline: 'none', color: '#1e293b' }}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
        <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0', textAlign: 'center', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
          <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Working Time</p>
          <p style={{ fontSize: '48px', fontWeight: '800', color: '#2563eb' }}>{totalWorkingHours}:{remainingWorkingMinutes.toString().padStart(2, '0')}</p>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0', textAlign: 'center', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
          <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time Spent</p>
          <p style={{ fontSize: '48px', fontWeight: '800', color: '#1e2937' }}>{totalSpentHours}:{remainingSpentMinutes.toString().padStart(2, '0')}</p>
        </div>
        <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0', textAlign: 'center', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
          <p style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Idle Time</p>
          <p style={{ fontSize: '48px', fontWeight: '800', color: '#64748b' }}>{totalIdleHours}:{remainingIdleMinutes.toString().padStart(2, '0')}</p>
        </div>
      </div>

      {performance && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : '1.2fr 1fr 1fr 1fr', gap: '24px', marginBottom: '32px' }}>
          <div style={{ backgroundColor: '#0f172a', color: '#fff', padding: '28px', borderRadius: '24px', border: '1px solid #1e293b' }}>
            <p style={{ fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.7, marginBottom: '12px' }}>Performance Score</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '12px' }}>
              <span style={{ fontSize: '54px', fontWeight: '900', lineHeight: 1 }}>{performance.score}</span>
              <span style={{ fontSize: '18px', opacity: 0.75 }}>/100</span>
            </div>
            <p style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>{performance.rating}</p>
            <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#cbd5e1' }}>{performance.message}</p>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '28px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
            <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '10px' }}>Attendance Rate</p>
            <p style={{ fontSize: '42px', fontWeight: '800', color: '#2563eb', marginBottom: '8px' }}>{performance.attendance_rate}%</p>
            <p style={{ fontSize: '14px', color: '#64748b' }}>{performance.present_days} present day(s) out of {performance.working_days} working day(s)</p>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '28px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
            <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '10px' }}>Punctuality</p>
            <p style={{ fontSize: '42px', fontWeight: '800', color: '#16a34a', marginBottom: '8px' }}>{performance.punctuality_rate}%</p>
            <p style={{ fontSize: '14px', color: '#64748b' }}>{performance.late_days} late day(s) this month</p>
          </div>

          <div style={{ backgroundColor: '#fff', padding: '28px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
            <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '10px' }}>Risk Factors</p>
            <p style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '10px' }}>Absent: {performance.absent_days}</p>
            <p style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b', marginBottom: '10px' }}>Short Hours: {performance.short_hours_days}</p>
            <p style={{ fontSize: '14px', color: '#64748b' }}>LOP days: {performance.leave_overview?.lop_days || 0}</p>
          </div>
        </div>
      )}

      {/* Monthly Total Prominent Display */}
      <div style={{ backgroundColor: '#fff', padding: isMobile ? '24px' : '40px', borderRadius: '24px', border: '1px solid #e2e8f0', marginBottom: '32px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', gap: '16px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>Monthly Working Summary</h3>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Total accumulated hours for {months[currentDate.getMonth()]} {currentDate.getFullYear()}</p>
        </div>
        <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
          <p style={{ fontSize: '14px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Total Hours Worked</p>
          <p style={{ fontSize: isMobile ? '42px' : '64px', fontWeight: '900', color: '#2563eb', lineHeight: '1' }}>{totalWorkingHours}<span style={{ fontSize: '24px', fontWeight: '700', color: '#94a3b8', marginLeft: '4px' }}>h</span> {remainingWorkingMinutes}<span style={{ fontSize: '24px', fontWeight: '700', color: '#94a3b8', marginLeft: '4px' }}>m</span></p>
        </div>
      </div>

      {/* Chart Card */}
      <div style={{ backgroundColor: '#fff', padding: isMobile ? '24px' : '40px', borderRadius: '24px', border: '1px solid #e2e8f0', position: 'relative', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
        <div style={{ marginBottom: '48px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>Daily Performance Graph</h3>
          <p style={{ color: '#64748b', fontSize: '14px' }}>Hours worked per day for the selected period</p>
        </div>
        
        <div style={{ height: isMobile ? '320px' : '450px', width: '100%' }}>
          {loading ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Loading report data...</div>
          ) : attendanceData.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', backgroundColor: '#f8fafc', borderRadius: '16px', border: '2px dashed #e2e8f0' }}>
              <p style={{ fontWeight: '600', marginBottom: '8px' }}>No attendance records found for this month.</p>
              <p style={{ fontSize: '14px' }}>Try selecting a different month or user.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 30, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: '600' }} 
                  dy={15} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: '600' }} 
                  unit="h" 
                  domain={[0, 12]}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }} 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', padding: '12px' }}
                  formatter={(value) => [`${value} hours`, 'Working Time']}
                  labelFormatter={(label, items) => items[0]?.payload?.fullDate || label}
                />
                <Bar 
                  dataKey="hours" 
                  fill="#2563eb" 
                  radius={[8, 8, 0, 0]} 
                  barSize={36}
                >
                  <LabelList content={renderCustomBarLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
};

export default Report;
