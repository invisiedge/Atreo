import { useState, useCallback } from 'react';
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from 'react-icons/fi';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

let toastIdCounter = 0;

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `toast-${toastIdCounter++}`;
    const newToast: Toast = { id, message, type };
    
    setToasts((prev) => [...prev, newToast]);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
    
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const ToastContainer = () => {
    if (toasts.length === 0) return null;

    return (
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => {
          const typeStyles = {
            success: {
              bg: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
              icon: <FiCheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />,
              text: 'text-green-800 dark:text-green-100',
            },
            error: {
              bg: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',
              icon: <FiAlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />,
              text: 'text-red-800 dark:text-red-100',
            },
            warning: {
              bg: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800',
              icon: <FiAlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />,
              text: 'text-yellow-800 dark:text-yellow-100',
            },
            info: {
              bg: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
              icon: <FiInfo className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
              text: 'text-blue-800 dark:text-blue-100',
            },
          };

          const styles = typeStyles[toast.type];

          return (
            <div
              key={toast.id}
              className={`${styles.bg} border rounded-lg shadow-lg p-4 min-w-[300px] max-w-md flex items-start gap-3 animate-slide-in`}
            >
              <div className="flex-shrink-0">{styles.icon}</div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${styles.text}`}>{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <FiX className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  return { showToast, removeToast, ToastContainer };
};

