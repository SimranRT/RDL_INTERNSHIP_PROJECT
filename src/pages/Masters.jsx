import React, { useState, useEffect } from 'react';
import { Plus, Upload, FileCheck } from 'lucide-react';
import { apiFetch } from '../lib/api';
import useResponsive from '../hooks/useResponsive';

const Masters = ({ onDataChange, currentUser }) => {
  const isAdmin = currentUser?.role === 'admin';
  const { isMobile } = useResponsive();

  if (!isAdmin) {
    return (
      <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ backgroundColor: '#fef2f2', padding: '40px', borderRadius: '24px', border: '1px solid #fee2e2', textAlign: 'center', maxWidth: '400px' }}>
          <h2 style={{ color: '#dc2626', fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Entry Restricted</h2>
          <p style={{ color: '#991b1b' }}>Master data management is restricted to administrators only.</p>
        </div>
      </div>
    );
  }
  const [activeSubTab, setActiveSubTab] = useState('department');
  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', department_id: '' });
  
  // Dataset Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState({ type: '', message: '' });
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    apiFetch('/departments').then(res => res.json()).then(setDepartments);
    apiFetch('/sections').then(res => res.json()).then(setSections);
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    const endpoint = activeSubTab === 'department' ? '/departments' : '/sections';
    const res = await apiFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      setIsModalOpen(false);
      setFormData({ name: '', description: '', department_id: '' });
      if (activeSubTab === 'department') {
        apiFetch('/departments').then(res => res.json()).then(setDepartments);
      } else {
        apiFetch('/sections').then(res => res.json()).then(setSections);
      }
      if (onDataChange) onDataChange();
    }
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
    setUploadStatus({ type: '', message: '' });
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadStatus({ type: 'error', message: 'Please select a file first' });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('dataset', selectedFile);

    try {
      const res = await apiFetch('/upload-dataset', {
        method: 'POST',
        body: formData
      });
      
      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}...`);
      }

      if (data.success) {
        setUploadStatus({ type: 'success', message: data.message });
        setSelectedFile(null);
        // Reset file input
        if (e.target.reset) e.target.reset();
        if (onDataChange) onDataChange();
      } else {
        setUploadStatus({ type: 'error', message: data.message || 'Upload failed on server' });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus({ type: 'error', message: `Upload failed: ${error.message}` });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="responsive-page">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', borderBottom: '1px solid #e5e7eb', marginBottom: '32px' }}>
        <button 
          onClick={() => setActiveSubTab('department')}
          style={{ paddingBottom: '16px', fontSize: '14px', fontWeight: '500', textTransform: 'uppercase', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: activeSubTab === 'department' ? '#2563eb' : '#6b7280', borderBottom: activeSubTab === 'department' ? '2px solid #2563eb' : 'none' }}
        >
          Department
        </button>
        <button 
          onClick={() => setActiveSubTab('section')}
          style={{ paddingBottom: '16px', fontSize: '14px', fontWeight: '500', textTransform: 'uppercase', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: activeSubTab === 'section' ? '#2563eb' : '#6b7280', borderBottom: activeSubTab === 'section' ? '2px solid #2563eb' : 'none' }}
        >
          Section
        </button>
        <button 
          onClick={() => setActiveSubTab('dataset')}
          style={{ paddingBottom: '16px', fontSize: '14px', fontWeight: '500', textTransform: 'uppercase', border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: activeSubTab === 'dataset' ? '#2563eb' : '#6b7280', borderBottom: activeSubTab === 'dataset' ? '2px solid #2563eb' : 'none' }}
        >
          Dataset Upload
        </button>
      </div>

      {activeSubTab === 'dataset' ? (
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #f3f4f6', padding: isMobile ? '24px 16px' : '40px', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)', maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ width: '64px', height: '64px', backgroundColor: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', margin: '0 auto 16px' }}>
              <Upload size={32} />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>Upload Dataset</h2>
            <p style={{ color: '#6b7280', marginTop: '8px' }}>Upload your CSV or Excel files to process attendance data.</p>
            <p style={{ fontSize: '12px', color: '#9ca3af', marginTop: '12px' }}>
              Expected columns: <strong>Name, Username, Password (optional), Role (optional), Department (optional), Section (optional)</strong>
            </p>
          </div>

          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div 
              style={{ 
                border: '2px dashed #e5e7eb', 
                borderRadius: '16px', 
                padding: '40px', 
                textAlign: 'center',
                backgroundColor: '#f9fafb',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                setSelectedFile(e.dataTransfer.files[0]);
              }}
            >
              <input 
                type="file" 
                id="file-upload" 
                hidden 
                onChange={handleFileChange}
                accept=".csv,.xlsx,.xls"
              />
              <label htmlFor="file-upload" style={{ cursor: 'pointer' }}>
                {selectedFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#059669' }}>
                    <FileCheck size={24} />
                    <span style={{ fontWeight: '500' }}>{selectedFile.name}</span>
                  </div>
                ) : (
                  <div style={{ color: '#6b7280' }}>
                    <p style={{ fontWeight: '500', color: '#1f2937', marginBottom: '4px' }}>Click to upload or drag and drop</p>
                    <p style={{ fontSize: '12px' }}>CSV, XLSX or XLS (max. 10MB)</p>
                  </div>
                )}
              </label>
            </div>

            {uploadStatus.message && (
              <div style={{ 
                padding: '12px 16px', 
                borderRadius: '8px', 
                fontSize: '14px',
                backgroundColor: uploadStatus.type === 'success' ? '#ecfdf5' : '#fef2f2',
                color: uploadStatus.type === 'success' ? '#065f46' : '#991b1b',
                border: `1px solid ${uploadStatus.type === 'success' ? '#10b981' : '#ef4444'}`
              }}>
                {uploadStatus.message}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isUploading || !selectedFile}
              style={{ 
                backgroundColor: isUploading || !selectedFile ? '#93c5fd' : '#2563eb', 
                color: '#fff', 
                padding: '14px', 
                borderRadius: '12px', 
                fontWeight: 'bold', 
                border: 'none', 
                cursor: isUploading || !selectedFile ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {isUploading ? 'UPLOADING...' : 'START UPLOAD'}
            </button>
          </form>
        </div>
      ) : (
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', border: '1px solid #f3f4f6', overflow: 'hidden', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
          <div style={{ padding: '24px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', gap: '12px', borderBottom: '1px solid #f9fafb' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937', textTransform: 'capitalize' }}>{activeSubTab}s</h2>
            <button 
              onClick={() => setIsModalOpen(true)}
              style={{ backgroundColor: '#2563eb', color: '#fff', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500' }}
            >
              <Plus size={18} />
              ADD {activeSubTab.toUpperCase()}
            </button>
          </div>
          <div className="responsive-table-wrap">
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: '#f9fafb', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase' }}>
              <tr>
                <th style={{ padding: '16px 24px' }}>ID</th>
                <th style={{ padding: '16px 24px' }}>{activeSubTab} Name</th>
                {activeSubTab === 'section' && <th style={{ padding: '16px 24px' }}>Department</th>}
                <th style={{ padding: '16px 24px' }}>Description</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: '14px', color: '#4b5563' }}>
              {(activeSubTab === 'department' ? departments : sections).map((item, index) => (
                <tr key={`${item.id}-${index}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '16px 24px' }}>{item.id}</td>
                  <td style={{ padding: '16px 24px', fontWeight: '500', color: '#1f2937' }}>{item.name}</td>
                  {activeSubTab === 'section' && <td style={{ padding: '16px 24px' }}>{item.department_name}</td>}
                  <td style={{ padding: '16px 24px' }}>{item.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '16px', width: 'calc(100% - 24px)', maxWidth: '400px', padding: isMobile ? '24px 16px' : '32px', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '24px' }}>Add {activeSubTab}</h3>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Name</label>
                <input 
                  type="text" 
                  required
                  style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', outline: 'none' }}
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              {activeSubTab === 'section' && (
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Department</label>
                  <select 
                    required
                    style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', outline: 'none' }}
                    value={formData.department_id}
                    onChange={e => setFormData({...formData, department_id: e.target.value})}
                  >
                    <option value="">Select Department</option>
                    {departments.map((d, index) => <option key={`${d.id}-${index}`} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Description</label>
                <textarea 
                  style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '8px', outline: 'none', minHeight: '80px' }}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '12px', marginTop: '16px' }}>
                <button type="submit" style={{ flex: 1, backgroundColor: '#2563eb', color: '#fff', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>ADD</button>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, backgroundColor: '#f3f4f6', color: '#4b5563', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>CANCEL</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Masters;
