import React from 'react';
import { Users, UserCog, Calendar } from 'lucide-react';

// Import existing page components
import People from './People';
import Roles from './Roles';
import Availability from './Availability';

// Import the new unified tab component
import { UnifiedTabComponent, type UnifiedTabConfig } from '../components/ui/UnifiedTabComponent';

// CSS imports
import './People.css';
import './Roles.css';

const tabs: UnifiedTabConfig[] = [
  {
    id: 'people',
    label: 'People',
    icon: Users,
    component: People
  },
  {
    id: 'roles',
    label: 'Roles',
    icon: UserCog,
    component: Roles
  },
  {
    id: 'availability',
    label: 'Availability',
    icon: Calendar,
    component: Availability
  }
];

export default function PeopleUnified() {
  return (
    <UnifiedTabComponent
      tabs={tabs}
      defaultTab="people"
      paramName="tab"
      orientation="horizontal"
      variant="primary"
      size="md"
      ariaLabel="People management navigation"
      className="people-unified-container"
    />
  );
}