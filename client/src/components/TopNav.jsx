import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import apiClient from '../lib/apiClient.js';
import { Building2, RefreshCw, LogOut, UserCircle } from 'lucide-react';

export default function TopNav({ onRefresh }) {
  const { user, org, logout } = useAuth();
  const { addToast } = useToast();
  const [scanning, setScanning] = useState(false);

  const handleScanDeadlines = async () => {
    setScanning(true);
    try {
      const res = await apiClient.post('/jobs/scan-deadlines', {}, {
        headers: {
          'X-Secret-Token': 'nudge_job_secret_token_67890'
        }
      });
      addToast({
        title: 'Statutory scan complete',
        message: `Scanned ${res.data.total_invoices_scanned} invoices. ${res.data.alerts_raised} active alerts updated.`,
        type: 'success'
      });
      if (onRefresh) onRefresh();
    } catch (err) {
      addToast({
        title: 'Scan notice',
        message: err.message || 'Could not complete deadline scan.',
        type: 'info'
      });
    } finally {
      setScanning(false);
    }
  };

  return (
    <header className="h-14 bg-[#0F1729] border-b border-[#263B5D] px-6 flex items-center justify-between shrink-0">
      {/* Current Organization */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#141E34] border border-[#263B5D] text-xs font-medium text-slate-200">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span>{org?.name || 'Bharat Heavy Dynamics Ltd'}</span>
        </div>
        <span className="text-xs text-slate-400 font-mono hidden md:inline">
          FY 2026-27
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleScanDeadlines}
          disabled={scanning}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-[#141E34] hover:bg-[#1E3A5F] text-slate-200 border border-[#263B5D] transition-colors disabled:opacity-50"
          title="Scan statutory payment deadlines and recompute Section 16 interest"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${scanning ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Scan deadlines</span>
        </button>

        {/* User Profile & Logout */}
        <div className="flex items-center gap-2 border-l border-[#263B5D] pl-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <UserCircle className="w-4 h-4 text-slate-400" />
            <span className="font-medium hidden sm:inline">{user?.email || 'finance@bharat.in'}</span>
          </div>

          <button
            onClick={logout}
            className="p-1 rounded text-slate-400 hover:text-[#EF4444] hover:bg-[#141E34] transition-colors"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
