import React, { useState, useEffect } from 'react';
import './index.css';
import { AppProvider, useApp } from './context/AppContext';
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';
import PasswordGate from './components/PasswordGate';
import MarkPage from './pages/MarkPage';
import AttendancePage from './pages/AttendancePage';
import SalaryPage from './pages/SalaryPage';
import EmployeesPage from './pages/EmployeesPage';
import PermissionPage from './pages/PermissionPage';
import { api } from './utils/api';

function AppInner() {
  const [page, setPage] = useState('home');
  const { toast } = useApp();
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    api.getEmployees().then(r => setEmployees(r.employees || [])).catch(() => {});
  }, []);

  const renderPage = () => {
    switch (page) {
      case 'home':       return <MarkPage />;
      case 'attendance': return <AttendancePage />;
      case 'salary':
        return (
          <PasswordGate employees={employees} title="Salary" icon="💰">
            <SalaryPage />
          </PasswordGate>
        );
      case 'employees':  return <EmployeesPage />;
      case 'permission':
        return (
          <PasswordGate employees={employees} title="Leave / Permission" icon="🕐">
            <PermissionPage />
          </PasswordGate>
        );
      default: return <MarkPage />;
    }
  };

  return (
    <div className="app-wrapper">
      <TopBar />
      <main className="page-content">{renderPage()}</main>
      <BottomNav active={page} onChange={setPage} />
      <div className={`toast ${toast.type} ${toast.show ? 'show' : ''}`}>{toast.msg}</div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
