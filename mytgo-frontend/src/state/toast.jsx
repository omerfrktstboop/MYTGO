import React, { createContext, useCallback, useContext, useRef, useState } from "react";

import { CheckCircle, X, XCircle } from "lucide-react";

const ToastContext = createContext(null);

let toastId = 0;

function ToastItem({ toast, onClose }) {
  const Icon = toast.type === "error" ? XCircle : CheckCircle;
  const color =
    toast.type === "error"
      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200"
      : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300";

  return (
    <div
      className={`pointer-events-auto flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-lg backdrop-blur-sm motion-safe:animate-slide-in ${color}`}
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <span className="flex-1">{toast.message}</span>
      <button
        type="button"
        onClick={() => onClose(toast.id)}
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full opacity-60 hover:opacity-100"
        aria-label="Kapat"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const addToast = useCallback((message, type = "success", duration = 3500) => {
    const id = ++toastId;
    setToasts((current) => [...current, { id, message, type }]);
    timersRef.current[id] = setTimeout(() => removeToast(id), duration);
    return id;
  }, [removeToast]);

  const success = useCallback((msg) => addToast(msg, "success"), [addToast]);
  const error = useCallback((msg) => addToast(msg, "error"), [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error }}>
      {children}
      {toasts.length > 0 && (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-50 w-full max-w-md -translate-x-1/2 px-4">
          <div className="flex flex-col gap-2">
            {toasts.map((t) => (
              <ToastItem key={t.id} toast={t} onClose={removeToast} />
            ))}
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
