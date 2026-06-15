import React, { useState } from 'react';
import { api } from '../utils/api';

/**
 * PasswordGate — wraps any page that needs employee password auth.
 * Usage: <PasswordGate employees={employees} onUnlock={(name) => ...}>
 *          <ProtectedPage unlockedName={name} />
 *        </PasswordGate>
 *
 * Props:
 *   employees  — array of { name, role } for the dropdown
 *   onUnlock   — called with employee name when password verified
 *   children   — rendered after unlock (receives unlockedName via React.cloneElement)
 *   title      — heading shown on the lock screen
 *   icon       — emoji icon for the lock screen
 */
export default function PasswordGate({ employees = [], title = 'Protected', icon = '🔒', children }) {
  const [selectedName, setSelectedName] = useState('');
  const [password, setPassword]         = useState('');
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [unlockedName, setUnlockedName] = useState(null);

  const handleUnlock = async () => {
    if (!selectedName) { setError('Please select your name'); return; }
    if (!password)     { setError('Please enter your password'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await api.verifyPassword(selectedName, password);
      if (res.valid) {
        setUnlockedName(selectedName);
      } else {
        setError('❌ Incorrect password. Try again.');
        setPassword('');
      }
    } catch (e) {
      setError('Network error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Already unlocked — render children with the name injected
  if (unlockedName) {
    return (
      <div>
        <div style={styles.unlockedBar}>
          <span>🔓 Viewing as <strong>{unlockedName}</strong></span>
          <button onClick={() => { setUnlockedName(null); setPassword(''); }} style={styles.lockBtn}>
            Lock
          </button>
        </div>
        {React.Children.map(children, child =>
          React.cloneElement(child, { unlockedName })
        )}
      </div>
    );
  }

  // Lock screen
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.iconWrap}>{icon}</div>
        <h2 style={styles.title}>{title}</h2>
        <p style={styles.subtitle}>Enter your credentials to view this section</p>

        <label style={styles.label}>Your Name</label>
        <select
          value={selectedName}
          onChange={e => { setSelectedName(e.target.value); setError(''); }}
          style={styles.select}
        >
          <option value="">— Select your name —</option>
          {employees.map(emp => (
            <option key={emp.name} value={emp.name}>{emp.name}</option>
          ))}
        </select>

        <label style={styles.label}>Password</label>
        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={e => { setPassword(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleUnlock()}
          style={styles.input}
        />

        {error && <div style={styles.error}>{error}</div>}

        <button
          onClick={handleUnlock}
          disabled={loading}
          style={styles.btn}
        >
          {loading ? 'Verifying…' : '🔓 Unlock'}
        </button>
      </div>
    </div>
  );
}

const styles = {
  page:       { minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card:       { background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.10)', padding: '32px 28px', width: '100%', maxWidth: 380 },
  iconWrap:   { fontSize: 48, textAlign: 'center', marginBottom: 12 },
  title:      { margin: '0 0 6px', textAlign: 'center', fontSize: 20, fontWeight: 700, color: '#1e293b' },
  subtitle:   { margin: '0 0 24px', textAlign: 'center', fontSize: 13, color: '#64748b' },
  label:      { display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 },
  select:     { width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 14, marginBottom: 16, background: '#f8fafc', boxSizing: 'border-box' },
  input:      { width: '100%', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', fontSize: 14, marginBottom: 16, boxSizing: 'border-box', outline: 'none' },
  error:      { background: '#fee2e2', color: '#dc2626', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 12, textAlign: 'center' },
  btn:        { width: '100%', background: '#1e40af', color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontSize: 15, fontWeight: 700, cursor: 'pointer' },
  unlockedBar:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '8px 16px', margin: '12px 16px 0', fontSize: 13, color: '#15803d' },
  lockBtn:    { background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
};
