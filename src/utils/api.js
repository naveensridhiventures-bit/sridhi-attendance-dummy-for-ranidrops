// ── API Configuration ─────────────────────────────────────────
const API_URL = 'https://script.google.com/macros/s/AKfycbzgNoE1fV4xFPIIJZn4txv2TqV_I66FL7opc1IEG8zj5Q7ROQL57pu7RAj_rzNZj5tVfw/exec';
const CACHE_TTL = 5 * 60 * 1000;
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

async function call(params) {
  const query = new URLSearchParams(params).toString();
  const cacheKey = query;

  const action = params.action || '';
  const isRead = action.startsWith('get');
  if (isRead) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }

  const res = await fetch(`${API_URL}?${query}`);
  if (!res.ok) throw new Error('Network error');
  const data = await res.json();
  if (data.error) throw new Error(data.error);

  if (isRead) setCache(cacheKey, data);
  return data;
}

export const api = {
  getEmployees:    () => call({ action: 'getEmployees' }),
  verifyPassword:  (name, password) => call({ action: 'verifyPassword', name, password }),
  getAttendance:   (month, year) => call({ action: 'getAttendance', month, year }),
  getSalary:       (month, year) => call({ action: 'getSalary', month, year }),
  getPermissions:  (month, year) => call({ action: 'getPermissions', month, year }),

  markAttendance: (employeeName, date, status, month, year) => {
    clearCache('action=getAttendance');
    clearCache('action=getSalary');
    return call({ action: 'markAttendance', employeeName, date, status, month, year });
  },

  addEmployee: (name, role, salary, password) => {
    clearCache('action=getEmployees');
    return call({ action: 'addEmployee', name, role, salary, password });
  },

  deleteEmployee: (name) => {
    clearCache('action=getEmployees');
    return call({ action: 'deleteEmployee', name });
  },

  updateAdvance: (name, advance) => {
    clearCache('action=getSalary');
    return call({ action: 'updateAdvance', name, advance });
  },

  updateSalary: (name, salary) => {
    clearCache('action=getSalary');
    return call({ action: 'updateSalary', name, salary });
  },

  addPermission: (name, reason, date, hours, month, year) => {
    clearCache('action=getPermissions');
    return call({ action: 'addPermission', name, reason, date, hours, month, year });
  },

  deletePermission: (sno, month, year) => {
    clearCache('action=getPermissions');
    return call({ action: 'deletePermission', sno, month, year });
  },
};

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
  P:   { bg: '#dcfce7', text: '#15803d', dot: '#22c55e', label: 'Present' },
  A:   { bg: '#fee2e2', text: '#dc2626', dot: '#ef4444', label: 'Absent' },
  WO:  { bg: '#fef9c3', text: '#a16207', dot: '#eab308', label: 'Week Off' },
  WOP: { bg: '#f3e8ff', text: '#7e22ce', dot: '#a855f7', label: 'Worked WO' },
  NA:  { bg: '#f1f5f9', text: '#64748b', dot: '#94a3b8', label: 'N/A' },
};
