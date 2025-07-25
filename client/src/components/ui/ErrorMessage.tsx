import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from './alert';

interface ErrorMessageProps {
  message: string;
  details?: string;
}

export function ErrorMessage({ message, details }: ErrorMessageProps) {
  return (
    <Alert variant="destructive" className="mx-auto max-w-2xl">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{message}</p>
        {details && <p className="text-sm opacity-90">{details}</p>}
      </AlertDescription>
    </Alert>
  );
}