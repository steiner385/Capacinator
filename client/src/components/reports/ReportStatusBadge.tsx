import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';

interface ReportStatusBadgeProps {
  status: string;
  variant?: BadgeVariant;
  className?: string;
}

export const ReportStatusBadge: React.FC<ReportStatusBadgeProps> = ({
  status,
  variant = 'default',
  className = ''
}) => {
  return (
    <span className={`report-status-badge badge-${variant} ${className}`}>
      {status}
    </span>
  );
};