import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration: number = 4000) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container — fixed bottom-right */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 max-w-sm pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(toast => (
            <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const config = {
    success: {
      icon: <CheckCircle2 size={18} />,
      bg: 'bg-emerald-50 border-emerald-200',
      text: 'text-emerald-900',
      iconColor: 'text-emerald-600',
      bar: 'bg-emerald-500',
    },
    error: {
      icon: <XCircle size={18} />,
      bg: 'bg-rose-50 border-rose-200',
      text: 'text-rose-900',
      iconColor: 'text-rose-600',
      bar: 'bg-rose-500',
    },
    warning: {
      icon: <AlertTriangle size={18} />,
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-900',
      iconColor: 'text-amber-600',
      bar: 'bg-amber-500',
    },
    info: {
      icon: <Info size={18} />,
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-900',
      iconColor: 'text-blue-600',
      bar: 'bg-blue-500',
    },
  }[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9 }}
      transition={{ type: 'spring', damping: 22, stiffness: 300 }}
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg ${config.bg} min-w-[280px] relative overflow-hidden`}
    >
      <span className={`mt-0.5 shrink-0 ${config.iconColor}`}>{config.icon}</span>
      <p className={`text-sm font-medium leading-snug flex-1 ${config.text}`}>{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-slate-400 hover:text-slate-600 transition shrink-0 mt-0.5"
      >
        <X size={14} />
      </button>
      {/* Auto-dismiss progress bar */}
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: (toast.duration || 4000) / 1000, ease: 'linear' }}
        className={`absolute bottom-0 left-0 h-0.5 ${config.bar}`}
      />
    </motion.div>
  );
}
