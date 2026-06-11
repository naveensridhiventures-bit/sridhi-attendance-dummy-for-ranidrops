import React, { useState, useEffect, useCallback } from 'react';
import { api, getTodayDateStr,isSunday, STATUS_COLORS } from '../utils/api';
import { useApp } from '../context/AppContext';

const STATUSES = ['P', 'A', 'WO', 'WOP', 'NA'];

export default function MarkPage() {
  const { month, year, showToast } = useApp();
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [newEmpName, setNewEmpName] = useState('');
  const [status, setStatus] = useState('P');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [todayStatus, setTodayStatus] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);

  const today = new Date();
  const todayDate = today.getDate();
  const todayStr = getTodayDateStr(month, year);

  const loadEmployees = useCallback(async () => {
    try {
      const res = await api.getEmployees();
      setEmployees(res.employees || []);
    } catch (e) {
      showToast('Failed to load employees', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadAttendance = useCallback(async () => {
    try {
      const res = await api.getAttendance(month, year);
      setAttendanceData(res);
    } catch (e) {
      // attendance sheet may not exist yet
    }
  }, [month, year]);

  useEffect(() => {
    loadEmployees();
    loadAttendance();
  }, [loadEmployees, loadAttendance]);

  // Auto-set status based on today being Sunday
  useEffect(() => {
    if (isSunday(todayDate, month, year)) {
      setStatus('WO');
    } else {
      setStatus('P');
    }
  }, [todayDate, month, year]);

  // Check if selected employee already has attendance today
  useEffect(() => {
    const empName = selectedEmp || newEmpName.trim();
    if (!empName || !attendanceData?.attendance) {
      setTodayStatus(null);
      return;
    }
    const rec = attendanceData.attendance.find(
      r => r.name.toLowerCase() === empName.toLowerCase()
    );
    if (rec && rec.days[todayStr]) {
      setTodayStatus(rec.days[todayStr]);
    } else {
      setTodayStatus(null);
    }
  }, [selectedEmp, newEmpName, attendanceData, todayStr]);

  const handleSubmit = async () => {
    const empName = selectedEmp || newEmpName.trim();
    if (!empName) return showToast('Select or enter employee name', 'error');
    if (!status) return showToast('Select attendance status', 'error');

    setSubmitting(true);
    try {
      await api.markAttendance(empName, todayStr, status, month, year);
      showToast(`✓ ${empName} marked ${status}`, 'success');
      setTodayStatus(status);
      // Reload attendance
      loadAttendance();
    } catch (e) {
      showToast(e.message || 'Failed to mark attendance', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const stats = getStatsFromAttendance(attendanceData, todayStr);

  return (
    <div>
      {/* Hero */}
      <div className="hero-banner">
        <div className="hero-subtitle">● Live System</div>
        <h1>Mark Your<br /><em>Attendance</em></h1>
        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hero-stat-val">{stats.total || '—'}</div>
            <div className="hero-stat-label">Active Staff</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-val">{todayDate} {getShortMonth(month)}</div>
            <div className="hero-stat-label">Today</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-val">{getMonthName(month).substring(0, 3)}</div>
            <div className="hero-stat-label">Month</div>
          </div>
        </div>
      </div>

      {/* Employee Details Card */}
      <div className="card gap-md">
        <div className="card-header">
          <span className="dot-red" />
          <h2>Employee Details</h2>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="loader-wrap"><div className="spinner" /></div>
          ) : (
            <>
              <div className="field">
                <label>Select Employee</label>
                <select
                  value={selectedEmp}
                  onChange={e => { setSelectedEmp(e.target.value); setNewEmpName(''); }}
                >
                  <option value="">— Choose employee —</option>
                  {employees.map(emp => (
                    <option key={emp.name} value={emp.name}>{emp.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, margin: '6px 0' }}>
                or type new
              </div>

              <div className="field">
                <label>New Employee Name</label>
                <input
                  placeholder="Enter full name..."
                  value={newEmpName}
                  onChange={e => { setNewEmpName(e.target.value); setSelectedEmp(''); }}
                />
              </div>

              {todayStatus && (
                <div style={{
                  background: STATUS_COLORS[todayStatus]?.bg || '#f1f5f9',
                  color: STATUS_COLORS[todayStatus]?.text || '#64748b',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 10,
                }}>
                  Already marked: <strong>{todayStatus}</strong> ({STATUS_COLORS[todayStatus]?.label})
                </div>
              )}

              <div className="field">
                <label>Attendance Status</label>
                <div className="status-grid">
                  {STATUSES.map(s => (
                    <button
                      key={s}
                      className={`status-chip ${status === s ? 'selected' : ''}`}
                      data-status={s}
                      onClick={() => setStatus(s)}
                    >
                      <span className="chip-code">{s}</span>
                      <span className="chip-label">{STATUS_COLORS[s].label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Location Card */}
      <div className="card gap-md">
        <div className="card-header">
          <span className="dot-red" />
          <h2>Date</h2>
        </div>
        <div className="card-body">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#f0fdf4',
            border: '1.5px solid #86efac',
            borderRadius: 10,
            padding: '10px 14px',
          }}>
            <span style={{ fontSize: 22 }}>📅</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>Marking for Today</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{todayStr}</div>
            </div>
            <span style={{ marginLeft: 'auto', color: '#22c55e', fontSize: 18 }}>✓</span>
          </div>
        </div>
      </div>

      {/* Submit */}
      <button
        className="btn btn-primary gap-md"
        onClick={handleSubmit}
        disabled={submitting || (!selectedEmp && !newEmpName.trim())}
      >
        {submitting ? <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> : '✓'}
        {submitting ? 'Submitting...' : 'Submit Attendance'}
      </button>

      {/* Status Reference */}
      <div className="card">
        <div className="card-header">
          <span className="dot-red" />
          <h2>Status Reference</h2>
        </div>
        <div className="status-ref">
          {STATUSES.map(s => (
            <div key={s} className="status-ref-item">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[s].dot, flexShrink: 0, display: 'inline-block' }} />
              <span>{s} — {STATUS_COLORS[s].label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getStatsFromAttendance(data, todayStr) {
  if (!data?.attendance) return { total: 0, present: 0, absent: 0 };
  const total = data.attendance.length;
  let present = 0, absent = 0;
  data.attendance.forEach(r => {
    const v = r.days[todayStr];
    if (v === 'P' || v === 'WOP') present++;
    else if (v === 'A') absent++;
  });
  return { total, present, absent };
}

function getMonthName(m) {
  return ['January','February','March','April','May','June',
    'July','August','September','October','November','December'][m - 1];
}

function getShortMonth(m) {
  return getMonthName(m).substring(0, 3);
}
