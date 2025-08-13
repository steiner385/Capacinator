import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api-client';
import { Person } from '../types';
import { useUser } from '../contexts/UserContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';

interface LoginProps {
  onClose?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onClose }) => {
  const [selectedPersonId, setSelectedPersonId] = useState<string>('');
  const { setCurrentUser } = useUser();

  // Fetch all people for the dropdown
  const { data: people, isLoading, error } = useQuery({
    queryKey: ['people'],
    queryFn: async () => {
      console.log('🔄 Fetching people data...');
      const response = await api.people.list();
      console.log('✅ People data received:', response.data.data?.length, 'people');
      return response.data.data as Person[];
    },
  });

  console.log('👥 Login component state:', { 
    peopleCount: people?.length, 
    isLoading, 
    hasError: !!error,
    selectedPersonId 
  });

  const handleLogin = () => {
    if (!selectedPersonId || !people) return;

    const selectedPerson = people.find(person => person.id === selectedPersonId);
    if (selectedPerson) {
      setCurrentUser(selectedPerson);
      if (onClose) {
        onClose();
      }
    }
  };

  const handlePersonSelect = (personId: string) => {
    setSelectedPersonId(personId);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Select Your Profile</CardTitle>
            <CardDescription>Choose your profile to personalize your experience</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading employees...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Failed to load employee list. Please try again.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Select Your Profile</CardTitle>
          <CardDescription>Choose your profile to personalize your experience</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="person-select">Who are you?</Label>
              <Select value={selectedPersonId} onValueChange={handlePersonSelect}>
                <SelectTrigger id="person-select">
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
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button
            onClick={handleLogin}
            disabled={!selectedPersonId}
            className="w-full"
          >
            Continue
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            Your selection will be saved for future visits
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};