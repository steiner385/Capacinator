/**
 * GitHubConnectionManager Component
 * Feature: 005-github-auth-user-link
 * Tasks: T020, T022
 *
 * Manages GitHub account connections for the current user.
 * Displays existing connections and provides UI to connect new accounts.
 */

import React, { useState } from 'react';
import {
  useGitHubConnections,
  useInitiateOAuth,
  useUpdateGitHubConnection,
  useDeleteGitHubConnection,
  type GitHubConnection,
} from '../hooks/useGitHubConnections';
import { GitHubPATInput } from './GitHubPATInput';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Github, Trash2, CheckCircle2, AlertCircle, Clock, Loader2, ChevronDown, Key } from 'lucide-react';

export function GitHubConnectionManager() {
  const [deleteConnectionId, setDeleteConnectionId] = useState<number | null>(null);
  const [showPATInput, setShowPATInput] = useState(false);

  // Fetch GitHub connections
  const { data: connections, isLoading, error } = useGitHubConnections({
    includeInactive: false,
    includeAssociations: true,
  });

  // Mutations
  const { mutate: initiateOAuth, isPending: isInitiating } = useInitiateOAuth();
  const { mutate: updateConnection, isPending: isUpdating } = useUpdateGitHubConnection();
  const { mutate: deleteConnection, isPending: isDeleting } = useDeleteGitHubConnection();

  const handleConnectOAuth = () => {
    initiateOAuth();
  };

  const handleConnectPAT = () => {
    setShowPATInput(true);
  };

  const handlePATSuccess = () => {
    setShowPATInput(false);
  };

  const handlePATCancel = () => {
    setShowPATInput(false);
  };

  const handleSetDefault = (id: number) => {
    updateConnection({ id, data: { is_default: true } });
  };

  const handleDisconnect = (id: number) => {
    setDeleteConnectionId(id);
  };

  const confirmDisconnect = () => {
    if (deleteConnectionId) {
      deleteConnection(deleteConnectionId);
      setDeleteConnectionId(null);
    }
  };

  const getStatusBadge = (connection: GitHubConnection) => {
    switch (connection.status) {
      case 'active':
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Active
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Expired
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Error
          </Badge>
        );
      case 'revoked':
        return (
          <Badge variant="secondary" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Revoked
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GitHub Connections</CardTitle>
          <CardDescription>
            Connect your GitHub account for Git sync operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>GitHub Connections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm text-muted-foreground">
              Failed to load GitHub connections
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasConnections = connections && connections.length > 0;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>GitHub Connections</CardTitle>
              <CardDescription>
                Connect your GitHub account for Git sync operations
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={isInitiating} className="gap-2">
                  {isInitiating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Github className="h-4 w-4" />
                      Connect GitHub Account
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleConnectOAuth}>
                  <Github className="h-4 w-4 mr-2" />
                  Connect via OAuth
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleConnectPAT}>
                  <Key className="h-4 w-4 mr-2" />
                  Connect via Personal Access Token
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* PAT Input Form */}
          {showPATInput && (
            <GitHubPATInput onSuccess={handlePATSuccess} onCancel={handlePATCancel} />
          )}

          {/* Connections List or Empty State */}
          {!hasConnections ? (
            <div className="text-center py-8">
              <Github className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                No GitHub connections yet
              </p>
              <p className="text-xs text-muted-foreground">
                Click "Connect GitHub Account" above to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {connections.map((connection) => (
                <div
                  key={connection.id}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <Github className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {connection.github_username}
                        </span>
                        {connection.is_default && (
                          <Badge variant="outline">Default</Badge>
                        )}
                        {getStatusBadge(connection)}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div>
                          Method: {connection.connection_method.toUpperCase()}
                        </div>
                        <div>Connected: {formatDate(connection.created_at)}</div>
                        {connection.last_used_at && (
                          <div>
                            Last used: {formatDate(connection.last_used_at)}
                          </div>
                        )}
                        {connection.associations && connection.associations.length > 0 && (
                          <div>
                            Linked to {connection.associations.length} people{' '}
                            {connection.associations.length === 1
                              ? 'resource'
                              : 'resources'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!connection.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(connection.id)}
                        disabled={isUpdating}
                      >
                        Set as Default
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDisconnect(connection.id)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog
        open={deleteConnectionId !== null}
        onOpenChange={() => setDeleteConnectionId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect GitHub Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the connection and you will no longer be able to use
              Git sync operations with this account. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDisconnect}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
