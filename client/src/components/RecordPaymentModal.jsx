import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { formatDate, formatINR } from '../lib/formatters.js';

export default function RecordPaymentModal({ isOpen, onClose, invoice, onRecord }) {
  if (!isOpen || !invoice) return null;

  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  const isLate = invoice.computed_deadline && paymentDate > invoice.computed_deadline;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onRecord(paymentDate);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80">
      <div className="bg-[#141E34] border border-[#263B5D] w-full max-w-md rounded-lg overflow-hidden p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3.5 border-b border-[#263B5D]">
          <div>
            <h3 className="text-sm font-semibold text-white">Record payment settlement</h3>
            <p className="text-xs text-slate-400 mt-0.5">Invoice {invoice.invoice_number}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="p-3 rounded bg-[#0F1729] border border-[#263B5D] space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Vendor</span>
              <span className="text-white font-medium">{invoice.vendors?.name || 'Unknown'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Principal amount</span>
              <span className="font-serif text-white font-medium tabular-nums">{formatINR(invoice.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Statutory deadline</span>
              <span className="font-serif text-slate-200 tabular-nums">{formatDate(invoice.computed_deadline)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Settlement date
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
              className="w-full px-3 py-2 rounded bg-[#0F1729] border border-[#263B5D] text-xs text-white focus:outline-none focus:border-[#2B4E7D] font-mono"
            />
          </div>

          {isLate ? (
            <div className="p-3 rounded bg-[#7F1D1D]/15 border border-[#7F1D1D]/40 text-[#EF4444] text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-white">Statutory breach: payment is overdue</p>
                <p className="text-slate-300 mt-0.5 leading-relaxed">
                  Settlement past the statutory limit triggers non-deductible compound penal interest at 3x the RBI bank rate under Section 16 of the MSMED Act.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded bg-[#15803D]/15 border border-[#15803D]/40 text-[#22C55E] text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Compliant: payment is within the statutory 15/45-day window.</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 rounded text-xs font-medium bg-[#1E3A5F] hover:bg-[#2B4E7D] text-white transition-colors disabled:opacity-50"
            >
              {submitting ? 'Recording...' : 'Record settlement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
