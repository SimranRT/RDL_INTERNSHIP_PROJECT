import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const URLPage = ({ selectedUser }) => {
  const data = [
    { name: 'Adobe After Effects', value: 42, color: '#f97316' },
    { name: 'Adobe Premiere Pro', value: 14, color: '#fbbf24' },
    { name: 'Google Chrome', value: 11, color: '#3b82f6' },
    { name: 'Slack', value: 7, color: '#06b6d4' },
    { name: 'Windows Explorer', value: 4, color: '#10b981' },
    { name: 'Notepad.exe', value: 1, color: '#ef4444' },
  ];

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ backgroundColor: '#2563eb', color: '#fff', padding: '24px', borderRadius: '16px', marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>{selectedUser?.name || 'Milan Gangadiya'}</h2>
        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '12px', opacity: 0.8 }}>Total Usage Time</p>
            <p style={{ fontSize: '18px', fontWeight: 'bold' }}>01h 33min</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '12px', opacity: 0.8 }}>Top App</p>
            <p style={{ fontSize: '18px', fontWeight: 'bold' }}>Adobe After Effects</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '32px' }}>
        <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '16px', border: '1px solid #f3f4f6' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '24px' }}>Application Usage</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '16px', border: '1px solid #f3f4f6' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ fontSize: '12px', textTransform: 'uppercase', color: '#6b7280', borderBottom: '2px solid #f3f4f6' }}>
              <tr>
                <th style={{ padding: '12px 0' }}>App Name</th>
                <th style={{ padding: '12px 0', textAlign: 'right' }}>Total Time</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '14px', color: '#4b5563' }}>
              {data.map(app => (
                <tr key={app.name} style={{ borderBottom: '1px solid #f9fafb' }}>
                  <td style={{ padding: '12px 0' }}>{app.name}</td>
                  <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 'bold' }}>{app.value}min</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 'bold', borderTop: '2px solid #f3f4f6' }}>
                <td style={{ padding: '12px 0' }}>Total</td>
                <td style={{ padding: '12px 0', textAlign: 'right' }}>01h 33min</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default URLPage;
