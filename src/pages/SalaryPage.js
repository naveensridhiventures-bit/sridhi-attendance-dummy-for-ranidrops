import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../utils/api';
import { useApp } from '../context/AppContext';

export default function SalaryPage({ unlockedName }) {
  const { month, year } = useApp();
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [expanded, setExpanded] = useState(null);

  // Per-employee edit state
  const [editPerDay, setEditPerDay]   = useState({});
  const [editAdvance, setEditAdvance] = useState({});
  const [saving, setSaving]           = useState({});
  const [saveMsg, setSaveMsg]         = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getSalary(month, year);
      const all = data.rows || [];
      // Only show the logged-in employee's row
      const filtered = unlockedName
        ? all.filter(r => r.name === unlockedName)
        : all;
      setRows(filtered);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  // Toggle card expand
  const toggle = (name) => {
    setExpanded(prev => prev === name ? null : name);
    setSaveMsg({});
  };

  // Save per-day rate → converts to monthly (perDay × 30)
  const savePerDay = async (row) => {
    const perDay = Number(editPerDay[row.name]);
    if (!perDay || perDay <= 0) return;
    const monthly = perDay * 30;
    setSaving(s => ({ ...s, [row.name]: 'salary' }));
    try {
      await api.updateSalary(row.name, monthly);
      setSaveMsg(m => ({ ...m, [row.name]: `✅ Monthly salary set to ₹${monthly.toLocaleString()}` }));
      setEditPerDay(p => ({ ...p, [row.name]: '' }));
      await load();
    } catch (e) {
      setSaveMsg(m => ({ ...m, [row.name]: `❌ ${e.message}` }));
    } finally {
      setSaving(s => ({ ...s, [row.name]: null }));
    }
  };

  // Save advance
  const saveAdvance = async (row) => {
    const advance = Number(editAdvance[row.name]);
    if (isNaN(advance)) return;
    setSaving(s => ({ ...s, [row.name]: 'advance' }));
    try {
      await api.updateAdvance(row.name, advance);
      setSaveMsg(m => ({ ...m, [row.name]: `✅ Advance updated to ₹${advance.toLocaleString()}` }));
      setEditAdvance(a => ({ ...a, [row.name]: '' }));
      await load();
    } catch (e) {
      setSaveMsg(m => ({ ...m, [row.name]: `❌ ${e.message}` }));
    } finally {
      setSaving(s => ({ ...s, [row.name]: null }));
    }
  };

  const monthNames = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];

  if (loading) return (
    <div style={styles.center}>
      <div style={styles.spinner} />
      <p style={{ color: '#64748b', marginTop: 12 }}>Loading salary data…</p>
    </div>
  );

  if (error) return (
    <div style={styles.center}>
      <p style={{ color: '#dc2626' }}>⚠️ {error}</p>
      <button onClick={load} style={styles.retryBtn}>Retry</button>
    </div>
  );

  const totals = rows.reduce((acc, r) => ({
    earned:  acc.earned  + (r.earnedSalary || 0),
    advance: acc.advance + (r.advance || 0),
    net:     acc.net     + (r.netPayable || 0),
  }), { earned: 0, advance: 0, net: 0 });

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>💰 Salary — {monthNames[month - 1]} {year}</h2>
        <button onClick={load} style={styles.refreshBtn}>↻ Refresh</button>
      </div>

      {/* Summary cards */}
      <div style={styles.summaryRow}>
        <SummaryCard label="Total Earned"  value={totals.earned}  color="#22c55e" />
        <SummaryCard label="Total Advance" value={totals.advance} color="#f59e0b" />
        <SummaryCard label="Net Payable"   value={totals.net}     color="#3b82f6" />
      </div>

      {/* Employee rows */}
      {rows.length === 0
        ? <p style={styles.empty}>No employees found. Add employees first.</p>
        : rows.map(row => {
          const isOpen   = expanded === row.name;
          const perDayVal = editPerDay[row.name] ?? '';
          const previewMonthly = perDayVal ? Number(perDayVal) * 30 : null;
          const advanceVal = editAdvance[row.name] ?? '';

          return (
            <div key={row.name} style={styles.card}>
              {/* Card header — tap to expand */}
              <div style={styles.cardHeader} onClick={() => toggle(row.name)}>
                <div>
                  <div style={styles.empName}>{row.name}</div>
                  {row.warning
                    ? <span style={styles.warnBadge}>⚠️ No Salary Set</span>
                    : <span style={styles.salaryBadge}>₹{(row.monthlySalary || 0).toLocaleString()}/mo</span>
                  }
                </div>
                <div style={styles.netBox}>
                  <div style={styles.netLabel}>Net Payable</div>
                  <div style={styles.netValue}>₹{(row.netPayable || 0).toLocaleString()}</div>
                </div>
                <div style={styles.chevron}>{isOpen ? '▲' : '▼'}</div>
              </div>

              {/* Attendance summary strip */}
              <div style={styles.strip}>
                {[
                  ['Present', row.presentDays, '#22c55e'],
                  ['Absent',  row.absentDays,  '#ef4444'],
                  ['Week Off', row.weekOff,    '#eab308'],
                  ['Worked WO', row.workedWO,  '#a855f7'],
                  ['Worked',  row.workedDays,  '#3b82f6'],
                ].map(([label, val, color]) => (
                  <div key={label} style={styles.stripItem}>
                    <span style={{ ...styles.stripDot, background: color }} />
                    <span style={styles.stripLabel}>{label}</span>
                    <span style={styles.stripVal}>{val ?? 0}</span>
                  </div>
                ))}
              </div>

              {/* Expanded section */}
              {isOpen && (
                <div style={styles.expanded}>
                  {/* Earned / advance / net row */}
                  <div style={styles.calcRow}>
                    <CalcItem label="Per Day"     value={`₹${row.perDaySalary || 0}`} />
                    <CalcItem label="Worked Days" value={row.workedDays ?? 0} />
                    <CalcItem label="Earned"      value={`₹${(row.earnedSalary || 0).toLocaleString()}`} accent />
                  </div>
                  <div style={styles.calcRow}>
                    <CalcItem label="Advance"     value={`₹${(row.advance || 0).toLocaleString()}`} warn />
                    <CalcItem label="Net Payable" value={`₹${(row.netPayable || 0).toLocaleString()}`} accent />
                  </div>

                  <div style={styles.divider} />

                  {/* Edit per-day rate */}
                  <div style={styles.editSection}>
                    <label style={styles.editLabel}>📝 Update Per Day Rate</label>
                    <div style={styles.editRow}>
                      <input
                        type="number"
                        placeholder={`Current: ₹${row.perDaySalary || 0}`}
                        value={perDayVal}
                        onChange={e => setEditPerDay(p => ({ ...p, [row.name]: e.target.value }))}
                        style={styles.input}
                        min="0"
                      />
                      <button
                        onClick={() => savePerDay(row)}
                        disabled={!perDayVal || saving[row.name] === 'salary'}
                        style={styles.saveBtn}
                      >
                        {saving[row.name] === 'salary' ? '…' : 'Save'}
                      </button>
                    </div>
                    {previewMonthly && (
                      <div style={styles.preview}>
                        → Monthly salary will be set to <strong>₹{previewMonthly.toLocaleString()}</strong>
                        &nbsp;(₹{Number(perDayVal).toLocaleString()} × 30)
                      </div>
                    )}
                  </div>

                  {/* Edit advance */}
                  <div style={styles.editSection}>
                    <label style={styles.editLabel}>💳 Update Advance</label>
                    <div style={styles.editRow}>
                      <input
                        type="number"
                        placeholder={`Current: ₹${row.advance || 0}`}
                        value={advanceVal}
                        onChange={e => setEditAdvance(a => ({ ...a, [row.name]: e.target.value }))}
                        style={styles.input}
                        min="0"
                      />
                      <button
                        onClick={() => saveAdvance(row)}
                        disabled={advanceVal === '' || saving[row.name] === 'advance'}
                        style={styles.saveBtn}
                      >
                        {saving[row.name] === 'advance' ? '…' : 'Save'}
                      </button>
                    </div>
                  </div>

                  {/* Save message */}
                  {saveMsg[row.name] && (
                    <div style={styles.saveMsg}>{saveMsg[row.name]}</div>
                  )}
                </div>
              )}
            </div>
          );
        })
      }
    </div>
  );
}

