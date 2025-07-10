import { AlertCircle } from 'lucide-react';
import './ErrorMessage.css';

interface ErrorMessageProps {
  message: string;
  details?: string;
}

export function ErrorMessage({ message, details }: ErrorMessageProps) {
  return (
    <div className="error-message">
      <AlertCircle className="error-icon" />
      <div className="error-content">
        <p className="error-text">{message}</p>
        {details && <p className="error-details">{details}</p>}
      </div>
    </div>
  );
}