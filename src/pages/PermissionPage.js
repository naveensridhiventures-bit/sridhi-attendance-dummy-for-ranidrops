import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const REASONS = ['Personal Work', 'Family Emergency', 'Medical', 'Vehicle Issue', 'Other'];

const REASON_COLORS = {
  'Personal Work':    { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' },
  'Family Emergency': { bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
  'Medical':          { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  'Vehicle Issue':    { bg: '#fdf4ff', text: '#9333ea', border: '#e9d5ff' },
  'Other':            { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
};

function formatDate(dateStr) {
  // dateStr could be a number (serial) or a proper date string
  if (!dateStr) return '—';
  // If it's already a formatted string like "03-06-2026"
  if (typeof dateStr === 'string' && dateStr.includes('-')) return dateStr;
  // If it's a Google Sheets serial number
  if (typeof dateStr === 'number' || !isNaN(Number(dateStr))) {
    const serial = Number(dateStr);
    const d = new Date((serial - 25569) * 86400 * 1000);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
      .split('/').join('-');
  }
  return String(dateStr);
}

export default function PermissionPage({ unlockedName }) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear]   = useState(today.getFullYear());

  const [records, setRecords]     = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [toast, setToast]         = useState({ show: false, msg: '', type: '' });

  // Form state
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ name: unlockedName || '', reason: REASONS[0], date: '', hours: '' });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting]   = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: '' }), 3000);
  };

  const todayISO = today.toISOString().split('T')[0]; // YYYY-MM-DD for input[type=date]

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [permRes, empRes] = await Promise.all([
        api.getPermissions(month, year),
        api.getEmployees(),
      ]);
      const allPerms = permRes.permissions || [];
      const filtered = unlockedName
        ? allPerms.filter(r => r.name === unlockedName)
        : allPerms;
      setRecords(filtered);
      setEmployees(empRes.employees || []);
    } catch (e) {
      setError(e.message || 'Failed to load permission data');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  const handleAddPermission = async () => {
    if (!form.name) return showToast('Select an employee', 'error');
    if (!form.date) return showToast('Select a date', 'error');
    if (!form.hours) return showToast('Enter number of hours/minutes', 'error');

    setSubmitting(true);
    try {
      // Format date as DD-MM-YYYY to match sheet format
      const [y, m, d] = form.date.split('-');
      const formattedDate = `${d}-${m}-${y}`;
      await api.addPermission(form.name, form.reason, formattedDate, form.hours, month, year);
      showToast(`Permission added for ${form.name}`);
      setForm({ name: '', reason: REASONS[0], date: '', hours: '' });
      setShowForm(false);
      load();
    } catch (e) {
      showToast(e.message || 'Failed to add permission', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (sno) => {
    setDeleting(sno);
    try {
      await api.deletePermission(sno, month, year);
      showToast('Permission record deleted');
      load();
    } catch (e) {
      showToast(e.message || 'Failed to delete', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const yearOpts = [];
  for (let y = today.getFullYear() - 1; y <= today.getFullYear() + 1; y++) yearOpts.push(y);

  const grouped = records.reduce((acc, r) => {
    const key = r.name || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <div className="perm-page">
      {/* Month/Year selector */}
      <div className="month-selector-bar">
        <select value={month} onChange={e => setMonth(+e.target.value)} className="sel">
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(+e.target.value)} className="sel">
          {yearOpts.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button className="btn-refresh" onClick={load} title="Refresh">⟳</button>
      </div>

      {/* Summary */}
      {!loading && records.length > 0 && (
        <div className="perm-summary">
          <div className="psum-card psum-orange">
            <div className="psum-val">{records.length}</div>
            <div className="psum-label">Total Permissions</div>
          </div>
          <div className="psum-card psum-blue">
            <div className="psum-val">{Object.keys(grouped).length}</div>
            <div className="psum-label">Employees</div>
          </div>
          <div className="psum-card psum-purple">
            <div className="psum-val">
              {[...new Set(records.map(r => r.date))].length}
            </div>
            <div className="psum-label">Days</div>
          </div>
        </div>
      )}

      {/* Add button */}
      <button className="btn-add-perm" onClick={() => setShowForm(v => !v)}>
        {showForm ? '✕ Cancel' : '＋ Add Permission'}
      </button>

      {/* Add Form */}
      {showForm && (
        <div className="perm-form-card">
          <div className="pf-title">New Permission Entry</div>

          <label className="pf-label">Employee</label>
          <select
            className="pf-input"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          >
            <option value="">— Select employee —</option>
            {employees.map(emp => (
              <option key={emp.name} value={emp.name}>{emp.name}</option>
            ))}
          </select>

          <label className="pf-label">Reason</label>
          <div className="reason-chips">
            {REASONS.map(r => (
              <button
                key={r}
                className={`reason-chip ${form.reason === r ? 'selected' : ''}`}
                style={form.reason === r ? {
                  background: REASON_COLORS[r]?.bg,
                  color: REASON_COLORS[r]?.text,
                  borderColor: REASON_COLORS[r]?.border,
                } : {}}
                onClick={() => setForm(f => ({ ...f, reason: r }))}
                type="button"
              >
                {r}
              </button>
            ))}
          </div>

          <label className="pf-label">Date</label>
          <input
            type="date"
            className="pf-input"
            value={form.date}
            max={todayISO}
            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
          />

          <label className="pf-label">Duration</label>
          <div className="pf-duration-row">
            {['30 MIN', '1 HRS', '1.5 HRS', '2 HRS', '3 HRS', '4 HRS'].map(h => (
              <button
                key={h}
                className={`dur-chip ${form.hours === h ? 'selected' : ''}`}
                onClick={() => setForm(f => ({ ...f, hours: h }))}
                type="button"
              >
                {h}
              </button>
            ))}
          </div>
          <input
            type="text"
            className="pf-input pf-input-sm"
            placeholder="Or type custom e.g. 45 MIN"
            value={['30 MIN','1 HRS','1.5 HRS','2 HRS','3 HRS','4 HRS'].includes(form.hours) ? '' : form.hours}
            onChange={e => setForm(f => ({ ...f, hours: e.target.value }))}
          />

          <button
            className="btn-perm-submit"
            onClick={handleAddPermission}
            disabled={submitting}
          >
            {submitting ? 'Saving…' : 'Save Permission'}
          </button>
        </div>
      )}

      {/* States */}
      {loading && (
        <div className="center-msg">
          <div className="spinner" />
          <p>Loading permissions for {MONTHS[month - 1]} {year}…</p>
        </div>
      )}

      {!loading && error && (
        <div className="error-box">
          <span>⚠️ {error}</span>
          <button onClick={load} className="btn-retry">Retry</button>
        </div>
      )}

      {!loading && !error && records.length === 0 && (
        <div className="center-msg empty">
          <div className="empty-icon">🕐</div>
          <p>No permission records for {MONTHS[month - 1]} {year}</p>
          <small>Tap "Add Permission" to log one</small>
        </div>
      )}

      {/* Records list */}
      {!loading && !error && records.length > 0 && (
        <div className="perm-list">
          {records.map((rec, idx) => {
            const rc = REASON_COLORS[rec.reason] || REASON_COLORS['Other'];
            return (
              <div key={idx} className="perm-card">
                <div className="perm-card-left">
                  <div className="perm-avatar">{(rec.name || '?')[0].toUpperCase()}</div>
                  <div className="perm-info">
                    <div className="perm-name">{rec.name}</div>
                    <div className="perm-date">📅 {formatDate(rec.date)}</div>
                  </div>
                </div>
                <div className="perm-card-right">
                  <span
                    className="perm-reason-badge"
                    style={{ background: rc.bg, color: rc.text, borderColor: rc.border }}
                  >
                    {rec.reason}
                  </span>
                  <span className="perm-hours">{rec.hours}</span>
                  <button
                    className="btn-perm-delete"
                    onClick={() => handleDelete(rec.sno)}
                    disabled={deleting === rec.sno}
                    title="Delete"
                  >
                    {deleting === rec.sno ? '…' : '🗑'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toast.show && (
        <div className={`salary-toast ${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  );
}
