import React, { useState, useEffect, useCallback } from 'react';
import { api, clearCache } from '../utils/api';
import { useApp } from '../context/AppContext';

export default function EmployeesPage() {
  const { showToast } = useApp();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', role: '', salary: '', password: '' });
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    clearCache('action=getEmployees');
    try {
      const res = await api.getEmployees();
      setEmployees(res.employees || []);
    } catch (e) {
      showToast('Failed to load employees', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = employees.filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.role.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!form.name.trim() || !form.role.trim() || !form.salary) {
      return showToast('Fill all required fields', 'error');
    }
    setAdding(true);
    try {
      await api.addEmployee(form.name.trim(), form.role.trim(), Number(form.salary), form.password || 'dexter1');
      showToast('Employee added!', 'success');
      setForm({ name: '', role: '', salary: '', password: '' });
      setShowAdd(false);
      load();
    } catch (e) {
      showToast('Failed to add employee', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (emp) => {
    if (!window.confirm(`Deactivate ${emp.name}? They will no longer appear in attendance.`)) return;
    setDeleting(emp.name);
    try {
      await api.deleteEmployee(emp.name);
      showToast(`${emp.name} deactivated`, 'success');
      load();
    } catch (e) {
      showToast('Failed to deactivate', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const roleGroups = {};
  filtered.forEach(e => {
    const r = e.role || 'Other';
    if (!roleGroups[r]) roleGroups[r] = [];
    roleGroups[r].push(e);
  });

  return (
    <div>
      <div className="section-title">Staff Management</div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input
          placeholder="Search name or role..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1 }}
        />
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)} style={{ width: 'auto', flexShrink: 0 }}>
          + Add
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div className="card" style={{ flex: 1, textAlign: 'center', padding: '12px 8px' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--red-dark)' }}>{employees.length}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Staff</div>
        </div>
        <div className="card" style={{ flex: 1, textAlign: 'center', padding: '12px 8px' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--red-dark)' }}>
            {Object.keys(roleGroups).length}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Departments</div>
        </div>
        <div className="card" style={{ flex: 1, textAlign: 'center', padding: '12px 8px' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--red-dark)' }}>
            ₹{Math.round(employees.reduce((s, e) => s + e.salary, 0) / 1000)}K
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Payroll</div>
        </div>
      </div>

      {loading ? (
        <div className="loader-wrap"><div className="spinner" /><span>Loading staff...</span></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><p>No employees found.</p></div>
      ) : (
        Object.entries(roleGroups).map(([role, emps]) => (
          <div key={role} className="card gap-md">
            <div className="card-header">
              <span className="dot-red" />
              <h2>{role}</h2>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>{emps.length}</span>
            </div>
            <div className="card-body" style={{ paddingTop: 0 }}>
              {emps.map(emp => (
                <div key={emp.name} className="emp-item">
                  <div className="emp-avatar">{emp.name.charAt(0).toUpperCase()}</div>
                  <div className="emp-info">
                    <div className="emp-name">{emp.name}</div>
                    <div className="emp-role">
                      ₹{emp.salary.toLocaleString('en-IN')}/mo
                      {emp.advance > 0 && <span style={{ color: 'var(--red)', marginLeft: 6 }}>Adv: ₹{emp.advance}</span>}
                    </div>
                  </div>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(emp)}
                    disabled={deleting === emp.name}
                    style={{ fontSize: 11 }}
                  >
                    {deleting === emp.name ? '...' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Add Employee Modal */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              Add New Employee
              <button className="modal-close" onClick={() => setShowAdd(false)}>✕</button>
            </div>

            <div className="field">
              <label>Full Name *</label>
              <input
                placeholder="Enter full name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Role / Department *</label>
              <input
                placeholder="e.g. PRODUCTION, MANAGER"
                value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className="field">
              <label>Monthly Salary (₹) *</label>
              <input
                type="number"
                placeholder="15000"
                value={form.salary}
                onChange={e => setForm(f => ({ ...f, salary: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Password (optional)</label>
              <input
                placeholder="dexter1"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              />
            </div>

            <button className="btn btn-primary" onClick={handleAdd} disabled={adding}>
              {adding ? 'Adding...' : '+ Add Employee'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
