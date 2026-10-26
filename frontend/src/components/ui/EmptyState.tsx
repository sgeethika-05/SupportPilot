import React from 'react';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-white rounded-xl border border-dashed border-slate-200 ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500 max-w-sm">{description}</p>
      {action && (
        <div className="mt-5">
          <button
            type="button"
            onClick={action.onClick}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            {action.icon}
            {action.label}
          </button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
