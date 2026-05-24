'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 4000,
  error: 7000, // Plus long pour laisser le temps de lire
  info: 4500,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type, duration: DEFAULT_DURATIONS[type] }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2" role="region" aria-label="Notifications">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={() => dismissToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [paused, setPaused] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingRef = useRef(toast.duration);
  const startRef = useRef(Date.now());

  useEffect(() => {
    if (paused) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        remainingRef.current -= Date.now() - startRef.current;
      }
      return;
    }
    startRef.current = Date.now();
    timeoutRef.current = setTimeout(onDismiss, Math.max(remainingRef.current, 500));
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [paused, onDismiss]);

  const Icon = toast.type === 'success' ? CheckCircle : toast.type === 'error' ? AlertCircle : Info;
  const colorClasses: Record<ToastType, string> = {
    success: 'border-[#1e7a4e]/50 bg-[#1e7a4e]/10 text-[#5ee0a1]',
    error: 'border-usm-red/50 bg-usm-red/10 text-[#ff7a82]',
    info: 'border-usm-blue/50 bg-usm-blue/10 text-[#7aa5e8]',
  };

  return (
    <div
      role="alert"
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={`flex items-center gap-3 px-4 py-3 border rounded-lg backdrop-blur-md min-w-[280px] max-w-md shadow-2xl animate-fade-in ${colorClasses[toast.type]}`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      <span className="text-sm flex-1">{toast.message}</span>
      <button
        onClick={onDismiss}
        aria-label="Fermer la notification"
        className="text-current opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
