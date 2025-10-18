import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from './card';

interface CollapsibleSectionProps {
  title: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

export function CollapsibleSection({
  title,
  icon: Icon,
  defaultExpanded = false,
  expanded: controlledExpanded,
  onToggle,
  children,
  className,
  headerClassName,
  contentClassName
}: CollapsibleSectionProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);

  // Use controlled or uncontrolled mode
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const handleToggle = () => {
    const newExpanded = !isExpanded;

    if (onToggle) {
      onToggle(newExpanded);
    } else {
      setInternalExpanded(newExpanded);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <Card className={cn(className)}>
      <CardHeader
        className={cn(
          "cursor-pointer select-none transition-colors hover:bg-muted/50",
          headerClassName
        )}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-expanded={isExpanded}
        aria-controls={`section-content-${title.replace(/\s+/g, '-').toLowerCase()}`}
        aria-label={`Toggle ${title} section`}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            {Icon && <Icon size={20} className="text-muted-foreground" />}
            {title}
          </CardTitle>
          <div aria-hidden="true" className="text-muted-foreground">
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent
          className={cn(contentClassName)}
          id={`section-content-${title.replace(/\s+/g, '-').toLowerCase()}`}
          role="region"
          aria-labelledby={`section-header-${title.replace(/\s+/g, '-').toLowerCase()}`}
        >
          {children}
        </CardContent>
      )}
    </Card>
  );
}