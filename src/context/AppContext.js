import React, { createContext, useContext, useState, useCallback } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [toast, setToast] = useState({ msg: '', type: '', show: false });

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type, show: true });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 2500);
  }, []);

  return (
    <AppContext.Provider value={{ month, setMonth, year, setYear, showToast, toast }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
