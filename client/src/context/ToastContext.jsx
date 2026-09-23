import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ title, message, type = 'info', duration = 4000 }) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(4);
    setToasts(prev => [...prev, { id, title, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded border shadow-lg transition-all duration-300 animate-slide-up ${
              toast.type === 'success'
                ? 'bg-[#141E34] border-[#15803D] text-slate-200'
                : toast.type === 'error'
                ? 'bg-[#141E34] border-[#7F1D1D] text-slate-200'
                : toast.type === 'warning'
                ? 'bg-[#141E34] border-[#B45309] text-slate-200'
                : 'bg-[#141E34] border-[#263B5D] text-slate-200'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-[#15803D]" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-[#FCA5A5]" />}
              {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-[#FCD34D]" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-[#8BA2C4]" />}
            </div>
            <div className="flex-1 min-w-0">
              {toast.title && <h4 className="text-xs font-semibold mb-0.5 text-slate-100">{toast.title}</h4>}
              <p className="text-xs leading-relaxed text-slate-300">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
