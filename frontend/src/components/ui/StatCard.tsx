import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import Card from './Card';

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: string | number;
    isPositive?: boolean;
    label?: string;
  };
  subtitle?: string;
  iconBgColor?: string;
  iconColor?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  trend,
  subtitle,
  iconBgColor = 'bg-brand-50',
  iconColor = 'text-brand-600',
  className = '',
}) => {
  return (
    <Card className={`p-6 hover:shadow-md transition-shadow ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <div className={`p-2.5 rounded-xl ${iconBgColor} ${iconColor}`}>
          {icon}
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
          {value}
        </span>

        {trend && (
          <div
            className={`flex items-center text-xs font-semibold ${
              trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {trend.isPositive ? (
              <TrendingUp className="w-3.5 h-3.5 mr-1" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 mr-1" />
            )}
            <span>{trend.value}</span>
            {trend.label && <span className="text-slate-400 font-normal ml-1">{trend.label}</span>}
          </div>
        )}
      </div>

      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </Card>
  );
};

export default StatCard;
