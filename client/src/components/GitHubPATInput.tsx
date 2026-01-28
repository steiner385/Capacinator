/**
 * GitHubPATInput Component
 * Feature: 005-github-auth-user-link
 * Tasks: T027, T031
 *
 * Form component for connecting GitHub via Personal Access Token.
 * Validates token and displays scope errors.
 */

import React, { useState } from 'react';
import { useConnectWithPAT } from '../hooks/useGitHubConnections';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert, AlertDescription } from './ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Loader2, AlertCircle, CheckCircle2, Key, ExternalLink } from 'lucide-react';

interface GitHubPATInputProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function GitHubPATInput({ onSuccess, onCancel }: GitHubPATInputProps) {
  const [token, setToken] = useState('');
  const [githubBaseUrl, setGithubBaseUrl] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validationError, setValidationError] = useState<{
    message: string;
    missingScopes?: string[];
  } | null>(null);

  const { mutate: connectWithPAT, isPending } = useConnectWithPAT();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!token.trim()) {
      setValidationError({ message: 'Please enter a token' });
      return;
    }

    const data: { token: string; github_base_url?: string } = { token: token.trim() };
    if (githubBaseUrl.trim()) {
      data.github_base_url = githubBaseUrl.trim();
    }

    connectWithPAT(data, {
      onSuccess: () => {
        setToken('');
        setGithubBaseUrl('');
        onSuccess?.();
      },
      onError: (error: any) => {
        const errorData = error.response?.data;
        if (errorData?.missingScopes) {
          setValidationError({
            message: errorData.error || 'Token validation failed',
            missingScopes: errorData.missingScopes,
          });
        } else {
          setValidationError({
            message: errorData?.error || error.message || 'Failed to connect',
          });
        }
      },
    });
  };

  const requiredScopes = ['repo', 'user:email', 'read:org'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Connect with Personal Access Token
        </CardTitle>
        <CardDescription>
          Use a GitHub Personal Access Token for headless or automation scenarios
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Token Input */}
          <div className="space-y-2">
            <Label htmlFor="pat-token">
              Personal Access Token
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Input
              id="pat-token"
              type="password"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={isPending}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Your token will be encrypted before storage.{' '}
              <a
                href="https://github.com/settings/tokens/new"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Create a token
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>

          {/* Required Scopes Info */}
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <div className="text-sm font-medium mb-1">Required Scopes:</div>
              <ul className="text-xs space-y-0.5 ml-4 list-disc">
                {requiredScopes.map((scope) => (
                  <li key={scope}>
                    <code className="bg-muted px-1 rounded">{scope}</code>
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>

          {/* Validation Error with Missing Scopes */}
          {validationError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-1">{validationError.message}</div>
                {validationError.missingScopes && validationError.missingScopes.length > 0 && (
                  <div className="text-xs mt-2">
                    <div className="font-medium mb-1">Missing scopes:</div>
                    <ul className="ml-4 list-disc">
                      {validationError.missingScopes.map((scope) => (
                        <li key={scope}>
                          <code className="bg-destructive-foreground/10 px-1 rounded">
                            {scope}
                          </code>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2">
                      Please create a new token with the required scopes.
                    </p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Advanced Options */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {showAdvanced ? '− Hide' : '+ Show'} advanced options
            </button>

            {showAdvanced && (
              <div className="space-y-2 pl-4 border-l-2">
                <Label htmlFor="github-base-url">GitHub Enterprise URL (Optional)</Label>
                <Input
                  id="github-base-url"
                  type="url"
                  placeholder="https://github.mycompany.com/api/v3"
                  value={githubBaseUrl}
                  onChange={(e) => setGithubBaseUrl(e.target.value)}
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Only needed for GitHub Enterprise installations
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={isPending} className="flex-1">
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
