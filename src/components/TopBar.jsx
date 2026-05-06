import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, User, Menu } from 'lucide-react';

const TopBar = ({ currentUser, onLogout, isMobile, onMenuToggle }) => {
  const location = useLocation();
  const isAdmin = currentUser?.role === 'admin';
  
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', path: '/' },
    { id: 'attendance', label: 'Attendance', path: '/attendance' },
    { id: 'report', label: 'Report', path: '/report' },
  ];

  if (isAdmin) {
    tabs.unshift({ id: 'masters', label: 'Masters', path: '/masters' });
    tabs.push({ id: 'time-claim', label: 'Time Claim', path: '/time-claims' });
  }

  const currentTab = tabs.find((tab) => tab.path === location.pathname);

  return (
    <div style={{ minHeight: '64px', backgroundColor: '#fff', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', padding: isMobile ? '0 16px' : '0 32px', justifyContent: 'space-between', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '32px', height: '100%', minWidth: 0 }}>
        {isMobile && (
          <button
            type="button"
            className="mobile-menu-button"
            onClick={onMenuToggle}
            style={{ width: '40px', height: '40px', borderRadius: '10px', border: '1px solid #e5e7eb', backgroundColor: '#fff', color: '#1f2937', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Menu size={20} />
          </button>
        )}
        {isMobile && (
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937' }}>{currentTab?.label || 'Dashboard'}</div>
            <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'capitalize' }}>{currentUser?.role || 'employee'}</div>
          </div>
        )}
        <div className="topbar-tabs">
          {tabs.map((tab) => (
          <Link
            key={tab.id}
            to={tab.path}
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              color: location.pathname === tab.path ? '#2563eb' : '#6b7280',
              position: 'relative',
              transition: 'color 0.2s'
            }}
          >
            {tab.label}
            {location.pathname === tab.path && (
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', backgroundColor: '#2563eb', borderRadius: '3px 3px 0 0' }} />
            )}
          </Link>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div style={{ width: '32px', height: '32px', backgroundColor: '#f3f4f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
            <User size={18} />
          </div>
          <div style={{ display: isMobile ? 'none' : 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>{currentUser?.name || 'User'}</span>
            <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'capitalize' }}>{currentUser?.role || 'Employee'}</span>
          </div>
        </div>
        <button 
          onClick={onLogout}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: isMobile ? '8px 10px' : '8px 16px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#fff', color: '#ef4444', cursor: 'pointer', fontSize: '13px', fontWeight: '500', transition: 'all 0.2s' }}
        >
          <LogOut size={16} />
          {!isMobile && 'Logout'}
        </button>
      </div>
    </div>
  );
};

export default TopBar;
