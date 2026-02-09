import { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, XCircle, Info } from "lucide-react";

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "success") => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const toast = useCallback((msg) => addToast(msg, "success"), [addToast]);
  const toastError = useCallback((msg) => addToast(msg, "error"), [addToast]);
  const toastInfo = useCallback((msg) => addToast(msg, "info"), [addToast]);

  return (
    <ToastContext.Provider value={{ toast, toastError, toastInfo }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-slide-up flex items-center gap-2.5 px-5 py-3 rounded-xl shadow-card text-sm font-medium backdrop-blur-sm ${
              t.type === "success" ? "bg-success-light text-green-800 dark:bg-green-900/80 dark:text-green-200" :
              t.type === "error" ? "bg-danger-light text-red-800 dark:bg-red-900/80 dark:text-red-200" :
              "bg-blue-50 text-blue-800 dark:bg-blue-900/80 dark:text-blue-200"
            }`}
          >
            {t.type === "success" && <CheckCircle size={16} />}
            {t.type === "error" && <XCircle size={16} />}
            {t.type === "info" && <Info size={16} />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx;
}
