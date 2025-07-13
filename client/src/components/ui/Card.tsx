import { ReactNode } from 'react';
import './Card.css';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  actions?: ReactNode;
  onClick?: () => void;
}

export function Card({ title, children, className = '', actions, onClick }: CardProps) {
  return (
    <div 
      className={`card ${className} ${onClick ? 'card-clickable' : ''}`}
      onClick={onClick}
    >
      {(title || actions) && (
        <div className="card-header">
          {title && <h3 className="card-title">{title}</h3>}
          {actions && <div className="card-actions">{actions}</div>}
        </div>
      )}
      <div className="card-body">{children}</div>
    </div>
  );
}