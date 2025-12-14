import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import type { Person } from '../types';
import { useUser } from '../contexts/UserContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';

interface LoginProps {
  onClose?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onClose }) => {
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login } = useUser();

  // Fetch all people for the dropdown
  const { data: people, isLoading, error } = useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      console.log('🔄 Fetching people data...');
      const response = await api.people.list();
      // console.log('✅ People data received:', response.data.data?.length, 'people');
      return response.data.data as Person[];
    },
  });

  // console.log('👥 Login component state:', { 
  //   peopleCount: people?.length, 
  //   isLoading, 
  //   hasError: !!error,
  //   selectedPersonId 
  // });

  const handleLogin = async () => {
    if (!selectedPersonId) return;

    setIsLoggingIn(true);
    setLoginError(null);

    try {
      await login(selectedPersonId);
      if (onClose) {
        onClose();
      }
    } catch (err) {
      console.error('Login failed:', err);
      setLoginError('Failed to log in. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handlePersonSelect = (personId: string) => {
    setSelectedPersonId(personId);
  };

  if (isLoading) {
    return (
      <Dialog open={true} modal>
        <DialogContent 
          className="!w-[350px] !max-w-[350px] [&>button]:hidden" 
          onPointerDownOutside={(e) => e.preventDefault()} 
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-semibold">Select Your Profile</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Choose your profile to personalize your experience
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading employees...</div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={true} modal>
        <DialogContent 
          className="!w-[350px] !max-w-[350px] [&>button]:hidden" 
          onPointerDownOutside={(e) => e.preventDefault()} 
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-semibold">Error</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Failed to load employee list. Please try again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-6 border-t border-border/50">
            <Button onClick={() => window.location.reload()} className="min-w-[100px]">
              Retry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} modal>
      <DialogContent 
        className="!w-[380px] !max-w-[380px] [&>button]:hidden" 
        style={{ padding: '24px' }}
        onPointerDownOutside={(e) => e.preventDefault()} 
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-1.5 pb-4">
          <DialogTitle className="text-lg font-semibold">Select Your Profile</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Choose your profile to personalize your experience
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="person-select" className="text-sm font-medium">Who are you?</Label>
            <Select value={selectedPersonId} onValueChange={handlePersonSelect}>
              <SelectTrigger id="person-select" className="w-full">
                <SelectValue placeholder="Select your name..." />
              </SelectTrigger>
              <SelectContent>
                {people?.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.name} {person.primary_role_name && `(${person.primary_role_name})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {loginError && (
            <div className="text-sm text-destructive text-center">
              {loginError}
            </div>
          )}
          <DialogFooter className="pt-6">
            <div className="w-full space-y-3">
              <Button
                type="submit"
                disabled={!selectedPersonId || isLoggingIn}
                className="w-full"
              >
                {isLoggingIn ? 'Signing in...' : 'Continue'}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Your selection will be saved for future visits
              </p>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};