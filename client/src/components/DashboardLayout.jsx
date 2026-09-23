import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import TopNav from './TopNav.jsx';
import apiClient from '../lib/apiClient.js';

export default function DashboardLayout() {
  const [activeAlertCount, setActiveAlertCount] = useState(0);

  const fetchActiveAlerts = async () => {
    try {
      const res = await apiClient.get('/alerts?acknowledged=false');
      setActiveAlertCount(res.data.data?.length || 0);
    } catch (e) {
      // Ignore initial background fetch error
    }
  };

  useEffect(() => {
    fetchActiveAlerts();
  }, []);

  return (
    <div className="flex min-h-screen bg-[#0F1729] text-slate-100 selection:bg-[#1E3A5F] selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar activeAlertCount={activeAlertCount} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav onRefresh={fetchActiveAlerts} />
        <main className="flex-1 overflow-y-auto p-5 sm:p-6 lg:p-8">
          <Outlet context={{ refreshAlerts: fetchActiveAlerts }} />
        </main>
      </div>
    </div>
  );
}
