import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { GitBranch } from 'lucide-react';
import { api } from '../../lib/api-client';
import { PortalModal } from '../ui/PortalModal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useUser } from '../../contexts/UserContext';

interface CreateScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentScenario?: any;
}

export const CreateScenarioModal: React.FC<CreateScenarioModalProps> = ({
  isOpen,
  onClose,
  parentScenario
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scenarioType, setScenarioType] = useState<'branch' | 'sandbox'>('branch');
  const { currentUser } = useUser();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) => api.scenarios.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      onClose();
      setName('');
      setDescription('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentUser) return;

    createMutation.mutate({
      name: name.trim(),
      description: description.trim(),
      parent_scenario_id: parentScenario?.id,
      created_by: currentUser.id,
      scenario_type: scenarioType
    });
  };

  return (
    <PortalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Scenario"
    >
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {parentScenario && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-md">
              <GitBranch size={16} />
              <span className="text-sm">Branching from: <strong>{parentScenario.name}</strong></span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="scenario-name">Scenario Name *</Label>
            <Input
              id="scenario-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter scenario name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scenario-description">Description</Label>
            <Textarea
              id="scenario-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this scenario"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scenario-type">Scenario Type</Label>
            <Select
              value={scenarioType}
              onValueChange={(value) => setScenarioType(value as 'branch' | 'sandbox')}
            >
              <SelectTrigger id="scenario-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="branch">Branch - Copy from parent scenario</SelectItem>
                <SelectItem value="sandbox">Sandbox - Start fresh</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={!name.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Scenario'}
            </Button>
          </div>
        </form>
      </div>
    </PortalModal>
  );
};

interface EditScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: any;
}

export const EditScenarioModal: React.FC<EditScenarioModalProps> = ({
  isOpen,
  onClose,
  scenario
}) => {
  const [name, setName] = useState(scenario?.name || '');
  const [description, setDescription] = useState(scenario?.description || '');
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data: any) => api.scenarios.update(scenario.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    updateMutation.mutate({
      name: name.trim(),
      description: description.trim()
    });
  };

  return (
    <PortalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Scenario"
    >
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="edit-scenario-name">Scenario Name *</Label>
            <Input
              id="edit-scenario-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter scenario name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-scenario-description">Description</Label>
            <Textarea
              id="edit-scenario-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this scenario"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit"
              disabled={!name.trim() || updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </PortalModal>
  );
};

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  scenario: any;
  onConfirm: () => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  scenario,
  onConfirm
}) => {
  const [confirmText, setConfirmText] = useState('');
  const isDeleteEnabled = confirmText === scenario?.name;

  const handleConfirm = () => {
    if (isDeleteEnabled) {
      onConfirm();
      onClose();
    }
  };

  return (
    <PortalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Scenario"
    >
      <div className="p-6">
        <div className="space-y-6">
          <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-800 dark:text-red-200">
              <strong>Warning:</strong> This action cannot be undone. This will permanently delete
              the scenario <strong>{scenario?.name}</strong> and all associated data.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-delete">
              Type <strong>{scenario?.name}</strong> to confirm deletion
            </Label>
            <Input
              id="confirm-delete"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Enter scenario name"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="button"
              variant="destructive"
              disabled={!isDeleteEnabled}
              onClick={handleConfirm}
            >
              Delete Scenario
            </Button>
          </div>
        </div>
      </div>
    </PortalModal>
  );
};