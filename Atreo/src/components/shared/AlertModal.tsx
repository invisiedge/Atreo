import React from 'react';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiX } from 'react-icons/fi';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  showConfirmButton?: boolean;
  confirmText?: string;
  onConfirm?: () => void;
}

const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  showConfirmButton = false,
  confirmText = 'OK',
  onConfirm,
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const typeStyles = {
    success: {
      icon: <FiCheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />,
      iconBg: 'bg-green-100 dark:bg-green-950',
      titleColor: 'text-green-900 dark:text-green-100',
      buttonBg: 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800',
    },
    error: {
      icon: <FiAlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />,
      iconBg: 'bg-red-100 dark:bg-red-950',
      titleColor: 'text-red-900 dark:text-red-100',
      buttonBg: 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800',
    },
    warning: {
      icon: <FiAlertCircle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />,
      iconBg: 'bg-yellow-100 dark:bg-yellow-950',
      titleColor: 'text-yellow-900 dark:text-yellow-100',
      buttonBg: 'bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-800',
    },
    info: {
      icon: <FiInfo className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
      iconBg: 'bg-blue-100 dark:bg-blue-950',
      titleColor: 'text-blue-900 dark:text-blue-100',
      buttonBg: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800',
    },
  };

  const styles = typeStyles[type];

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 min-h-screen">
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full mx-4 border border-border">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className={`${styles.iconBg} p-2 rounded-full`}>
                {styles.icon}
              </div>
              <h3 className={`text-lg font-semibold ${styles.titleColor}`}>
                {title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          <p className="text-muted-foreground">{message}</p>
        </div>

        <div className="px-6 py-4 bg-muted/50 rounded-b-lg flex justify-end space-x-3">
          {showConfirmButton ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-muted-foreground bg-card border border-border rounded-md hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 text-sm font-medium text-white ${styles.buttonBg} rounded-md transition-colors`}
              >
                {confirmText}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className={`px-4 py-2 text-sm font-medium text-white ${styles.buttonBg} rounded-md transition-colors`}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertModal;

