import React from 'react';

interface ReportProgressBarProps {
  value: number;
  max?: number;
  showLabel?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

export const ReportProgressBar: React.FC<ReportProgressBarProps> = ({
  value,
  max = 100,
  showLabel = true,
  variant = 'default',
  className = ''
}) => {
  const percentage = Math.min(100, (value / max) * 100);
  
  const getVariantFromValue = () => {
    if (variant !== 'default') return variant;
    
    if (percentage > 100) return 'danger';
    if (percentage >= 80) return 'warning';
    if (percentage >= 50) return 'success';
    return 'default';
  };
  
  const currentVariant = getVariantFromValue();
  
  return (
    <div className={`report-progress-container ${className}`}>
      <div className="report-progress-bar">
        <div 
          className={`report-progress-fill progress-${currentVariant}`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
      {showLabel && (
        <span className={`progress-label text-${currentVariant}`}>
          {value}%
        </span>
      )}
    </div>
  );
};