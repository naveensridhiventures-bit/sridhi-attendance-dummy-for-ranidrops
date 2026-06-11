// ============================================================
// RAINDROPS ATTENDANCE - Google Apps Script Backend
// Sheet ID: 1Bn9djAIVy4GDEIDn5GN1580c_wcc8Iv2YNwx6kn9AO0
//
// HOW TO DEPLOY:
// 1. Open your Google Sheet
// 2. Extensions → Apps Script → paste this entire file
// 3. Deploy → New Deployment → Web App
//    - Execute as: Me
//    - Who has access: Anyone
// 4. Copy the Web App URL and put it in your .env file as:
//    REACT_APP_API_URL=<paste URL here>
//
// IMPORTANT: Every time you change this script, you must
// do a NEW Deployment (not redeploy existing) to see changes.
// ============================================================

const SHEET_ID = '1Bn9djAIVy4GDEIDn5GN1580c_wcc8Iv2YNwx6kn9AO0';
const SS = SpreadsheetApp.openById(SHEET_ID);

// ── Tab name constants (match your exact sheet tab names) ────
// From your screenshots:
//   Col A=index, B=Employee Name, C=01-Jun-26, D=02-Jun-26 ... (Attendance)
//   Col A=Name, B=Role, C=Monthly Salary, D=Advance, E=Active, F=Password, G=DOB (Employees)
const TABS = {
  EMPLOYEES: 'Employees',
};

// ── CORS / JSON response ─────────────────────────────────────
function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── GET router ───────────────────────────────────────────────
function doGet(e) {
  try {
    const a = e.parameter.action;
    if (a === 'getEmployees')  return json(getEmployees());
    if (a === 'getAttendance') return json(getAttendance(+e.parameter.month, +e.parameter.year));
    if (a === 'getSalary')     return json(getSalary(+e.parameter.month, +e.parameter.year));
    if (a === 'ping')          return json({ ok: true, time: new Date().toISOString() });
    return json({ error: 'Unknown action: ' + a });
  } catch (err) {
    return json({ error: err.message, stack: err.stack });
  }
}

// ── POST router ──────────────────────────────────────────────
function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    const a = d.action;
    if (a === 'markAttendance') return json(markAttendance(d));
    if (a === 'addEmployee')    return json(addEmployee(d));
    if (a === 'deleteEmployee') return json(deleteEmployee(d));
    if (a === 'updateAdvance')  return json(updateAdvance(d));
    return json({ error: 'Unknown action: ' + a });
  } catch (err) {
    return json({ error: err.message });
  }
}

// ────────────────────────────────────────────────────────────
// GET: Employees
// Reads the "Employees" tab
// Columns: A=Name, B=Role, C=Monthly Salary, D=Advance, E=Active, F=Password, G=DOB
// ────────────────────────────────────────────────────────────
function getEmployees() {
  const sheet = SS.getSheetByName(TABS.EMPLOYEES);
  if (!sheet) return { error: 'Employees tab not found', employees: [] };

  const rows = sheet.getDataRange().getValues();
  // Skip header row (row 0)
  const employees = rows.slice(1)
    .filter(r => r[0] && String(r[0]).trim() !== '')   // has a name
    .filter(r => String(r[4]).trim().toUpperCase() === 'YES')  // Active = YES
    .map((r, i) => ({
      rowIndex: i + 2,  // 1-based sheet row
      name:     String(r[0]).trim(),
      role:     String(r[1] || '').trim(),
      salary:   Number(r[2]) || 0,
      advance:  Number(r[3]) || 0,
      active:   String(r[4]).trim().toUpperCase() === 'YES',
      password: String(r[5] || '').trim(),
      dob:      r[6] ? String(r[6]) : '',
    }));

  return { employees };
}

// ────────────────────────────────────────────────────────────
// GET: Attendance for a given month/year
// Tab name: "June-2026 Attendance"
// Structure: Col A=SNo(0-based index), B=Employee Name, C onwards = daily status
// Header row: [0, 'Employee Name', '01-Jun-26', '02-Jun-26', ...]
// ────────────────────────────────────────────────────────────
function getAttendance(month, year) {
  const sheetName = monthLabel(month, year) + ' Attendance';
  const sheet = SS.getSheetByName(sheetName);

  if (!sheet) return { attendance: [], dates: [], sheetExists: false, sheetName };

  const rows   = sheet.getDataRange().getValues();
  const header = rows[0];
  // Date columns start at index 2
  const dates  = header.slice(2).map(h => String(h).trim()).filter(Boolean);

  const attendance = rows.slice(1)
    .filter(r => r[1] && String(r[1]).trim() !== '')
    .map(r => {
      const days = {};
      dates.forEach((d, i) => {
        const v = String(r[i + 2] || '').trim().toUpperCase();
        if (v) days[d] = v;
      });
      return { sno: r[0], name: String(r[1]).trim(), days };
    });

  return { attendance, dates, sheetExists: true, sheetName };
}

