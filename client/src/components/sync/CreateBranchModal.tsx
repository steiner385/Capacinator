/**
 * Create Branch Modal Component
 * Feature: 001-git-sync-integration
 * Task: T080
 *
 * Modal for creating new scenario branches
 */

import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { api } from '../../lib/api-client';

interface CreateBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBranchCreated?: (branchName: string) => void;
  currentBranch?: string;
}

export const CreateBranchModal: React.FC<CreateBranchModalProps> = ({
  isOpen,
  onClose,
  onBranchCreated,
  currentBranch = 'main',
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate branch name
    const branchNameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!branchNameRegex.test(name)) {
      setError('Branch name can only contain letters, numbers, hyphens, and underscores');
      return;
    }

    if (name === 'main' || name === 'master') {
      setError('Cannot use "main" or "master" as branch name');
      return;
    }

    setIsCreating(true);
    try {
      await api.sync.createBranch({
        name,
        description,
      });

      // Switch to the new branch
      await api.sync.checkoutBranch(name);

      if (onBranchCreated) {
        onBranchCreated(name);
      }

      // Reset form and close
      setName('');
      setDescription('');
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Failed to create branch');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setName('');
    setDescription('');
    setError(null);
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <Dialog.Title className="text-xl font-semibold mb-4">
            Create New Scenario Branch
          </Dialog.Title>

          <Dialog.Description className="text-sm text-gray-600 mb-6">
            Create a new scenario branch to experiment with different resource allocations without
            affecting the main scenario.
          </Dialog.Description>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="branch-name" className="block text-sm font-medium text-gray-700 mb-2">
                Branch Name *
              </label>
              <input
                id="branch-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., q1-optimistic, reduced-capacity"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isCreating}
              />
              <p className="mt-1 text-xs text-gray-500">
                Only letters, numbers, hyphens, and underscores allowed
              </p>
            </div>

            <div className="mb-6">
              <label htmlFor="branch-description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="branch-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what makes this scenario different..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isCreating}
              />
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded text-sm text-blue-700">
              <div className="font-medium mb-1">📌 Note</div>
              <div>
                This branch will be created from: <strong>{currentBranch}</strong>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isCreating}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || !name.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating ? 'Creating...' : 'Create Branch'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
