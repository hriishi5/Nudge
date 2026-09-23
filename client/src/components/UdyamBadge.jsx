import React from 'react';
import { ShieldCheck, ShieldAlert, Shield, HelpCircle } from 'lucide-react';

export default function UdyamBadge({ category, registrationNumber, compact = false }) {
  const cat = (category || 'unknown').toLowerCase();

  const configs = {
    micro: {
      bg: 'bg-[#15803D]/15 border-[#15803D]/40 text-[#22C55E]',
      label: 'Micro enterprise',
      shortLabel: 'Micro',
      icon: ShieldCheck,
      desc: 'Section 43B(h) active'
    },
    small: {
      bg: 'bg-[#1E3A5F]/30 border-[#1E3A5F]/60 text-[#93C5FD]',
      label: 'Small enterprise',
      shortLabel: 'Small',
      icon: ShieldCheck,
      desc: 'Section 43B(h) active'
    },
    medium: {
      bg: 'bg-slate-800/80 border-slate-700 text-slate-300',
      label: 'Medium enterprise',
      shortLabel: 'Medium (Exempt)',
      icon: Shield,
      desc: 'Exempt from 43B(h)'
    },
    not_registered: {
      bg: 'bg-slate-900 border-slate-800 text-slate-400',
      label: 'Not registered',
      shortLabel: 'Non-MSME',
      icon: ShieldAlert,
      desc: 'Exempt'
    },
    unknown: {
      bg: 'bg-[#B45309]/15 border-[#B45309]/40 text-[#F59E0B]',
      label: 'Pending verification',
      shortLabel: 'Pending audit',
      icon: HelpCircle,
      desc: 'Declaration needed'
    }
  };

  const config = configs[cat] || configs.unknown;
  const Icon = config.icon;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border ${config.bg}`}>
        <Icon className="w-3 h-3" />
        <span>{config.shortLabel}</span>
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${config.bg}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{config.label}</span>
      {registrationNumber && (
        <span className="opacity-75 text-[11px] font-mono border-l border-current/25 pl-1.5 ml-0.5">
          {registrationNumber}
        </span>
      )}
    </div>
  );
}
