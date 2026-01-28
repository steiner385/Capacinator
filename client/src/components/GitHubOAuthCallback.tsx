/**
 * GitHubOAuthCallback Component
 * Feature: 005-github-auth-user-link
 * Task: T023
 *
 * Handles the OAuth callback redirect from GitHub.
 * Displays loading state while the server processes the OAuth code.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Loader2, CheckCircle2, AlertCircle, Github } from 'lucide-react';
import { Button } from './ui/button';

export function GitHubOAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    // Check for success or error params from the redirect
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const connectionId = searchParams.get('connection_id');

    if (success === 'true' && connectionId) {
      setStatus('success');
      // Show success briefly, then redirect to settings
      setTimeout(() => {
        navigate('/settings?tab=github');
      }, 2000);
    } else if (error) {
      setStatus('error');
      setErrorMessage(decodeURIComponent(error));
    } else {
      // Still processing or invalid state
      setStatus('loading');
    }
  }, [searchParams, navigate]);

  const handleTryAgain = () => {
    navigate('/settings?tab=github');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Github className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>
            {status === 'loading' && 'Connecting to GitHub'}
            {status === 'success' && 'Successfully Connected!'}
            {status === 'error' && 'Connection Failed'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Processing your GitHub authorization...'}
            {status === 'success' && 'Your GitHub account is now connected'}
            {status === 'error' && 'There was a problem connecting your account'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          {status === 'loading' && (
            <div className="py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          )}

          {status === 'success' && (
            <div className="py-8 space-y-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Redirecting to settings...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="py-4 space-y-4 text-center w-full">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-destructive">
                  {errorMessage || 'An unexpected error occurred'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Please try connecting again. If the problem persists, contact support.
                </p>
              </div>
              <Button onClick={handleTryAgain} className="w-full">
                Return to Settings
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
