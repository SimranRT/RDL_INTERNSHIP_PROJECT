import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Plus, Check, X, Clock, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isWithinInterval, 
  isBefore, 
  startOfDay,
  parseISO
} from 'date-fns';
import { apiFetch } from '../lib/api';
import useResponsive from '../hooks/useResponsive';

const Leaves = ({ currentUser }) => {
  const [leaves, setLeaves] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ start_date: '', end_date: '', reason: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const { isMobile } = useResponsive();

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    fetchLeaves();
  }, [currentUser]);

  const fetchLeaves = async () => {
    try {
      const url = isAdmin 
        ? '/leaves' 
        : `/leaves/${currentUser.id}`;
      const res = await apiFetch(url);
      const data = await res.json();
      setLeaves(Array.isArray(data) ? data : []);

      if (!isAdmin) {
        const balanceRes = await apiFetch(`/leave-balance/${currentUser.id}`);
        const balanceData = await balanceRes.json();
        setLeaveBalance(balanceData);
      }
    } catch (error) {
      console.error('Failed to fetch leaves:', error);
      setLeaves([]);
      setLeaveBalance(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.start_date || !formData.end_date) {
      alert('Please select a date range');
      return;
    }
    setIsLoading(true);
    try {
      const res = await apiFetch('/leaves', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          user_id: currentUser.id
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        setFormData({ start_date: '', end_date: '', reason: '' });
        fetchLeaves();
      }
    } catch (error) {
      console.error('Failed to apply for leave:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      const res = await apiFetch(`/leaves/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchLeaves();
    } catch (error) {
      console.error('Failed to update leave status:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#16a34a';
      case 'rejected': return '#dc2626';
      default: return '#ca8a04';
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'approved': return '#f0fdf4';
      case 'rejected': return '#fef2f2';
      default: return '#fefce8';
    }
  };

  // Calendar Logic
  const daysInMonth = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentCalendarDate)),
    end: endOfWeek(endOfMonth(currentCalendarDate))
  });

  const handleDateClick = (day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    if (!formData.start_date || (formData.start_date && formData.end_date)) {
      setFormData({ ...formData, start_date: dayStr, end_date: '' });
    } else {
      if (isBefore(day, parseISO(formData.start_date))) {
        setFormData({ ...formData, start_date: dayStr, end_date: '' });
      } else {
        setFormData({ ...formData, end_date: dayStr });
      }
    }
  };

  const isInRange = (day) => {
    if (!formData.start_date || !formData.end_date) return false;
    return isWithinInterval(day, {
      start: parseISO(formData.start_date),
      end: parseISO(formData.end_date)
    });
  };

  return (
    <div className="responsive-page">
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: '16px', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
            {isAdmin ? 'Manage Leave Requests' : 'My Leave Requests'}
          </h2>
          <p style={{ color: '#6b7280', marginTop: '4px' }}>
            {isAdmin ? 'Review and approve employee leave applications.' : 'Apply for leave, track your 10 paid leave days, and check when extra leave becomes loss of pay.'}
          </p>
        </div>
        
        {!isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            style={{ backgroundColor: '#2563eb', color: '#fff', padding: '12px 24px', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={20} /> APPLY FOR LEAVE
          </button>
        )}
      </div>

      {!isAdmin && leaveBalance && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          {[
            { label: 'Paid Leave Limit', value: leaveBalance.total_paid_allowed, color: '#2563eb', bg: '#eff6ff' },
            { label: 'Paid Leave Used', value: leaveBalance.paid_used, color: '#ca8a04', bg: '#fefce8' },
            { label: 'Remaining Paid Leave', value: leaveBalance.remaining_paid, color: '#16a34a', bg: '#f0fdf4' },
            { label: 'Loss of Pay Days', value: leaveBalance.lop_days, color: '#dc2626', bg: '#fef2f2' }
          ].map((item) => (
            <div key={item.label} style={{ backgroundColor: '#fff', borderRadius: '18px', border: '1px solid #e5e7eb', padding: '18px', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.06)' }}>
              <div style={{ display: 'inline-flex', padding: '6px 10px', borderRadius: '999px', backgroundColor: item.bg, color: item.color, fontWeight: '700', fontSize: '12px', marginBottom: '12px' }}>
                {item.label}
              </div>
              <div style={{ fontSize: '28px', fontWeight: '800', color: '#111827' }}>{item.value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #f3f4f6', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
        <div className="responsive-table-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
            <tr>
              {isAdmin && <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Employee</th>}
              <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Duration</th>
              <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Leave Type</th>
              <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Reason</th>
              <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              {isAdmin && <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {leaves.length > 0 ? (
              leaves.map((leave, index) => (
                <tr key={`${leave.id}-${index}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  {isAdmin && (
                    <td style={{ padding: '16px 24px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '500', color: '#1f2937' }}>{leave.user_name}</span>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>@{leave.username}</span>
                      </div>
                    </td>
                  )}
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: '500', color: '#1f2937' }}>
                        {format(parseISO(leave.start_date), 'dd MMM')} - {format(parseISO(leave.end_date), 'dd MMM yyyy')}
                      </span>
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        {leave.total_days} day(s) • Applied on {format(parseISO(leave.created_at), 'dd MMM yyyy')}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontWeight: '600', color: leave.leave_category === 'Loss of Pay' ? '#dc2626' : leave.leave_category === 'Partially Paid' ? '#ca8a04' : '#1f2937' }}>
                        {leave.status === 'approved' ? leave.leave_category : 'Awaiting decision'}
                      </span>
                      {leave.status === 'approved' && (
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                          Paid: {leave.paid_days || 0} | LOP: {leave.lop_days || 0}
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', color: '#4b5563', maxWidth: '300px' }}>{leave.reason}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ 
                      padding: '4px 12px', 
                      borderRadius: '9999px', 
                      fontSize: '12px', 
                      fontWeight: '600',
                      textTransform: 'capitalize',
                      backgroundColor: getStatusBg(leave.status),
                      color: getStatusColor(leave.status)
                    }}>
                      {leave.status}
                    </span>
                  </td>
                  {isAdmin && (
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      {leave.status === 'pending' ? (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button 
                            onClick={() => handleStatusUpdate(leave.id, 'approved')}
                            style={{ padding: '8px', borderRadius: '8px', border: '1px solid #16a34a', backgroundColor: '#f0fdf4', color: '#16a34a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Check size={16} /> Approve
                          </button>
                          <button 
                            onClick={() => handleStatusUpdate(leave.id, 'rejected')}
                            style={{ padding: '8px', borderRadius: '8px', border: '1px solid #dc2626', backgroundColor: '#fef2f2', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <X size={16} /> Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>Processed</span>
                      )}
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={isAdmin ? 6 : 4} style={{ padding: '48px 24px', textAlign: 'center', color: '#6b7280' }}>
                  No leave requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: isMobile ? '24px 16px' : '32px', borderRadius: '24px', width: 'calc(100% - 24px)', maxWidth: '540px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold' }}>Apply for Leave</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#6b7280' }}><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Calendar Picker */}
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '16px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <button type="button" onClick={() => setCurrentCalendarDate(subMonths(currentCalendarDate, 1))} style={{ padding: '4px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}><ChevronLeft size={20} /></button>
                  <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{format(currentCalendarDate, 'MMMM yyyy')}</span>
                  <button type="button" onClick={() => setCurrentCalendarDate(addMonths(currentCalendarDate, 1))} style={{ padding: '4px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer' }}><ChevronRight size={20} /></button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                    <span key={d} style={{ fontSize: '12px', fontWeight: '600', color: '#9ca3af' }}>{d}</span>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                  {daysInMonth.map((day, i) => {
                    const isSelected = isSameDay(day, parseISO(formData.start_date)) || isSameDay(day, parseISO(formData.end_date));
                    const inRange = isInRange(day);
                    const isCurrentMonth = isSameMonth(day, currentCalendarDate);
                    
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleDateClick(day)}
                        style={{
                          aspectRatio: '1',
                          border: 'none',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? '#2563eb' : inRange ? '#eff6ff' : 'transparent',
                          color: isSelected ? '#fff' : isCurrentMonth ? '#1f2937' : '#d1d5db',
                          fontWeight: isSelected || inRange ? 'bold' : 'normal',
                          transition: 'all 0.2s'
                        }}
                      >
                        {format(day, 'd')}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '12px', alignItems: 'center' }}>
                <CalendarIcon size={20} color="#6b7280" />
                <div style={{ fontSize: '14px' }}>
                  {formData.start_date ? (
                    <span>
                      Selected: <strong>{format(parseISO(formData.start_date), 'dd MMM yyyy')}</strong>
                      {formData.end_date && <span> to <strong>{format(parseISO(formData.end_date), 'dd MMM yyyy')}</strong></span>}
                    </span>
                  ) : (
                    <span style={{ color: '#6b7280' }}>Select start and end dates from calendar</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', padding: '12px', backgroundColor: '#eff6ff', borderRadius: '12px', alignItems: 'flex-start', color: '#1d4ed8', fontSize: '14px' }}>
                <AlertCircle size={18} style={{ marginTop: '2px', flexShrink: 0 }} />
                <span>Only 10 approved leave days are paid. If your approved leave goes above 10 days, the extra days will be marked as Loss of Pay.</span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Reason</label>
                <textarea 
                  required
                  rows={3}
                  style={{ width: '100%', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '12px', outline: 'none', resize: 'none' }}
                  placeholder="Please provide a reason for your leave..."
                  value={formData.reason}
                  onChange={e => setFormData({...formData, reason: e.target.value})}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px' }}>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  CANCEL
                </button>
                <button 
                  type="submit"
                  disabled={isLoading || !formData.start_date || !formData.end_date}
                  style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: (isLoading || !formData.start_date || !formData.end_date) ? '#94a3b8' : '#2563eb', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {isLoading ? 'SUBMITTING...' : 'SUBMIT APPLICATION'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaves;
