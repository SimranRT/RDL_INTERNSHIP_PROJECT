import React from 'react';
import { 
  Calendar,
  ClipboardList,
  Clock
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ teamMembers, selectedUser, setSelectedUser, currentUser, isMobile, isOpen, onClose }) => {
  const location = useLocation();
  const primaryMenuItems = [
    { id: 'dashboard', label: 'Dashboard', path: '/' },
    { id: 'attendance', label: 'Attendance', path: '/attendance' },
    { id: 'report', label: 'Report', path: '/report' },
  ];
  const commonMenuItems = [
    { id: 'holidays', label: 'Holidays', icon: Calendar, path: '/holidays' },
    { id: 'leaves', label: 'Leaves', icon: ClipboardList, path: '/leaves' },
  ];
  const adminOnlyMenuItems = [
    { id: 'time-claims', label: 'Time Claims', icon: Clock, path: '/time-claims' },
  ];

  const isAdmin = currentUser?.role === 'admin';
  const menuItems = isAdmin ? [...commonMenuItems, ...adminOnlyMenuItems] : commonMenuItems;

  return (
    <div
      className={`app-sidebar${isMobile && isOpen ? ' mobile-open' : ''}`}
      style={{ width: '260px', height: '100vh', backgroundColor: '#fff', borderRight: '1px solid #eee', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ padding: '24px', borderBottom: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '40px', height: '40px', backgroundColor: '#2563eb', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '20px' }}>
          R
        </div>
        <span style={{ fontWeight: 'bold', fontSize: '20px', color: '#1f2937' }}>Team</span>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0' }}>
        {isMobile && (
          <div style={{ padding: '0 16px', marginBottom: '16px' }}>
            {primaryMenuItems.map((item) => (
              <Link
                key={item.id}
                to={item.path}
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  color: location.pathname === item.path ? '#2563eb' : '#4b5563',
                  backgroundColor: location.pathname === item.path ? '#eff6ff' : 'transparent',
                  marginBottom: '4px',
                  fontWeight: location.pathname === item.path ? '600' : '400'
                }}
              >
                <span style={{ fontSize: '14px' }}>{item.label}</span>
              </Link>
            ))}
            <div style={{ height: '1px', backgroundColor: '#f3f4f6', margin: '16px 8px' }} />
          </div>
        )}

        <div style={{ padding: '0 16px', marginBottom: '16px' }}>
          {menuItems.map((item) => (
            <Link 
              key={item.id} 
              to={item.path}
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '12px',
                textDecoration: 'none',
                color: location.pathname === item.path ? '#2563eb' : '#4b5563',
                backgroundColor: location.pathname === item.path ? '#eff6ff' : 'transparent',
                marginBottom: '4px',
                fontWeight: location.pathname === item.path ? '600' : '400',
                transition: 'all 0.2s'
              }}
            >
              <item.icon size={20} />
              <span style={{ fontSize: '14px' }}>{item.label}</span>
            </Link>
          ))}
          <div style={{ height: '1px', backgroundColor: '#f3f4f6', margin: '16px 8px' }} />
        </div>

        {isAdmin ? (
          <div style={{ padding: '0 8px' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', padding: '0 16px 12px', letterSpacing: '0.05em' }}>Employees</p>
            {Array.isArray(teamMembers) && teamMembers.map((member, index) => (
              <button
                key={`${member.id}-${index}`}
                onClick={() => setSelectedUser(member)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  border: 'none',
                  borderRadius: '12px',
                  backgroundColor: selectedUser?.id === member.id ? '#eff6ff' : 'transparent',
                  color: selectedUser?.id === member.id ? '#2563eb' : '#4b5563',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  marginBottom: '2px'
                }}
              >
                <div style={{ position: 'relative' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '12px' }}>
                    {member.name.charAt(0)}
                  </div>
                  <div style={{ 
                    position: 'absolute', 
                    bottom: '-2px', 
                    right: '-2px', 
                    width: '10px', 
                    height: '10px', 
                    borderRadius: '50%', 
                    border: '2px solid #fff',
                    backgroundColor: member.today_status === 'Present' ? '#10b981' : member.today_status === 'Late' ? '#f59e0b' : '#ef4444'
                  }} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: selectedUser?.id === member.id ? '600' : '400', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
            <p>Team access restricted to administrators.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
