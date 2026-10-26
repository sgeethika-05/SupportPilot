import React from 'react';
import type { TicketStatus, TicketUrgency, DocumentStatus, DraftStatus } from '../../types';

export type BadgeVariant =
  | 'default'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'secondary';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-slate-100 text-slate-800 border-slate-200',
    brand: 'bg-brand-50 text-brand-700 border-brand-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
    secondary: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

export const TicketStatusBadge: React.FC<{ status: TicketStatus | string; className?: string }> = ({
  status,
  className = '',
}) => {
  switch (status) {
    case 'open':
      return (
        <Badge variant="info" className={className}>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5" />
          Open
        </Badge>
      );
    case 'in_progress':
      return (
        <Badge variant="warning" className={className}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse" />
          In Progress
        </Badge>
      );
    case 'resolved':
      return (
        <Badge variant="success" className={className}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
          Resolved
        </Badge>
      );
    case 'closed':
      return (
        <Badge variant="secondary" className={className}>
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" />
          Closed
        </Badge>
      );
    default:
      return <Badge className={className}>{status}</Badge>;
  }
};

export const TicketUrgencyBadge: React.FC<{ urgency: TicketUrgency | string; className?: string }> = ({
  urgency,
  className = '',
}) => {
  switch (urgency) {
    case 'critical':
      return (
        <Badge variant="danger" className={`font-semibold ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mr-1.5 animate-ping" />
          Critical
        </Badge>
      );
    case 'high':
      return (
        <Badge variant="danger" className={className}>
          High
        </Badge>
      );
    case 'medium':
      return (
        <Badge variant="warning" className={className}>
          Medium
        </Badge>
      );
    case 'low':
      return (
        <Badge variant="secondary" className={className}>
          Low
        </Badge>
      );
    default:
      return <Badge className={className}>{urgency}</Badge>;
  }
};

export const DocumentStatusBadge: React.FC<{ status: DocumentStatus | string; className?: string }> = ({
  status,
  className = '',
}) => {
  switch (status) {
    case 'indexed':
      return (
        <Badge variant="success" className={className}>
          Indexed
        </Badge>
      );
    case 'processing':
      return (
        <Badge variant="warning" className={className}>
          Processing...
        </Badge>
      );
    case 'pending':
      return (
        <Badge variant="info" className={className}>
          Pending
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="danger" className={className}>
          Error
        </Badge>
      );
    default:
      return <Badge className={className}>{status}</Badge>;
  }
};

export const DraftStatusBadge: React.FC<{ status: DraftStatus | string; className?: string }> = ({
  status,
  className = '',
}) => {
  switch (status) {
    case 'approved':
      return (
        <Badge variant="success" className={className}>
          Approved
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant="danger" className={className}>
          Rejected
        </Badge>
      );
    case 'escalated':
      return (
        <Badge variant="warning" className={className}>
          Escalated
        </Badge>
      );
    case 'draft':
    default:
      return (
        <Badge variant="brand" className={className}>
          Draft
        </Badge>
      );
  }
};

export default Badge;
