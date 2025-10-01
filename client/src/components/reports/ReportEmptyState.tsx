import React from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface ReportEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLink?: {
    to: string;
    text: string;
  };
  className?: string;
}

export const ReportEmptyState: React.FC<ReportEmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLink,
  className = ''
}) => {
  return (
    <div className={`report-empty-state ${className}`}>
      <Icon size={20} />
      <strong>{title}</strong>
      <p>{description}</p>
      {actionLink && (
        <Link to={actionLink.to} className="empty-state-link">
          {actionLink.text}
        </Link>
      )}
    </div>
  );
};