// ────────────────────────────────────────────────────────────
// POST: Mark attendance for one employee on today's date
// ────────────────────────────────────────────────────────────
function markAttendance(d) {
  const { employeeName, date, status, month, year } = d;
  const sheetName = monthLabel(month, year) + ' Attendance';

  let sheet = SS.getSheetByName(sheetName);
  if (!sheet) sheet = createAttendanceSheet(month, year);
  if (!sheet) return { error: 'Could not find or create attendance sheet: ' + sheetName };

  const rows   = sheet.getDataRange().getValues();
  const header = rows[0];

  // Find the column for this date
  let dateCol = -1;
  for (let c = 2; c < header.length; c++) {
    if (String(header[c]).trim() === date) { dateCol = c; break; }
  }
  if (dateCol === -1) return { error: 'Date column not found: ' + date + ' in ' + sheetName };

  // Find the employee row
  let empRow = -1;
  for (let r = 1; r < rows.length; r++) {
    if (String(rows[r][1]).trim().toLowerCase() === employeeName.toLowerCase()) {
      empRow = r; break;
    }
  }
  if (empRow === -1) return { error: 'Employee not found: ' + employeeName };

  // Write value and color
  const cell = sheet.getRange(empRow + 1, dateCol + 1);
  cell.setValue(status);
  cell.setBackground(statusColor(status));
  cell.setFontColor(statusFontColor(status));
  cell.setFontWeight('bold');

  return { success: true, employeeName, date, status };
}

// ────────────────────────────────────────────────────────────
// POST: Add a new employee to the Employees tab
// ────────────────────────────────────────────────────────────
function addEmployee(d) {
  const sheet = SS.getSheetByName(TABS.EMPLOYEES);
  if (!sheet) return { error: 'Employees tab not found' };

  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, 1, 7).setValues([[
    d.name, d.role, d.salary || 0, 0, 'YES', d.password || 'dexter1', ''
  ]]);

  return { success: true };
}

// ────────────────────────────────────────────────────────────
// POST: Deactivate an employee (set Active = NO)
// ────────────────────────────────────────────────────────────
function deleteEmployee(d) {
  const sheet = SS.getSheetByName(TABS.EMPLOYEES);
  if (!sheet) return { error: 'Employees tab not found' };

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim().toLowerCase() === d.name.toLowerCase()) {
      sheet.getRange(i + 1, 5).setValue('NO');
      return { success: true };
    }
  }
  return { error: 'Employee not found: ' + d.name };
}

// ────────────────────────────────────────────────────────────
// POST: Update advance for an employee
// ────────────────────────────────────────────────────────────
function updateAdvance(d) {
  const sheet = SS.getSheetByName(TABS.EMPLOYEES);
  if (!sheet) return { error: 'Employees tab not found' };

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim().toLowerCase() === d.name.toLowerCase()) {
      sheet.getRange(i + 1, 4).setValue(Number(d.advance) || 0);
      return { success: true };
    }
  }
  return { error: 'Employee not found: ' + d.name };
}

