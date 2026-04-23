import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { registerToastError } from '../api/client';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  useEffect(() => {
    registerToastError((msg) => addToast('error', msg));
  }, [addToast]);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg) => addToast('success', msg),
    error:   (msg) => addToast('error',   msg),
    info:    (msg) => addToast('info',    msg),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm min-w-64 max-w-sm pointer-events-auto ${
                t.type === 'success' ? 'bg-green-700' :
                t.type === 'error'   ? 'bg-red-600'   :
                                       'bg-gray-700'
              }`}
            >
              <span className="flex-1">{t.message}</span>
              <button onClick={() => dismiss(t.id)} className="text-white/70 hover:text-white shrink-0">✕</button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
