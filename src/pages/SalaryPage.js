import React, { useState, useEffect, useCallback } from 'react';
import { api, STATUS_COLORS } from '../utils/api';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

export default function SalaryPage() {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear]   = useState(today.getFullYear());
  const [data, setData]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const [advanceEdit, setAdvanceEdit] = useState({});
  const [savingAdvance, setSavingAdvance] = useState({});
  const [perDayEdit, setPerDayEdit] = useState({});
  const [savingPerDay, setSavingPerDay] = useState({});
  const [toast, setToast] = useState({ show: false, msg: '', type: '' });

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: '', type: '' }), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getSalary(month, year);
      setData(res.salary || []);
    } catch (e) {
      setError(e.message || 'Failed to load salary data');
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  const handleAdvanceSave = async (name) => {
    const val = advanceEdit[name];
    if (val === undefined || val === '') return;
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) { showToast('Enter a valid advance amount', 'error'); return; }
    setSavingAdvance(s => ({ ...s, [name]: true }));
    try {
      await api.updateAdvance(name, num);
      showToast(`Advance updated for ${name}`);
      setAdvanceEdit(a => ({ ...a, [name]: undefined }));
      load();
    } catch (e) {
      showToast(e.message || 'Failed to update advance', 'error');
    } finally {
      setSavingAdvance(s => ({ ...s, [name]: false }));
    }
  };

  const handlePerDaySave = async (name) => {
    const val = perDayEdit[name];
    if (val === undefined || val === '') return;
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) { showToast('Enter a valid per day rate', 'error'); return; }
    const monthlySalary = Math.round(num * 30);
    setSavingPerDay(s => ({ ...s, [name]: true }));
    try {
      await api.updateSalary(name, monthlySalary);
      showToast(`Per day rate updated for ${name} (Monthly: ₹${monthlySalary.toLocaleString('en-IN')})`);
      setPerDayEdit(a => ({ ...a, [name]: undefined }));
      load();
    } catch (e) {
      showToast(e.message || 'Failed to update salary', 'error');
    } finally {
      setSavingPerDay(s => ({ ...s, [name]: false }));
    }
  };

  const totalPayable = data.reduce((sum, r) => sum + (r.netSalary || 0), 0);
  const totalPresent = data.reduce((sum, r) => sum + (r.presentDays || 0), 0);
  const totalAbsent  = data.reduce((sum, r) => sum + (r.absentDays || 0), 0);

  const yearOpts = [];
  for (let y = today.getFullYear() - 1; y <= today.getFullYear() + 1; y++) yearOpts.push(y);

  return (
    <div className="salary-page">
      {/* Month/Year Selector */}
      <div className="month-selector-bar">
        <select value={month} onChange={e => setMonth(+e.target.value)} className="sel">
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={e => setYear(+e.target.value)} className="sel">
          {yearOpts.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button className="btn-refresh" onClick={load} title="Refresh">⟳</button>
      </div>

      {/* Summary Cards */}
      {!loading && data.length > 0 && (
        <div className="salary-summary-cards">
          <div className="scard scard-green">
            <div className="scard-val">₹{totalPayable.toLocaleString('en-IN')}</div>
            <div className="scard-label">Total Payable</div>
          </div>
          <div className="scard scard-blue">
            <div className="scard-val">{totalPresent}</div>
            <div className="scard-label">Present Days</div>
          </div>
          <div className="scard scard-red">
            <div className="scard-val">{totalAbsent}</div>
            <div className="scard-label">Absent Days</div>
          </div>
          <div className="scard scard-purple">
            <div className="scard-val">{data.length}</div>
            <div className="scard-label">Employees</div>
          </div>
        </div>
      )}

      {loading && (
        <div className="center-msg">
          <div className="spinner" />
          <p>Loading salary for {MONTHS[month - 1]} {year}…</p>
        </div>
      )}

      {!loading && error && (
        <div className="error-box">
          <span>⚠️ {error}</span>
          <button onClick={load} className="btn-retry">Retry</button>
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="center-msg empty">
          <div className="empty-icon">📋</div>
          <p>No salary data for {MONTHS[month - 1]} {year}</p>
          <small>Mark attendance first to generate salary records</small>
        </div>
      )}

      {/* Salary List */}
      {!loading && !error && data.length > 0 && (
        <div className="salary-list">
          {data.map((row, idx) => {
            const isExpanded = expandedRow === idx;
            const pct = row.workingDays > 0
              ? Math.round((row.presentDays / row.workingDays) * 100)
              : 0;

            // live preview: if user typed a new per-day rate, show what monthly would be
            const livePerDay = perDayEdit[row.name] !== undefined ? parseFloat(perDayEdit[row.name]) || 0 : null;
            const liveMonthly = livePerDay !== null ? Math.round(livePerDay * 30) : null;

            return (
              <div key={row.name} className={`salary-card ${isExpanded ? 'expanded' : ''}`}>
                {/* Card Header */}
                <div
                  className="salary-card-header"
                  onClick={() => setExpandedRow(isExpanded ? null : idx)}
                >
                  <div className="emp-avatar">{(row.name || '?')[0].toUpperCase()}</div>
                  <div className="emp-info">
                    <div className="emp-name">{row.name}</div>
                    <div className="emp-role">{row.role || '—'}</div>
                  </div>
                  <div className="emp-salary-net">
                    <div className="net-amount">₹{(row.netSalary || 0).toLocaleString('en-IN')}</div>
                    <div className={`net-label ${row.netSalary < row.monthlySalary ? 'deducted' : 'full'}`}>
                      {row.netSalary < row.monthlySalary ? 'Deducted' : 'Full Pay'}
                    </div>
                  </div>
                  <div className={`chevron ${isExpanded ? 'open' : ''}`}>▾</div>
                </div>

                {/* Progress bar */}
                <div className="attendance-bar-wrap">
                  <div className="attendance-bar">
                    <div
                      className="attendance-bar-fill"
                      style={{ width: `${pct}%`, background: pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444' }}
                    />
                  </div>
                  <span className="bar-pct">{pct}%</span>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="salary-card-details">
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="di-label">Monthly Salary</span>
                        <span className="di-val">₹{(row.monthlySalary || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="detail-item">
                        <span className="di-label">Working Days</span>
                        <span className="di-val">{row.workingDays || 0}</span>
                      </div>
                      <div className="detail-item">
                        <span className="di-label">Present</span>
                        <span className="di-val present">{row.presentDays || 0}</span>
                      </div>
                      <div className="detail-item">
                        <span className="di-label">Absent</span>
                        <span className="di-val absent">{row.absentDays || 0}</span>
                      </div>
                      <div className="detail-item">
                        <span className="di-label">Week Off</span>
                        <span className="di-val wo">{row.weekOffDays || 0}</span>
                      </div>
                      <div className="detail-item">
                        <span className="di-label">Worked WO</span>
                        <span className="di-val wop">{row.workedWODays || 0}</span>
                      </div>
                      <div className="detail-item">
                        <span className="di-label">Per Day Rate</span>
                        <span className="di-val">₹{(row.perDaySalary || 0).toFixed(0)}</span>
                      </div>
                      <div className="detail-item">
                        <span className="di-label">Earned</span>
                        <span className="di-val">₹{(row.earnedSalary || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="detail-item">
                        <span className="di-label">Advance</span>
                        <span className="di-val advance">₹{(row.advance || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="detail-item highlight">
                        <span className="di-label">Net Payable</span>
                        <span className="di-val net">₹{(row.netSalary || 0).toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {/* ── Per Day Rate Edit ── */}
                    <div className="advance-edit-section">
                      <label className="adv-label">
                        Update Per Day Rate
                        <span className="adv-hint"> (saves as monthly = per day × 30)</span>
                      </label>
                      <div className="adv-row">
                        <span className="adv-prefix">₹</span>
                        <input
                          type="number"
                          className="adv-input"
                          placeholder={row.perDaySalary ? row.perDaySalary.toFixed(0) : '0'}
                          value={perDayEdit[row.name] !== undefined ? perDayEdit[row.name] : ''}
                          onChange={e => setPerDayEdit(a => ({ ...a, [row.name]: e.target.value }))}
                          min="0"
                        />
                        <button
                          className="btn-adv-save"
                          onClick={() => handlePerDaySave(row.name)}
                          disabled={savingPerDay[row.name] || perDayEdit[row.name] === undefined || perDayEdit[row.name] === ''}
                        >
                          {savingPerDay[row.name] ? '…' : 'Save'}
                        </button>
                      </div>
                      {liveMonthly !== null && (
                        <div className="adv-preview">
                          → Monthly salary will be set to <strong>₹{liveMonthly.toLocaleString('en-IN')}</strong>
                        </div>
                      )}
                    </div>

                    {/* ── Advance Edit ── */}
                    <div className="advance-edit-section">
                      <label className="adv-label">Update Advance Amount</label>
                      <div className="adv-row">
                        <span className="adv-prefix">₹</span>
                        <input
                          type="number"
                          className="adv-input"
                          placeholder={row.advance || '0'}
                          value={advanceEdit[row.name] !== undefined ? advanceEdit[row.name] : ''}
                          onChange={e => setAdvanceEdit(a => ({ ...a, [row.name]: e.target.value }))}
                          min="0"
                        />
                        <button
                          className="btn-adv-save"
                          onClick={() => handleAdvanceSave(row.name)}
                          disabled={savingAdvance[row.name] || advanceEdit[row.name] === undefined || advanceEdit[row.name] === ''}
                        >
                          {savingAdvance[row.name] ? '…' : 'Save'}
                        </button>
                      </div>
                    </div>

                    {/* Attendance Breakdown */}
                    {row.breakdown && row.breakdown.length > 0 && (
                      <div className="breakdown-section">
                        <div className="breakdown-title">Attendance Breakdown</div>
                        <div className="breakdown-chips">
                          {row.breakdown.map(b => (
                            <span
                              key={b.date}
                              className="breakdown-chip"
                              style={{
                                background: (STATUS_COLORS[b.status] || STATUS_COLORS.NA).bg,
                                color: (STATUS_COLORS[b.status] || STATUS_COLORS.NA).text,
                              }}
                              title={`${b.date}: ${(STATUS_COLORS[b.status] || STATUS_COLORS.NA).label}`}
                            >
                              {b.date.split('-')[0]}
                              <span className="chip-status">{b.status}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
