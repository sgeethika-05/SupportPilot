import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = '', id, disabled, ...props }, ref) => {
    const generatedId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={generatedId} className="block text-sm font-medium text-slate-700 mb-1">
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative rounded-lg shadow-sm">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={generatedId}
            disabled={disabled}
            className={`block w-full rounded-lg border text-sm transition-colors
              ${leftIcon ? 'pl-10' : 'pl-3.5'}
              ${rightIcon ? 'pr-10' : 'pr-3.5'}
              py-2.5
              ${
                error
                  ? 'border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-red-50/20'
                  : 'border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white'
              }
              ${disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}
              ${className}
            `}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-slate-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = '', id, disabled, ...props }, ref) => {
    const generatedId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={generatedId} className="block text-sm font-medium text-slate-700 mb-1">
            {label}
            {props.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={generatedId}
          disabled={disabled}
          className={`block w-full rounded-lg border text-sm px-3.5 py-2.5 transition-colors
            ${
              error
                ? 'border-red-300 text-red-900 placeholder-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-red-50/20'
                : 'border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white'
            }
            ${disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}
            ${className}
          `}
          {...props}
        />
        {error ? (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-xs text-slate-500">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Input;
