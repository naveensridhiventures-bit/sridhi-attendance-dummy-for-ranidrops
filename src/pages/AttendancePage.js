import React, { useState, useEffect, useCallback } from 'react';
import { api, STATUS_COLORS } from '../utils/api';
import { useApp } from '../context/AppContext';

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December'];

export default function AttendancePage() {
  const { month, setMonth, year, setYear, showToast } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAttendance(month, year);
      setData(res);
    } catch (e) {
      showToast('Failed to load attendance', 'error');
    } finally {
      setLoading(false);
    }
  }, [month, year, showToast]);

  useEffect(() => { load(); }, [load]);

  const years = [2025, 2026, 2027];
  const filtered = (data?.attendance || []).filter(r =>
    !search || r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="section-title">Attendance Register</div>

      {/* Month/Year selector */}
      <div className="card gap-md">
        <div className="card-body" style={{ paddingTop: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 2 }}>
              <label>Month</label>
              <select value={month} onChange={e => setMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label>Year</label>
              <select value={year} onChange={e => setYear(Number(e.target.value))}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-secondary btn-sm" onClick={load}>↻</button>
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <input
              placeholder="Search employee..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loader-wrap"><div className="spinner" /><span>Loading attendance...</span></div>
      ) : !data?.sheetExists ? (
        <div className="empty-state">
          <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
          </svg>
          <p>No attendance sheet for {MONTHS[month - 1]} {year}.</p>
          <p style={{ marginTop: 6, fontSize: 12 }}>Start marking to create it.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><p>No employees found.</p></div>
      ) : (
        <div className="card">
          <div className="att-scroll-wrap">
            <table className="att-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  {(data?.dates || []).map(d => (
                    <th key={d} style={{ fontSize: 9, padding: '5px 4px' }}>
                      {d.split('-')[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.name}>
                    <td style={{ fontSize: 12 }}>{row.name}</td>
                    {(data?.dates || []).map(d => {
                      const v = row.days[d] || '';
                      return (
                        <td key={d}>
                          {v ? (
                            <span className={`att-cell att-cell-${v}`}>{v}</span>
                          ) : (
                            <span style={{ color: '#cbd5e1', fontSize: 10 }}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary row */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
              Showing {filtered.length} employees
            </div>
            <div className="status-ref">
              {['P','A','WO','WOP','NA'].map(s => (
                <div key={s} className="status-ref-item">
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[s].dot, display: 'inline-block', flexShrink: 0 }} />
                  <span>{s} — {STATUS_COLORS[s].label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
