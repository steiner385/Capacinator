import React, { useState } from 'react';
import { Users, UserCog, Calendar } from 'lucide-react';

// Import existing page components
import People from './People';
import Roles from './Roles';
import Availability from './Availability';

// CSS imports
import './People.css';
import './Roles.css';
import './PeopleUnified.css';

type PeopleTab = 'people' | 'roles' | 'availability';

interface TabConfig {
  id: PeopleTab;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  component: React.ComponentType;
}

const tabs: TabConfig[] = [
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
  const [activeTab, setActiveTab] = useState<PeopleTab>('people');

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || People;

  return (
    <div className="people-unified">
      {/* Tab Navigation */}
      <div className="unified-tabs">
        <div className="tab-list" role="tablist">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`tabpanel-${tab.id}`}
                className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div 
        className="tab-content"
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        <ActiveComponent />
      </div>
    </div>
  );
}