function SummaryCard({ label, value, color }) {
  return (
    <div style={{ ...styles.sumCard, borderTop: `3px solid ${color}` }}>
      <div style={styles.sumLabel}>{label}</div>
      <div style={{ ...styles.sumValue, color }}>₹{value.toLocaleString()}</div>
    </div>
  );
}

function CalcItem({ label, value, accent, warn }) {
  return (
    <div style={styles.calcItem}>
      <div style={styles.calcLabel}>{label}</div>
      <div style={{
        ...styles.calcValue,
        color: accent ? '#16a34a' : warn ? '#dc2626' : '#1e293b',
        fontWeight: accent || warn ? 700 : 500,
      }}>{value}</div>
    </div>
  );
}

const styles = {
  page:       { padding: '16px', maxWidth: 640, margin: '0 auto' },
  center:     { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 40, gap: 12 },
  spinner:    { width: 36, height: 36, border: '3px solid #e2e8f0', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title:      { margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' },
  refreshBtn: { background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 },
  retryBtn:   { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' },
  summaryRow: { display: 'flex', gap: 10, marginBottom: 16 },
  sumCard:    { flex: 1, background: '#fff', borderRadius: 10, padding: '12px 10px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textAlign: 'center' },
  sumLabel:   { fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: 500 },
  sumValue:   { fontSize: 15, fontWeight: 700 },
  card:       { background: '#fff', borderRadius: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', marginBottom: 12, overflow: 'hidden' },
  cardHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', cursor: 'pointer', gap: 8 },
  empName:    { fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 3 },
  salaryBadge:{ background: '#dbeafe', color: '#1d4ed8', fontSize: 11, borderRadius: 99, padding: '2px 8px', fontWeight: 600 },
  warnBadge:  { background: '#fef9c3', color: '#a16207', fontSize: 11, borderRadius: 99, padding: '2px 8px', fontWeight: 600 },
  netBox:     { textAlign: 'right', marginLeft: 'auto' },
  netLabel:   { fontSize: 10, color: '#64748b', marginBottom: 2 },
  netValue:   { fontSize: 17, fontWeight: 700, color: '#16a34a' },
  chevron:    { color: '#94a3b8', fontSize: 12, marginLeft: 6 },
  strip:      { display: 'flex', gap: 0, background: '#f8fafc', borderTop: '1px solid #f1f5f9', padding: '8px 16px', flexWrap: 'wrap', gap: 10 },
  stripItem:  { display: 'flex', alignItems: 'center', gap: 4 },
  stripDot:   { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  stripLabel: { fontSize: 11, color: '#64748b' },
  stripVal:   { fontSize: 12, fontWeight: 700, color: '#1e293b', marginLeft: 2 },
  expanded:   { padding: '16px', borderTop: '1px solid #f1f5f9' },
  calcRow:    { display: 'flex', gap: 10, marginBottom: 10 },
  calcItem:   { flex: 1, background: '#f8fafc', borderRadius: 8, padding: '10px 12px' },
  calcLabel:  { fontSize: 11, color: '#64748b', marginBottom: 4 },
  calcValue:  { fontSize: 15 },
  divider:    { height: 1, background: '#f1f5f9', margin: '12px 0' },
  editSection:{ marginBottom: 14 },
  editLabel:  { fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 },
  editRow:    { display: 'flex', gap: 8 },
  input:      { flex: 1, border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none' },
  saveBtn:    { background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontWeight: 600, cursor: 'pointer', fontSize: 13 },
  preview:    { marginTop: 6, fontSize: 12, color: '#475569', background: '#eff6ff', borderRadius: 6, padding: '6px 10px' },
  saveMsg:    { marginTop: 10, fontSize: 13, textAlign: 'center', fontWeight: 500 },
  empty:      { textAlign: 'center', color: '#94a3b8', padding: 40 },
};
