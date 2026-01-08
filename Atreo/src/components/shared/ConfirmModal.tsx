import React from 'react';
import { FiAlertTriangle, FiX } from 'react-icons/fi';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning';
  disabled?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  disabled = false,
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl shadow-2xl max-w-md w-full border border-border">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${type === 'danger' ? 'bg-red-100 dark:bg-red-950' : 'bg-yellow-100 dark:bg-yellow-950'}`}>
              <FiAlertTriangle className={`h-6 w-6 ${type === 'danger' ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'}`} />
            </div>
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-border bg-muted/50">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-muted-foreground bg-card border border-border rounded-lg hover:bg-accent transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={disabled}
            className={`px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-colors shadow-sm ${
              disabled
                ? 'opacity-50 cursor-not-allowed'
                : type === 'danger' 
                  ? 'bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800' 
                  : 'bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-700 dark:hover:bg-yellow-800'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