// ────────────────────────────────────────────────────────────
// GET: Calculate salary from attendance sheet
// Salary formula (matching your sheet exactly):
//   Per Day = Monthly Salary / Total Days in Month
//   Paid Days = P_count + WO_count + (WOP_count × 2)
//   Gross = Per Day × Paid Days
//   Net = Gross − Advance
// ────────────────────────────────────────────────────────────
function getSalary(month, year) {
  const attSheetName = monthLabel(month, year) + ' Attendance';
  const attSheet = SS.getSheetByName(attSheetName);
  if (!attSheet) return { salary: [], calculated: false, sheetName: attSheetName };

  const empSheet = SS.getSheetByName(TABS.EMPLOYEES);
  const empRows  = empSheet ? empSheet.getDataRange().getValues() : [];

  // Build employee map: name → { salary, advance }
  const empMap = {};
  empRows.slice(1).forEach(r => {
    if (r[0]) {
      empMap[String(r[0]).trim().toLowerCase()] = {
        salary:  Number(r[2]) || 0,
        advance: Number(r[3]) || 0,
      };
    }
  });

  const attRows = attSheet.getDataRange().getValues();
  const header  = attRows[0];
  // Days in month = number of date columns (col 2 onwards)
  const dateCols = header.slice(2).filter(h => String(h).trim() !== '');
  const totalDays = dateCols.length;

  const salary = attRows.slice(1)
    .filter(r => r[1] && String(r[1]).trim() !== '')
    .map(r => {
      const name = String(r[1]).trim();
      const emp  = empMap[name.toLowerCase()] || { salary: 0, advance: 0 };

      let P = 0, A = 0, WO = 0, WOP = 0, NA = 0;
      r.slice(2, 2 + totalDays).forEach(cell => {
        const v = String(cell || '').trim().toUpperCase();
        if      (v === 'P')   P++;
        else if (v === 'A')   A++;
        else if (v === 'WO')  WO++;
        else if (v === 'WOP') WOP++;
        else if (v === 'NA')  NA++;
      });

      const perDay = totalDays > 0 ? emp.salary / totalDays : 0;
      // P=1x, WO=1x (paid off), WOP=2x (double pay)
      const paidDays   = P + WO + (WOP * 2);
      const gross      = perDay * paidDays;
      const net        = gross - emp.advance;

      return {
        name,
        monthlySalary: emp.salary,
        advance:        emp.advance,
        totalDays,
        P, A, WO, WOP, NA,
        paidDays,
        perDaySalary: round2(perDay),
        grossSalary:  round2(gross),
        netSalary:    round2(net),
        warning: net < 0 ? 'HIGH ADVANCE' : (emp.salary === 0 ? 'NO SALARY SET' : 'OK'),
      };
    });

  return { salary, calculated: true };
}

// ────────────────────────────────────────────────────────────
// Helper: Create attendance sheet for a month
// Mirrors the structure in your screenshot:
//   Row 1: [0, 'Employee Name', '01-Jun-26', '02-Jun-26', ...]
//   Row 2+: [sno, empName, P/A/WO...]
//   Sundays pre-filled with 'WO' (yellow)
// ────────────────────────────────────────────────────────────
function createAttendanceSheet(month, year) {
  const sheetName = monthLabel(month, year) + ' Attendance';
  const existing  = SS.getSheetByName(sheetName);
  if (existing) return existing;

  const sheet = SS.insertSheet(sheetName);

  // Get active employees
  const empSheet = SS.getSheetByName(TABS.EMPLOYEES);
  if (!empSheet) return sheet;
  const empRows = empSheet.getDataRange().getValues();
  const activeEmps = empRows.slice(1)
    .filter(r => r[0] && String(r[4]).trim().toUpperCase() === 'YES')
    .map(r => String(r[0]).trim());

  // Build header row
  const daysInMonth  = new Date(year, month, 0).getDate();
  const shortMonth   = monthLabel(month, year).substring(0, 3);
  const shortYear    = String(year).slice(2);
  const header = [0, 'Employee Name'];
  for (let d = 1; d <= daysInMonth; d++) {
    header.push(String(d).padStart(2, '0') + '-' + shortMonth + '-' + shortYear);
  }

  // Write header
  sheet.getRange(1, 1, 1, header.length).setValues([header]);
  sheet.getRange(1, 1, 1, header.length)
    .setBackground('#FFFF00')
    .setFontWeight('bold')
    .setFontColor('#000000');

  // Write each employee row
  activeEmps.forEach((name, i) => {
    const row = [i + 1, name];
    for (let d = 1; d <= daysInMonth; d++) {
      const isSun = new Date(year, month - 1, d).getDay() === 0;
      row.push(isSun ? 'WO' : '');
    }
    sheet.getRange(i + 2, 1, 1, row.length).setValues([row]);
  });

  // Color Sunday columns yellow
  if (activeEmps.length > 0) {
    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(year, month - 1, d).getDay() === 0) {
        sheet.getRange(2, d + 2, activeEmps.length, 1)
          .setBackground('#FFD966')
          .setFontColor('#7d5a00')
          .setFontWeight('bold');
      }
    }
  }

  // Freeze first two columns
  sheet.setFrozenColumns(2);
  sheet.setFrozenRows(1);

  return sheet;
}

// ── Helpers ───────────────────────────────────────────────────
const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

function monthLabel(month, year) {
  return MONTH_NAMES[month - 1] + '-' + year;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function statusColor(s) {
  return { P:'#00b050', A:'#ff0000', WO:'#FFD966', WOP:'#9966ff', NA:'#bfbfbf' }[s] || '#ffffff';
}

function statusFontColor(s) {
  return { P:'#ffffff', A:'#ffffff', WO:'#000000', WOP:'#ffffff', NA:'#ffffff' }[s] || '#000000';
}
