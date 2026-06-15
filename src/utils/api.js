// ── API Configuration ─────────────────────────────────────────
// Replace this with your deployed Google Apps Script Web App URL
const API_URL = 'https://script.google.com/macros/s/AKfycbxF7-n15m8fEmTDZZiVo_QuBtDUQj0l8mxrti6NbbKnUvHAzoC0GRbT933y_QiOeUEx_A/exec';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = {};

function getCached(key) {
  const entry = cache[key];
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key, data) {
  cache[key] = { data, ts: Date.now() };
}

export function clearCache(prefix) {
  Object.keys(cache).forEach(k => {
    if (!prefix || k.startsWith(prefix)) delete cache[k];
  });
}

async function get(params) {
  const query = new URLSearchParams(params).toString();
  const cacheKey = query;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const res = await fetch(`${API_URL}?${query}`);
  if (!res.ok) throw new Error('Network error');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  setCache(cacheKey, data);
  return data;
}

async function post(body) {
  const query = new URLSearchParams(body).toString();
  const res = await fetch(`${API_URL}?${query}`);
  if (!res.ok) throw new Error('Network error');
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export const api = {
  getEmployees: () => get({ action: 'getEmployees' }),

  getAttendance: (month, year) =>
    get({ action: 'getAttendance', month, year }),

  getSalary: (month, year) =>
    get({ action: 'getSalary', month, year }),

  getStats: (month, year) =>
    get({ action: 'getStats', month, year }),

  markAttendance: (employeeName, date, status, month, year) => {
    clearCache('action=getAttendance');
    clearCache('action=getStats');
    return post({ action: 'markAttendance', employeeName, date, status, month, year });
  },

  addEmployee: (name, role, salary, password) => {
    clearCache('action=getEmployees');
    return post({ action: 'addEmployee', name, role, salary, password });
  },

  deleteEmployee: (name) => {
    clearCache('action=getEmployees');
    return post({ action: 'deleteEmployee', name });
  },

  updateAdvance: (name, advance) => {
    clearCache('action=getSalary');
    return post({ action: 'updateAdvance', name, advance });
  },
};

// Date helpers
export function getTodayDateStr(month, year) {
  const today = new Date();
  const monthNames = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  const shortMonth = monthNames[month - 1].substring(0, 3);
  const shortYear = String(year).slice(2);
  const dd = String(today.getDate()).padStart(2, '0');
  return `${dd}-${shortMonth}-${shortYear}`;
}

export function getDateStr(date, month, year) {
  const monthNames = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];
  const shortMonth = monthNames[month - 1].substring(0, 3);
  const shortYear = String(year).slice(2);
  const dd = String(date).padStart(2, '0');
  return `${dd}-${shortMonth}-${shortYear}`;
}

export function getDaysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

export function isSunday(day, month, year) {
  return new Date(year, month - 1, day).getDay() === 0;
}

export const STATUS_COLORS = {
  P: { bg: '#dcfce7', text: '#15803d', dot: '#22c55e', label: 'Present' },
  A: { bg: '#fee2e2', text: '#dc2626', dot: '#ef4444', label: 'Absent' },
  WO: { bg: '#fef9c3', text: '#a16207', dot: '#eab308', label: 'Week Off' },
  WOP: { bg: '#f3e8ff', text: '#7e22ce', dot: '#a855f7', label: 'Worked WO' },
  NA: { bg: '#f1f5f9', text: '#64748b', dot: '#94a3b8', label: 'N/A' },
};
