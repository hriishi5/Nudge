import React from 'react';
import { Clock, AlertTriangle, AlertCircle, CheckCircle2, History } from 'lucide-react';
import { formatDaysRemaining } from '../lib/formatters.js';

export default function DeadlineBadge({ status, daysToBreach, showDays = true }) {
  const normalizedStatus = status || 'on_track';
  const label = showDays && daysToBreach !== undefined 
    ? formatDaysRemaining(daysToBreach, normalizedStatus)
    : normalizedStatus.replace(/_/g, ' ');

  if (normalizedStatus === 'breached') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-[#7F1D1D]/15 text-[#EF4444] border border-[#7F1D1D]/40">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        <span className="capitalize">{label}</span>
      </span>
    );
  }

  if (normalizedStatus === 'at_risk') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-[#B45309]/15 text-[#F59E0B] border border-[#B45309]/40">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span className="capitalize">{label}</span>
      </span>
    );
  }

  if (normalizedStatus === 'paid_on_time') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-[#15803D]/15 text-[#22C55E] border border-[#15803D]/40">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
        <span>Paid on time</span>
      </span>
    );
  }

  if (normalizedStatus === 'paid_late') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-[#7F1D1D]/10 text-[#F87171] border border-[#7F1D1D]/30">
        <History className="w-3.5 h-3.5 shrink-0" />
        <span>Paid late</span>
      </span>
    );
  }

  // Default: on_track (deep green)
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-[#15803D]/15 text-[#22C55E] border border-[#15803D]/40">
      <Clock className="w-3.5 h-3.5 shrink-0" />
      <span className="capitalize">{label}</span>
    </span>
  );
}
