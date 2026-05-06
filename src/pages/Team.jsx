import React from 'react';
import { UserCheck, UserX, Clock } from 'lucide-react';

const Team = ({ employees }) => {
  return (
    <div style={{ padding: '32px', backgroundColor: '#f8fafc', minHeight: '100%' }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.025em' }}>Our Team</h2>
        <p style={{ color: '#64748b', fontSize: '16px', marginTop: '4px' }}>Manage and view real-time status of all employees.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
        {Array.isArray(employees) && employees.map((emp, index) => (
          <div key={`${emp.id}-${index}`} style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '32px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)', position: 'relative', overflow: 'hidden' }}>
            {/* Status Indicator */}
            <div style={{ 
              position: 'absolute', 
              top: '20px', 
              right: '20px', 
              width: '12px', 
              height: '12px', 
              borderRadius: '50%', 
              backgroundColor: emp.today_status === 'Present' ? '#10b981' : emp.today_status === 'Late' ? '#f59e0b' : '#ef4444',
              boxShadow: `0 0 0 4px ${emp.today_status === 'Present' ? '#10b98120' : emp.today_status === 'Late' ? '#f59e0b20' : '#ef444420'}`
            }} />

            <div style={{ width: '80px', height: '80px', borderRadius: '24px', backgroundColor: '#f1f5f9', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: '800', color: '#3b82f6' }}>
              {emp.name.charAt(0)}
            </div>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#1e293b', marginBottom: '4px' }}>{emp.name}</h3>
              <p style={{ fontSize: '14px', color: '#64748b', fontWeight: '600' }}>{emp.department_name || 'General'}</p>
              <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>@{emp.username}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '16px', textAlign: 'center' }}>
                <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>Status</p>
                <p style={{ fontSize: '14px', fontWeight: '800', color: emp.today_status === 'Present' ? '#10b981' : emp.today_status === 'Late' ? '#f59e0b' : '#ef4444' }}>
                  {emp.today_status || 'Absent'}
                </p>
              </div>
              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '16px', textAlign: 'center' }}>
                <p style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>In Time</p>
                <p style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>{emp.today_login || '--:--'}</p>
              </div>
            </div>

            <div style={{ backgroundColor: '#eff6ff', padding: '16px', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '11px', color: '#3b82f6', fontWeight: '700', textTransform: 'uppercase' }}>Attendance Rate</p>
                <p style={{ fontSize: '24px', fontWeight: '800', color: '#1e40af' }}>{emp.attendance_rate}%</p>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                <UserCheck size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Team;
