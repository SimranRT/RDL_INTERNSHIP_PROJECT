import React from 'react';

const Notification = ({ message, type = 'info' }) => {
  if (!message) return null;
  
  const colors = {
    info: '#eff6ff',
    success: '#f0fdf4',
    error: '#fef2f2'
  };
  
  const textColors = {
    info: '#2563eb',
    success: '#16a34a',
    error: '#dc2626'
  };

  return (
    <div style={{
      position: 'fixed',
      top: '24px',
      right: '24px',
      padding: '12px 24px',
      backgroundColor: colors[type],
      color: textColors[type],
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
      zIndex: 1000,
      fontSize: '14px',
      fontWeight: '500'
    }}>
      {message}
    </div>
  );
};

export default Notification;
