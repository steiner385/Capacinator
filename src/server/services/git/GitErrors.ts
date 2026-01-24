/**
 * Git operation error classes
 * Feature: 001-git-sync-integration
 * Task: T093
 *
 * Provides user-friendly error messages and categorization for Git failures
 */

/**
 * Base class for all Git-related errors
 */
export class GitError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly userMessage: string,
    public readonly recoverable: boolean = true
  ) {
    super(message);
    this.name = 'GitError';
  }
}

/**
 * Network connectivity errors (DNS, timeout, unreachable)
 */
export class GitNetworkError extends GitError {
  constructor(message: string, public readonly originalError?: Error) {
    super(
      message,
      'GIT_NETWORK_ERROR',
      'Cannot connect to GitHub Enterprise. Please check your internet connection and try again.',
      true
    );
    this.name = 'GitNetworkError';
  }
}

/**
 * Authentication errors (invalid token, expired credentials)
 */
export class GitAuthenticationError extends GitError {
  constructor(message: string, public readonly originalError?: Error) {
    super(
      message,
      'GIT_AUTH_ERROR',
      'Authentication failed. Your GitHub token may be invalid or expired. Please update your credentials in Settings.',
      true
    );
    this.name = 'GitAuthenticationError';
  }
}

/**
 * Permission errors (insufficient permissions, protected branch)
 */
export class GitPermissionError extends GitError {
  constructor(message: string, public readonly operation: string) {
    super(
      message,
      'GIT_PERMISSION_ERROR',
      `You don't have permission to ${operation}. Please contact your repository administrator.`,
      false
    );
    this.name = 'GitPermissionError';
  }
}

/**
 * Merge conflict errors
 */
export class GitConflictError extends GitError {
  constructor(
    message: string,
    public readonly conflictedFiles: string[],
    public readonly operation: 'pull' | 'merge'
  ) {
    const fileCount = conflictedFiles.length;
    super(
      message,
      'GIT_CONFLICT_ERROR',
      `${operation === 'pull' ? 'Pull' : 'Merge'} resulted in ${fileCount} conflict${fileCount !== 1 ? 's' : ''}. Please resolve the conflicts before continuing.`,
      true
    );
    this.name = 'GitConflictError';
  }
}

/**
 * Repository state errors (not initialized, detached HEAD, etc.)
 */
export class GitRepositoryStateError extends GitError {
  constructor(message: string, public readonly state: string) {
    super(
      message,
      'GIT_REPO_STATE_ERROR',
      `Repository is in an invalid state: ${state}. Please contact support for assistance.`,
      false
    );
    this.name = 'GitRepositoryStateError';
  }
}

/**
 * Disk space errors
 */
export class GitDiskSpaceError extends GitError {
  constructor(message: string, public readonly requiredMB: number, public readonly availableMB: number) {
    super(
      message,
      'GIT_DISK_SPACE_ERROR',
      `Insufficient disk space. Operation requires ${requiredMB}MB but only ${availableMB}MB available. Please free up disk space and try again.`,
      true
    );
    this.name = 'GitDiskSpaceError';
  }
}

/**
 * Branch errors (branch doesn't exist, already exists, etc.)
 */
export class GitBranchError extends GitError {
  constructor(message: string, public readonly branchName: string, public readonly reason: string) {
    super(
      message,
      'GIT_BRANCH_ERROR',
      `Branch operation failed for "${branchName}": ${reason}`,
      true
    );
    this.name = 'GitBranchError';
  }
}

/**
 * Clone operation errors
 */
export class GitCloneError extends GitError {
  constructor(message: string, public readonly repositoryUrl: string, public readonly originalError?: Error) {
    super(
      message,
      'GIT_CLONE_ERROR',
      `Failed to clone repository. Please verify the repository URL and your network connection.`,
      true
    );
    this.name = 'GitCloneError';
  }
}

/**
 * Push operation errors
 */
export class GitPushError extends GitError {
  constructor(message: string, public readonly reason: string) {
    super(
      message,
      'GIT_PUSH_ERROR',
      `Push failed: ${reason}. Please pull the latest changes first and try again.`,
      true
    );
    this.name = 'GitPushError';
  }
}

/**
 * Parse error message and categorize into appropriate error type
 *
 * @param error - Original error from simple-git
 * @param operation - Git operation being performed
 * @returns Categorized GitError
 */
export function categorizeGitError(error: Error, operation: string): GitError {
  const message = error.message.toLowerCase();

  // Network errors
  if (
    message.includes('enotfound') ||
    message.includes('econnrefused') ||
    message.includes('etimedout') ||
    message.includes('getaddrinfo') ||
    message.includes('could not resolve host')
  ) {
    return new GitNetworkError(error.message, error);
  }

  // Authentication errors
  if (
    message.includes('authentication failed') ||
    message.includes('invalid credentials') ||
    message.includes('could not read username') ||
    message.includes('401') ||
    message.includes('403 forbidden') ||
    message.includes('bad credentials')
  ) {
    return new GitAuthenticationError(error.message, error);
  }

  // Permission errors
  if (
    message.includes('permission denied') ||
    message.includes('insufficient permission') ||
    message.includes('protected branch') ||
    message.includes('you are not allowed')
  ) {
    return new GitPermissionError(error.message, operation);
  }

  // Merge conflicts
  if (message.includes('conflict')) {
    return new GitConflictError(error.message, [], operation as 'pull' | 'merge');
  }

  // Branch errors
  if (
    message.includes('branch') &&
    (message.includes('already exists') || message.includes('not found') || message.includes('does not exist'))
  ) {
    return new GitBranchError(error.message, '', error.message);
  }

  // Push errors (non-fast-forward, etc.)
  if (message.includes('push') || message.includes('non-fast-forward') || message.includes('rejected')) {
    return new GitPushError(error.message, 'Remote has changes that you do not have locally');
  }

  // Clone errors
  if (message.includes('clone') || message.includes('repository not found')) {
    return new GitCloneError(error.message, '', error);
  }

  // Generic Git error
  return new GitError(
    error.message,
    'GIT_UNKNOWN_ERROR',
    `Git operation failed: ${operation}. ${error.message}`,
    true
  );
}
