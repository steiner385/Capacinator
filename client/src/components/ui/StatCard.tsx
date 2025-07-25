import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from './card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'purple' | 'pink';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onClick?: () => void;
}

const colorClasses = {
  primary: 'border-l-4 border-l-primary',
  success: 'border-l-4 border-l-green-500',
  warning: 'border-l-4 border-l-yellow-500',
  danger: 'border-l-4 border-l-destructive',
  purple: 'border-l-4 border-l-purple-500',
  pink: 'border-l-4 border-l-pink-500',
};

const iconColorClasses = {
  primary: 'text-primary',
  success: 'text-green-500',
  warning: 'text-yellow-500',
  danger: 'text-destructive',
  purple: 'text-purple-500',
  pink: 'text-pink-500',
};

export function StatCard({ title, value, icon: Icon, color = 'primary', trend, onClick }: StatCardProps) {
  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all",
        colorClasses[color],
        onClick && "cursor-pointer hover:shadow-md hover:border-muted-foreground/50"
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {trend && (
              <p className={cn(
                "text-xs font-medium",
                trend.isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
              )}>
                {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
              </p>
            )}
          </div>
          <div className={cn("p-3 rounded-full bg-muted/50", iconColorClasses[color])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}