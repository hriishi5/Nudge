import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  UploadCloud,
  Users,
  Bell,
  Sparkles,
  FileCheck2,
  Settings,
  History
} from 'lucide-react';

export default function Sidebar({ activeAlertCount = 0 }) {
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Invoices', path: '/invoices', icon: FileText },
    { name: 'Upload invoice', path: '/invoices/upload', icon: UploadCloud },
    { name: 'Vendor master', path: '/vendors', icon: Users },
    { name: 'Compliance alerts', path: '/alerts', icon: Bell, badge: activeAlertCount },
    { name: 'AI assistant', path: '/assistant', icon: Sparkles },
    { name: 'Form 3CD (Cl. 22)', path: '/reports/form-3cd', icon: FileCheck2 },
    { name: 'Audit trail', path: '/audit-log', icon: History },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0F1729] border-r border-[#263B5D] flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#263B5D] flex items-center gap-3">
        <div className="w-9 h-9 rounded bg-[#141E34] border border-[#263B5D] flex items-center justify-center shrink-0">
          <svg viewBox="0 0 64 64" fill="none" className="w-5 h-5">
            <path d="M32 10 L48 17 C48 31 41 44 32 50 C23 44 16 31 16 17 Z" fill="#1E3A5F" />
            <path d="M26 36 V24 L38 36 V24" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="39" cy="23" r="3" fill="#15803D" />
          </svg>
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-sm tracking-tight text-white flex items-center gap-2">
            <span>Nudge</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" title="Statutory register online"></span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium truncate">MSME compliance copilot</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#1E3A5F] text-white border border-[#2B4E7D]'
                    : 'text-slate-300 hover:text-white hover:bg-[#141E34]'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                <span>{item.name}</span>
              </div>
              {Boolean(item.badge) && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-[#B45309] text-white shrink-0">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

    </aside>
  );
}
