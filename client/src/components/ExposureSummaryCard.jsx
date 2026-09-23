import React from 'react';
import { formatINR } from '../lib/formatters.js';

export default function ExposureSummaryCard({
  totalExposure = 0,
  disallowanceRisk = 0,
  accruedInterest = 0,
  breachedCount = 0,
  atRiskCount = 0,
  onTrackCount = 0
}) {
  return (
    <div className="bg-[#141E34] border border-[#263B5D] rounded-lg mb-6 overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#263B5D]">
        
        {/* Metric 1: Section 43B(h) Exposure */}
        <div className="px-5 py-3.5">
          <div className="text-xs font-medium text-slate-400">
            Section 43B(h) disallowance risk
          </div>
          <div className="font-serif text-2xl font-bold text-white tracking-tight mt-1 tabular-nums">
            {formatINR(disallowanceRisk)}
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <span className={breachedCount > 0 ? "text-[#EF4444] font-medium" : "text-slate-400"}>
              {breachedCount} breached
            </span>
            <span>•</span>
            <span className={atRiskCount > 0 ? "text-[#F59E0B] font-medium" : "text-slate-400"}>
              {atRiskCount} at risk
            </span>
          </div>
        </div>

        {/* Metric 2: Section 16 MSMED Penal Interest */}
        <div className="px-5 py-3.5">
          <div className="text-xs font-medium text-slate-400">
            MSMED Section 16 penal interest
          </div>
          <div className="font-serif text-2xl font-bold text-[#F59E0B] tracking-tight mt-1 tabular-nums">
            {formatINR(accruedInterest)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            3x RBI bank rate (monthly rests)
          </div>
        </div>

        {/* Metric 3: Total Active MSME Payables */}
        <div className="px-5 py-3.5">
          <div className="text-xs font-medium text-slate-400">
            Total active MSME payables
          </div>
          <div className="font-serif text-2xl font-bold text-white tracking-tight mt-1 tabular-nums">
            {formatINR(totalExposure)}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Micro & small enterprise liabilities
          </div>
        </div>

        {/* Metric 4: Statutory Compliance Status */}
        <div className="px-5 py-3.5">
          <div className="text-xs font-medium text-slate-400">
            Statutory compliance health
          </div>
          <div className="font-serif text-2xl font-bold text-[#22C55E] tracking-tight mt-1 tabular-nums">
            {onTrackCount} {onTrackCount === 1 ? 'invoice' : 'invoices'}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Within statutory 15/45-day window
          </div>
        </div>

      </div>
    </div>
  );
}
