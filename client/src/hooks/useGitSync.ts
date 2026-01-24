/**
 * useGitSync Hook
 * Feature: 001-git-sync-integration
 * Task: T033
 *
 * Wraps GitSyncContext operations for convenient use in components
 */

import { useGitSync as useGitSyncContext } from '../contexts/GitSyncContext';

/**
 * Hook to access Git sync operations and state
 *
 * Re-exports the context hook for convenience
 */
export const useGitSync = useGitSyncContext;
