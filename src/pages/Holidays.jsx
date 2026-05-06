import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit2, Trash2, X, Check } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { format } from 'date-fns';
import useResponsive from '../hooks/useResponsive';

const Holidays = ({ currentUser }) => {
  const [holidays, setHolidays] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState(null);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [formData, setFormData] = useState({ name: '', date: '', type: 'National' });
  const [isLoading, setIsLoading] = useState(false);
  const { isMobile } = useResponsive();

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    try {
      const res = await apiFetch('/holidays');
      const data = await res.json();
      setHolidays(data);
    } catch (error) {
      console.error('Failed to fetch holidays:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const url = editingHoliday 
        ? `/holidays/${editingHoliday.id}` 
        : '/holidays';
      const method = editingHoliday ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setIsModalOpen(false);
        setEditingHoliday(null);
        setFormData({ name: '', date: '', type: 'National' });
        fetchHolidays();
      }
    } catch (error) {
      console.error('Failed to save holiday:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!holidayToDelete) return;
    setIsLoading(true);
    try {
      const res = await apiFetch(`/holidays/${holidayToDelete}`, { method: 'DELETE' });
      if (res.ok) {
        fetchHolidays();
        setIsDeleteModalOpen(false);
        setHolidayToDelete(null);
      }
    } catch (error) {
      console.error('Failed to delete holiday:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDelete = (id) => {
    setHolidayToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const openEditModal = (holiday) => {
    setEditingHoliday(holiday);
    setFormData({ name: holiday.name, date: holiday.date, type: holiday.type });
    setIsModalOpen(true);
  };

  return (
    <div className="responsive-page">
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: '16px', marginBottom: '32px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>Holidays</h2>
          <p style={{ color: '#6b7280', marginTop: '4px' }}>Manage company and national holidays.</p>
        </div>
        
        {isAdmin && (
          <button 
            onClick={() => {
              setEditingHoliday(null);
              setFormData({ name: '', date: '', type: 'National' });
              setIsModalOpen(true);
            }}
            style={{ backgroundColor: '#2563eb', color: '#fff', padding: '12px 24px', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={20} /> ADD HOLIDAY
          </button>
        )}
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '20px', border: '1px solid #f3f4f6', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
        <div className="responsive-table-wrap">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
            <tr>
              <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Holiday Name</th>
              <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Date</th>
              <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Type</th>
              {isAdmin && <th style={{ padding: '16px 24px', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {holidays.length > 0 ? (
              holidays.map((holiday, index) => (
                <tr key={`${holiday.id}-${index}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '16px 24px', fontWeight: '500', color: '#1f2937' }}>{holiday.name}</td>
                  <td style={{ padding: '16px 24px', color: '#4b5563' }}>{format(new Date(holiday.date), 'dd MMM yyyy')}</td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{ 
                      padding: '4px 12px', 
                      borderRadius: '9999px', 
                      fontSize: '12px', 
                      fontWeight: '500',
                      backgroundColor: holiday.type === 'National' ? '#eff6ff' : '#f0fdf4',
                      color: holiday.type === 'National' ? '#2563eb' : '#16a34a'
                    }}>
                      {holiday.type}
                    </span>
                  </td>
                  {isAdmin && (
                    <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button onClick={() => openEditModal(holiday)} style={{ p: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#6b7280' }}><Edit2 size={18} /></button>
                        <button onClick={() => confirmDelete(holiday.id)} style={{ p: '8px', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={18} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={isAdmin ? 4 : 3} style={{ padding: '48px 24px', textAlign: 'center', color: '#6b7280' }}>
                  No holidays found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: isMobile ? '24px 16px' : '32px', borderRadius: '24px', width: 'calc(100% - 24px)', maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold' }}>{editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#6b7280' }}><X size={24} /></button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Holiday Name</label>
                <input 
                  type="text" 
                  required
                  style={{ width: '100%', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '12px', outline: 'none' }}
                  placeholder="e.g. Independence Day"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Date</label>
                <input 
                  type="date" 
                  required
                  style={{ width: '100%', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '12px', outline: 'none' }}
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>Type</label>
                <select 
                  style={{ width: '100%', padding: '12px', border: '1px solid #e5e7eb', borderRadius: '12px', outline: 'none' }}
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                >
                  <option value="National">National</option>
                  <option value="Company">Company</option>
                  <option value="Optional">Optional</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px', marginTop: '12px' }}>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  CANCEL
                </button>
                <button 
                  type="submit"
                  disabled={isLoading}
                  style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  {isLoading ? 'SAVING...' : 'SAVE HOLIDAY'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', padding: isMobile ? '24px 16px' : '32px', borderRadius: '24px', width: 'calc(100% - 24px)', maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', backgroundColor: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', margin: '0 auto 24px' }}>
              <Trash2 size={32} />
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px', color: '#111827' }}>Delete Holiday?</h3>
            <p style={{ color: '#6b7280', marginBottom: '32px', lineHeight: '1.5' }}>
              Are you sure you want to delete this holiday? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px' }}>
              <button 
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setHolidayToDelete(null);
                }}
                style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1px solid #e5e7eb', backgroundColor: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
              >
                CANCEL
              </button>
              <button 
                onClick={handleDelete}
                disabled={isLoading}
                style={{ flex: 1, padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: '#ef4444', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {isLoading ? 'DELETING...' : 'DELETE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Holidays;
