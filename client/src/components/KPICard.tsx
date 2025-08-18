import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '../lib/utils';

interface KPICardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  status?: 'success' | 'warning' | 'danger' | 'default';
  icon?: React.ReactNode;
  className?: string;
}

export function KPICard({
  label,
  value,
  subtitle,
  trend,
  status = 'default',
  icon,
  className
}: KPICardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;
    
    switch (trend.direction) {
      case 'up':
        return <TrendingUp className="w-4 h-4" />;
      case 'down':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const getTrendColor = () => {
    if (!trend) return '';
    
    // For some metrics, down is good (like allocation %), for others up is good
    if (trend.direction === 'up') {
      return status === 'danger' ? 'text-danger' : 'text-success';
    } else if (trend.direction === 'down') {
      return status === 'success' ? 'text-success' : 'text-danger';
    }
    return 'text-muted';
  };

  return (
    <div
      className={cn(
        "kpi-card group relative overflow-hidden rounded-lg border bg-card p-6 transition-all duration-200",
        "hover:shadow-md hover:-translate-y-0.5",
        status === 'success' && "border-success/20 hover:border-success/40",
        status === 'warning' && "border-warning/20 hover:border-warning/40",
        status === 'danger' && "border-danger/20 hover:border-danger/40",
        status === 'default' && "hover:border-primary/40",
        className
      )}
    >
      {/* Top accent line */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-1 transition-all duration-200",
          status === 'success' && "bg-success",
          status === 'warning' && "bg-warning",
          status === 'danger' && "bg-danger",
          status === 'default' && "bg-primary",
          "transform scale-x-0 group-hover:scale-x-100"
        )}
      />
      
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className={cn(
              "p-2 rounded-lg",
              status === 'success' && "bg-success/10 text-success",
              status === 'warning' && "bg-warning/10 text-warning",
              status === 'danger' && "bg-danger/10 text-danger",
              status === 'default' && "bg-primary/10 text-primary"
            )}>
              {icon}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-end justify-between">
        <div className="text-3xl font-bold tracking-tight">
          {value}
        </div>
        
        {trend && (
          <div className={cn("flex items-center gap-1 text-sm font-medium", getTrendColor())}>
            {getTrendIcon()}
            <span>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
    </div>
  );
}