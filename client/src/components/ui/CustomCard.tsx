import { ReactNode } from 'react';
import { Card as ShadcnCard, CardHeader, CardTitle, CardContent } from './card';
import { cn } from '@/lib/utils';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
  onClick?: () => void;
}

export function Card({ title, children, className = '', actions, onClick }: CardProps) {
  return (
    <ShadcnCard 
      className={cn(
        onClick && "cursor-pointer transition-colors hover:bg-accent/50",
        className
      )}
      onClick={onClick}
    >
      {(title || actions) && (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          {title && <CardTitle className="text-sm font-medium">{title}</CardTitle>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
    </ShadcnCard>
  );
}