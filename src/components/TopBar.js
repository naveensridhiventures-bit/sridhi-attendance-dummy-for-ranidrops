import React, { useState, useEffect } from 'react';

export default function TopBar() {
  const [time, setTime] = useState(getTime());

  useEffect(() => {
    const t = setInterval(() => setTime(getTime()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="topbar">
      <div className="topbar-brand">
        <img src="/icon-192.png" alt="SRIDHI" className="topbar-logo" />
        <span className="topbar-name">SRIDHI</span>
      </div>
      <span className="topbar-time">{time}</span>
    </div>
  );
}

function getTime() {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}
