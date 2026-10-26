import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type AlertVariant = 'success' | 'error' | 'warning' | 'info';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  onClose,
  className = '',
}) => {
  const variantConfig = {
    success: {
      container: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
      titleColor: 'text-emerald-900',
    },
    error: {
      container: 'bg-rose-50 border-rose-200 text-rose-900',
      icon: <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />,
      titleColor: 'text-rose-900',
    },
    warning: {
      container: 'bg-amber-50 border-amber-200 text-amber-900',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />,
      titleColor: 'text-amber-900',
    },
    info: {
      container: 'bg-blue-50 border-blue-200 text-blue-900',
      icon: <Info className="w-5 h-5 text-blue-600 flex-shrink-0" />,
      titleColor: 'text-blue-900',
    },
  };

  const current = variantConfig[variant];

  return (
    <div
      role="alert"
      className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${current.container} ${className}`}
    >
      <div className="mt-0.5">{current.icon}</div>
      <div className="flex-1">
        {title && <h4 className={`font-semibold mb-1 ${current.titleColor}`}>{title}</h4>}
        <div className="leading-relaxed opacity-90">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1 -mr-1 -mt-1 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/5 transition-opacity"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default Alert;
