import React, { useState } from 'react';
import './index.css';
import { AppProvider, useApp } from './context/AppContext';
import TopBar from './components/TopBar';
import BottomNav from './components/BottomNav';
import MarkPage from './pages/MarkPage';
import AttendancePage from './pages/AttendancePage';
import SalaryPage from './pages/SalaryPage';
import EmployeesPage from './pages/EmployeesPage';
import PermissionPage from './pages/PermissionPage';

function AppInner() {
  const [page, setPage] = useState('home');
  const { toast } = useApp();

  const renderPage = () => {
    switch (page) {
      case 'home': return <MarkPage />;
      case 'attendance': return <AttendancePage />;
      case 'salary': return <SalaryPage />;
      case 'employees': return <EmployeesPage />;
      case 'permission': return <PermissionPage />;
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
