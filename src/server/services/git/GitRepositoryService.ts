/**
 * Git repository service for clone, pull, commit, push operations
 * Feature: 001-git-sync-integration
 *
 * Uses simple-git library for Git operations
 */

import simpleGit, { SimpleGit } from 'simple-git';
import fs from 'fs/promises';
import path from 'path';
import type { GitCredential, PullResult, GitAuthor } from '../../../../shared/types/git-entities.js';
import { GitAuthService } from './GitAuthService.js';
import {
  categorizeGitError,
  GitCloneError,
  GitPushError,
  GitBranchError,
  GitRepositoryStateError,
} from './GitErrors.js';
import { GitHealthCheck } from './GitHealthCheck.js';
import { gitLogger } from './GitLogger.js';

export class GitRepositoryService {
  private git: SimpleGit;
  private repoPath: string;
  private authService: GitAuthService;
  private healthCheck: GitHealthCheck;
  private gitInitialized: boolean = false;

  constructor(repoPath: string) {
    this.repoPath = repoPath;
    // In test/CI environment, delay git initialization until first use
    // This prevents errors when the git directory doesn't exist during test imports or CI runs
    if (process.env.NODE_ENV === 'test' || process.env.CI) {
      // Create a stub git instance that will be replaced on first use
      this.git = {} as SimpleGit;
      this.gitInitialized = false;
    } else {
      this.git = simpleGit(repoPath);
      this.gitInitialized = true;
    }
    this.authService = new GitAuthService();
    this.healthCheck = new GitHealthCheck();
  }

  /**
   * Ensure git instance is initialized (lazy init for test environment)
   */
  private ensureGitInitialized(): void {
    if (!this.gitInitialized) {
      this.git = simpleGit(this.repoPath);
      this.gitInitialized = true;
    }
  }

