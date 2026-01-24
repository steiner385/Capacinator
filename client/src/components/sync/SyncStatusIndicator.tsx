/**
 * Sync Status Indicator Component
 * Feature: 001-git-sync-integration
 * Task: T031
 *
 * Displays current sync status in the navigation bar
 */

import React from 'react';
import { useGitSync } from '../../contexts/GitSyncContext';
import type { SyncStatus } from '../../../../shared/types/git-entities';

const statusConfig: Record<SyncStatus, { label: string; color: string; icon: string }> = {
  synced: {
    label: 'Synced',
    color: 'text-green-600 bg-green-50',
    icon: '✓',
  },
  pending: {
    label: 'Pending',
    color: 'text-yellow-600 bg-yellow-50',
    icon: '⏳',
  },
  syncing: {
    label: 'Syncing...',
    color: 'text-blue-600 bg-blue-50',
    icon: '↻',
  },
  conflict: {
    label: 'Conflicts',
    color: 'text-red-600 bg-red-50',
    icon: '⚠',
  },
  offline: {
    label: 'Offline',
    color: 'text-gray-600 bg-gray-50',
    icon: '○',
  },
};

export const SyncStatusIndicator: React.FC = () => {
  const { status, pendingCount, conflicts, lastSyncAt } = useGitSync();

  const config = statusConfig[status];

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm font-medium ${config.color}`}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
      {pendingCount > 0 && <span className="ml-1 text-xs">({pendingCount})</span>}
      {conflicts.length > 0 && <span className="ml-1 text-xs">({conflicts.length} conflicts)</span>}
      {lastSyncAt && status === 'synced' && (
        <span className="ml-2 text-xs opacity-60">
          {new Date(lastSyncAt).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
};
