import React, { useState, useEffect } from 'react';
import { Check, X, Clock, User, Calendar, MessageSquare } from 'lucide-react';
import { apiFetch } from '../lib/api';

const TimeClaims = ({ currentUser }) => {
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/time-claims');
      const data = await res.json();
      setClaims(data);
    } catch (error) {
      console.error('Failed to fetch claims:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (claimId, status) => {
    try {
      const res = await apiFetch('/time-claims/approve', {
        method: 'POST',
        body: JSON.stringify({ claimId, status })
      });
      if (res.ok) {
        setFeedback({ type: 'success', message: `Claim ${status} successfully!` });
        fetchClaims();
        setTimeout(() => setFeedback({ type: '', message: '' }), 3000);
      } else {
        setFeedback({ type: 'error', message: 'Failed to update claim' });
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Connection error' });
    }
  };

  if (currentUser?.role !== 'admin') {
    return (
      <div style={{ padding: '32px', textAlign: 'center' }}>
        <h2 style={{ color: '#dc2626' }}>Access Denied</h2>
        <p>Only administrators can access this page.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>Time Correction Requests</h1>
        <p style={{ color: '#64748b' }}>Review and approve employee requests for unrecorded work hours.</p>
      </div>

      {feedback.message && (
        <div style={{ padding: '16px', borderRadius: '12px', marginBottom: '24px', backgroundColor: feedback.type === 'success' ? '#f0fdf4' : '#fef2f2', color: feedback.type === 'success' ? '#16a34a' : '#dc2626', fontWeight: '600' }}>
          {feedback.message}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px' }}>Loading requests...</div>
      ) : claims.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px', backgroundColor: '#f8fafc', borderRadius: '24px', border: '1px dashed #e2e8f0' }}>
          <Clock size={48} style={{ color: '#94a3b8', marginBottom: '16px' }} />
          <p style={{ color: '#64748b', fontSize: '18px' }}>No pending correction requests found.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
          {claims.map((claim, index) => (
            <div key={`${claim.id}-${index}`} style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '16px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                    <User size={24} />
                  </div>
                  <div>
                    <p style={{ fontWeight: '700', color: '#1e293b', fontSize: '16px' }}>{claim.employee_name}</p>
                    <p style={{ fontSize: '12px', color: '#64748b' }}>ID: {claim.employee_id}</p>
                  </div>
                </div>
                <span style={{ 
                  padding: '4px 12px', 
                  borderRadius: '9999px', 
                  fontSize: '12px', 
                  fontWeight: 'bold',
                  backgroundColor: claim.status === 'pending' ? '#fef3c7' : claim.status === 'approved' ? '#f0fdf4' : '#fef2f2',
                  color: claim.status === 'pending' ? '#d97706' : claim.status === 'approved' ? '#16a34a' : '#dc2626',
                  textTransform: 'capitalize'
                }}>{claim.status}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px' }}>
                  <p style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', marginBottom: '4px' }}>Date</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1e293b', fontWeight: '600' }}>
                    <Calendar size={14} />
                    {claim.date}
                  </div>
                </div>
                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px' }}>
                  <p style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', marginBottom: '4px' }}>Claimed Time</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#1e293b', fontWeight: '600' }}>
                    <Clock size={14} />
                    {claim.actual_login} - {claim.actual_logout}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <p style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageSquare size={14} /> Reason
                </p>
                <p style={{ fontSize: '14px', color: '#334155', lineHeight: '1.5', backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '12px' }}>
                  {claim.reason}
                </p>
              </div>

              {claim.status === 'pending' && (
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button 
                    onClick={() => handleAction(claim.id, 'rejected')}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '12px', border: '1px solid #fee2e2', backgroundColor: '#fff', color: '#dc2626', fontWeight: '700', cursor: 'pointer' }}
                  >
                    <X size={18} /> Reject
                  </button>
                  <button 
                    onClick={() => handleAction(claim.id, 'approved')}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#16a34a', color: '#fff', fontWeight: '700', cursor: 'pointer' }}
                  >
                    <Check size={18} /> Approve
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TimeClaims;