  /**
   * Check if repository exists and is initialized
   *
   * @returns True if .git directory exists
   */
  async repositoryExists(): Promise<boolean> {
    try {
      await fs.access(path.join(this.repoPath, '.git'));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current Git status
   *
   * @returns Git status object
   */
  async getStatus() {
    this.ensureGitInitialized();
    return await this.git.status();
  }

  /**
   * Get remote URL for origin
   *
   * @returns Remote URL or null if not found
   */
  async getRemoteUrl(): Promise<string | null> {
    this.ensureGitInitialized();
    try {
      const remotes = await this.git.getRemotes(true);
      const origin = remotes.find((r) => r.name === 'origin');
      return origin?.refs.fetch || null;
    } catch (error) {
      console.error('Failed to get remote URL:', error);
      return null;
    }
  }

  /**
   * Get current branch name
   *
   * @returns Current branch name
   */
  async getCurrentBranch(): Promise<string> {
    const status = await this.getStatus();
    return status.current || 'main';
  }

  /**
   * Check if there are uncommitted changes
   *
   * @returns True if working directory is clean
   */
  async isClean(): Promise<boolean> {
    this.ensureGitInitialized();
    const status = await this.getStatus();
    return status.isClean();
  }

  /**
   * Get list of all branches
   *
   * @returns Array of branch names
   */
  async listBranches(): Promise<string[]> {
    this.ensureGitInitialized();
    const branches = await this.git.branch();
    return branches.all;
  }

  /**
   * Check if repository is behind remote
   *
   * @returns Number of commits behind
   */
  async getCommitsBehind(): Promise<number> {
    const status = await this.getStatus();
    return status.behind;
  }

  /**
   * Check if repository is ahead of remote
   *
   * @returns Number of commits ahead
   */
  async getCommitsAhead(): Promise<number> {
    const status = await this.getStatus();
    return status.ahead;
  }

  /**
   * Initialize repository (check if exists, set branch)
   * Task: T016, T093
   *
   * @param remoteUrl - GitHub Enterprise repository URL
   * @param credentials - Git credentials
   * @throws {GitCloneError} If clone operation fails
   * @throws {GitNetworkError} If network connectivity issues
   * @throws {GitAuthenticationError} If authentication fails
   */
  async initialize(remoteUrl: string, credentials: GitCredential): Promise<void> {
    this.ensureGitInitialized();
    try {
      const exists = await this.repositoryExists();

      if (!exists) {
        await this.clone(remoteUrl, credentials);
      } else {
        // Ensure we're on main branch
        await this.git.checkout('main');
      }
    } catch (error) {
      // If it's already a GitError, re-throw it
      if ((error as any).code && (error as any).code.startsWith('GIT_')) {
        throw error;
      }

      throw categorizeGitError(error as Error, 'initialize repository');
    }
  }

  /**
   * Clone repository with shallow clone
   * Task: T017, T093, T099, T101, T102
   *
   * @param remoteUrl - GitHub Enterprise repository URL
   * @param credentials - Git credentials
   * @throws {GitCloneError} If clone operation fails
   * @throws {GitNetworkError} If network connectivity issues
   * @throws {GitAuthenticationError} If authentication fails
   * @throws {GitDiskSpaceError} If insufficient disk space
   */
  async clone(remoteUrl: string, credentials: GitCredential): Promise<void> {
    this.ensureGitInitialized();
    const timer = gitLogger.startTimer();
    gitLogger.logOperationStart('clone', { repositoryUrl: remoteUrl });

    try {
      // Perform health check before cloning (T101, T102)
      // Clones typically need at least 100MB for shallow clones
      await this.healthCheck.performHealthCheck(remoteUrl, this.repoPath, 100);

      const authUrl = this.authService.addCredentialsToUrl(remoteUrl, credentials.token);

      await simpleGit().clone(authUrl, this.repoPath, {
        '--depth': 1, // Shallow clone
        '--single-branch': null,
        '--branch': 'main',
      });

      this.git = simpleGit(this.repoPath);

      gitLogger.logOperationSuccess('clone', timer(), { repositoryUrl: remoteUrl });
    } catch (error) {
      gitLogger.logOperationFailure('clone', error as Error, { repositoryUrl: remoteUrl });

      // If it's already a health check error, re-throw it
      if ((error as any).code && (error as any).code.startsWith('GIT_')) {
        throw error;
      }

      const gitError = categorizeGitError(error as Error, 'clone');

      // Add specific context for clone errors
      if (gitError.code === 'GIT_UNKNOWN_ERROR') {
        throw new GitCloneError((error as Error).message, remoteUrl, error as Error);
      }

      throw gitError;
    }
  }

  /**
   * Pull updates from remote with merge strategy
   * Task: T018, T048, T092, T093, T099, T101
   *
   * @returns Pull result with files changed and conflicts
   * @throws {GitNetworkError} If network connectivity issues
   * @throws {GitAuthenticationError} If authentication fails
   * @throws {GitConflictError} If merge conflicts occur (returned in PullResult instead)
   */
  async pull(branch?: string): Promise<PullResult> {
    this.ensureGitInitialized();
    const timer = gitLogger.startTimer();
    const targetBranch = branch || (await this.getCurrentBranch());
    gitLogger.logOperationStart('pull', { branch: targetBranch });

    try {
      // Check network connectivity before pulling (T101)
      const remoteUrl = await this.getRemoteUrl();
      if (remoteUrl) {
        const networkCheck = await this.healthCheck.checkNetworkConnectivity(remoteUrl, 3000);
        if (!networkCheck.reachable) {
          throw categorizeGitError(new Error(`Network unreachable: ${networkCheck.error}`), 'pull');
        }
      }

      // Pull from current branch if not specified (Task: T092)
      const result = await this.git.pull('origin', targetBranch, {
        '--rebase': 'false', // Merge, don't rebase
        '--no-ff': null, // Always create merge commit
      });

      // Check for Git-level conflicts by checking git status
      const conflictedFiles = await this.getConflictedFiles();
      const hasConflicts = conflictedFiles.length > 0;

      if (hasConflicts) {

        gitLogger.warn('pull', `Conflicts detected (${conflictedFiles.length} files)`, {
          branch: targetBranch,
          filesChanged: result.files.length,
          conflictsCount: conflictedFiles.length,
        });

        return {
          success: false,
          filesChanged: result.files.length,
          conflicts: conflictedFiles,
        };
      }

      gitLogger.logOperationSuccess('pull', timer(), {
        branch: targetBranch,
        filesChanged: result.files.length,
      });

      return {
        success: true,
        filesChanged: result.files.length,
        conflicts: [],
      };
    } catch (error) {
      gitLogger.logOperationFailure('pull', error as Error, { branch: targetBranch });

      // If it's already a GitError (e.g., from health check), re-throw it
      if ((error as any).code && (error as any).code.startsWith('GIT_')) {
        throw error;
      }

      // If conflict error, return conflict information instead of throwing
      if ((error as Error).message.includes('CONFLICT')) {
        const conflictedFiles = await this.getConflictedFiles().catch(() => []);
        return {
          success: false,
          filesChanged: 0,
          conflicts: conflictedFiles,
        };
      }

      // For other errors, categorize and throw
      throw categorizeGitError(error as Error, 'pull');
    }
  }

  /**
   * Get list of files with merge conflicts
   * Task: T048
   *
   * @returns Array of conflicted file paths
   */
  async getConflictedFiles(): Promise<string[]> {
    this.ensureGitInitialized();
    try {
      const status = await this.git.status();
      return status.conflicted;
    } catch (error) {
      console.error('Failed to get conflicted files:', error);
      return [];
    }
  }

  /**
   * Commit changes with author attribution
   * Task: T019, T093, T099
   *
   * @param message - Commit message
   * @param author - Git author information
   * @returns Commit SHA hash
   * @throws {GitRepositoryStateError} If nothing to commit or repository in invalid state
   */
  async commit(message: string, author: GitAuthor): Promise<string> {
    this.ensureGitInitialized();
    const timer = gitLogger.startTimer();
    gitLogger.logOperationStart('commit', { author: author.email, message: message.substring(0, 50) });

    try {
      // Check if there are changes to commit
      const status = await this.getStatus();
      if (status.isClean()) {
        throw new GitRepositoryStateError('No changes to commit', 'clean-working-directory');
      }

      await this.git.add('./*');

      const result = await this.git.commit(message, undefined, {
        '--author': `${author.name} <${author.email}>`,
      });

      gitLogger.logOperationSuccess('commit', timer(), {
        author: author.email,
        commitSha: result.commit,
        message: message.substring(0, 50),
      });

      return result.commit; // SHA hash
    } catch (error) {
      gitLogger.logOperationFailure('commit', error as Error, { author: author.email });

      // If it's already a GitError, re-throw it
      if ((error as any).code && (error as any).code.startsWith('GIT_')) {
        throw error;
      }

      throw categorizeGitError(error as Error, 'commit');
    }
  }

  /**
   * Push changes to remote with credential authentication
   * Task: T020, T093, T099, T101
   *
   * @param credentials - Git credentials
   * @param branch - Branch to push (defaults to 'main')
   * @throws {GitRepositoryStateError} If no remote URL configured
   * @throws {GitPushError} If push is rejected (non-fast-forward)
   * @throws {GitNetworkError} If network connectivity issues
   * @throws {GitAuthenticationError} If authentication fails
   * @throws {GitPermissionError} If insufficient permissions
   */
  async push(credentials: GitCredential, branch: string = 'main'): Promise<void> {
    this.ensureGitInitialized();
    const timer = gitLogger.startTimer();
    gitLogger.logOperationStart('push', { branch });

    try {
      const remoteUrl = await this.getRemoteUrl();
      if (!remoteUrl) {
        throw new GitRepositoryStateError('No remote URL configured', 'no-remote');
      }

      // Check network connectivity before pushing (T101)
      const networkCheck = await this.healthCheck.checkNetworkConnectivity(remoteUrl, 3000);
      if (!networkCheck.reachable) {
        throw categorizeGitError(new Error(`Network unreachable: ${networkCheck.error}`), 'push');
      }

      const authUrl = this.authService.addCredentialsToUrl(remoteUrl, credentials.token);

      await this.git.push(authUrl, branch);

      gitLogger.logOperationSuccess('push', timer(), { branch, repositoryUrl: remoteUrl });
    } catch (error) {
      gitLogger.logOperationFailure('push', error as Error, { branch });

      // If it's already a GitError (e.g., from health check), re-throw it
      if ((error as any).code && (error as any).code.startsWith('GIT_')) {
        throw error;
      }

      // Check for specific push errors
      const errorMessage = (error as Error).message.toLowerCase();

      if (errorMessage.includes('rejected') || errorMessage.includes('non-fast-forward')) {
        throw new GitPushError(
          (error as Error).message,
          'Remote contains commits that you do not have locally. Pull the latest changes first.'
        );
      }

      if (errorMessage.includes('protected branch') || errorMessage.includes('permission')) {
        throw categorizeGitError(error as Error, 'push to protected branch');
      }

      throw categorizeGitError(error as Error, 'push');
    }
  }

  /**
   * Create a new branch for scenario branching
   * Task: T065, T093
   *
   * @param branchName - Name of the new branch
   * @param baseBranch - Branch to create from (defaults to current branch)
   * @throws {GitBranchError} If branch already exists or base branch doesn't exist
   */
  async createBranch(branchName: string, baseBranch?: string): Promise<void> {
    this.ensureGitInitialized();
    try {
      // Check if branch already exists
      const branches = await this.listBranches();
      if (branches.includes(branchName)) {
        throw new GitBranchError(
          `Branch ${branchName} already exists`,
          branchName,
          'A branch with this name already exists. Please choose a different name.'
        );
      }

      if (baseBranch) {
        // Check if base branch exists
        if (!branches.includes(baseBranch)) {
          throw new GitBranchError(
            `Base branch ${baseBranch} does not exist`,
            baseBranch,
            'The base branch you specified does not exist.'
          );
        }
        await this.git.checkoutBranch(branchName, baseBranch);
      } else {
        await this.git.checkoutLocalBranch(branchName);
      }
    } catch (error) {
      // If it's already a GitError, re-throw it
      if ((error as any).code && (error as any).code.startsWith('GIT_')) {
        throw error;
      }

      throw categorizeGitError(error as Error, `create branch ${branchName}`);
    }
  }

  /**
   * Checkout (switch to) a branch
   * Task: T066, T093
   *
   * @param branchName - Branch name to checkout
   * @throws {GitBranchError} If branch doesn't exist
   * @throws {GitRepositoryStateError} If there are uncommitted changes blocking checkout
   */
  async checkoutBranch(branchName: string): Promise<void> {
    this.ensureGitInitialized();
    try {
      // Check if branch exists
      const branches = await this.listBranches();
      if (!branches.includes(branchName)) {
        throw new GitBranchError(
          `Branch ${branchName} does not exist`,
          branchName,
          'The branch you are trying to switch to does not exist.'
        );
      }

      // Check for uncommitted changes
      const isClean = await this.isClean();
      if (!isClean) {
        throw new GitRepositoryStateError(
          'Cannot switch branches with uncommitted changes',
          'dirty-working-directory'
        );
      }

      await this.git.checkout(branchName);
    } catch (error) {
      // If it's already a GitError, re-throw it
      if ((error as any).code && (error as any).code.startsWith('GIT_')) {
        throw error;
      }

      throw categorizeGitError(error as Error, `checkout branch ${branchName}`);
    }
  }

  /**
   * Merge a branch into the current branch
   * Task: T068, T093
   *
   * @param branchName - Branch to merge into current branch
   * @returns Merge result with conflict information
   * @throws {GitBranchError} If branch doesn't exist
   * @throws {GitRepositoryStateError} If working directory is not clean
   */
  async mergeBranch(branchName: string): Promise<{
    success: boolean;
    conflicts: string[];
  }> {
    this.ensureGitInitialized();
    try {
      // Check if branch exists
      const branches = await this.listBranches();
      if (!branches.includes(branchName)) {
        throw new GitBranchError(
          `Branch ${branchName} does not exist`,
          branchName,
          'The branch you are trying to merge does not exist.'
        );
      }

      // Check for uncommitted changes
      const isClean = await this.isClean();
      if (!isClean) {
        throw new GitRepositoryStateError(
          'Cannot merge with uncommitted changes',
          'dirty-working-directory'
        );
      }

      await this.git.merge([branchName]);

      // Check for conflicts
      const status = await this.git.status();

      return {
        success: status.conflicted.length === 0,
        conflicts: status.conflicted,
      };
    } catch (error) {
      // If it's already a GitError, re-throw it
      if ((error as any).code && (error as any).code.startsWith('GIT_')) {
        throw error;
      }

      // If merge fails with conflicts, return conflict information
      if ((error as Error).message.includes('CONFLICT')) {
        const status = await this.git.status();
        return {
          success: false,
          conflicts: status.conflicted,
        };
      }

      throw categorizeGitError(error as Error, `merge branch ${branchName}`);
    }
  }

  /**
   * Get commit history for the repository
   * Task: T070
   *
   * @param options - Filtering options
   * @returns Array of commits
   */
  async getHistory(options?: {
    maxCount?: number;
    filePath?: string;
    branch?: string;
  }): Promise<Array<{
    hash: string;
    date: string;
    message: string;
    author_name: string;
    author_email: string;
  }>> {
    this.ensureGitInitialized();
    const logOptions: any = {
      maxCount: options?.maxCount || 50,
    };

    if (options?.filePath) {
      logOptions.file = options.filePath;
    }

    const log = await this.git.log(logOptions);

    return log.all.map((commit) => ({
      hash: commit.hash,
      date: commit.date,
      message: commit.message,
      author_name: commit.author_name,
      author_email: commit.author_email,
    }));
  }

  /**
   * Delete a branch
   *
   * @param branchName - Branch to delete
   * @param force - Force delete even if not merged
   */
  async deleteBranch(branchName: string, force: boolean = false): Promise<void> {
    this.ensureGitInitialized();
    await this.git.deleteLocalBranch(branchName, force);
  }

  /**
   * Get diff between two branches
   *
   * @param baseBranch - Base branch
   * @param targetBranch - Target branch
   * @returns Diff summary
   */
  async getDiff(baseBranch: string, targetBranch: string): Promise<string> {
    this.ensureGitInitialized();
    const diff = await this.git.diff([`${baseBranch}..${targetBranch}`]);
    return diff;
  }
}
