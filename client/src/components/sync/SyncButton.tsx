/**
 * Sync Button Component
 * Feature: 001-git-sync-integration
 * Task: T032
 *
 * Provides "Save & Sync" action button
 */

import React from 'react';
import { useGitSync } from '../../contexts/GitSyncContext';

interface SyncButtonProps {
  variant?: 'primary' | 'secondary';
  label?: string;
  onSyncComplete?: () => void;
}

export const SyncButton: React.FC<SyncButtonProps> = ({
  variant = 'primary',
  label = 'Save & Sync',
  onSyncComplete
}) => {
  const { status, sync, isOnline } = useGitSync();

  const handleClick = async () => {
    try {
      await sync();
      onSyncComplete?.();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const isDisabled = status === 'syncing' || !isOnline;

  const baseClasses = 'px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const variantClasses = variant === 'primary'
    ? 'bg-blue-600 text-white hover:bg-blue-700'
    : 'bg-gray-200 text-gray-900 hover:bg-gray-300';

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`${baseClasses} ${variantClasses}`}
      title={!isOnline ? 'Cannot sync while offline - changes will be queued' : undefined}
    >
      {status === 'syncing' ? (
        <>
          <span className="inline-block animate-spin mr-2">↻</span>
          Syncing...
        </>
      ) : (
        label
      )}
    </button>
  );
};
