import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
  loading = false
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#141E34] border border-[#263B5D] w-full max-w-sm rounded shadow-2xl overflow-hidden p-5">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded shrink-0 border ${
            isDestructive 
              ? 'bg-[#7F1D1D]/20 text-[#FCA5A5] border-[#7F1D1D]/50' 
              : 'bg-[#1E3A5F]/30 text-[#93C5FD] border-[#263B5D]'
          }`}>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-100 mb-1">{title}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 mt-5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-3 py-1.5 rounded text-xs font-medium text-slate-300 hover:text-white bg-[#0F1729] border border-[#263B5D] hover:bg-[#1E3A5F] transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-3.5 py-1.5 rounded text-xs font-medium text-white transition-colors border ${
              isDestructive 
                ? 'bg-[#7F1D1D] hover:bg-[#991B1B] border-[#7F1D1D]' 
                : 'bg-[#1E3A5F] hover:bg-[#2A4D7D] border-[#263B5D]'
            } disabled:opacity-50`}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
