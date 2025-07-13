import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FolderKanban, GanttChart, Palette } from 'lucide-react';

// Import existing page components
import { Projects } from './Projects';
import ProjectRoadmap from './ProjectRoadmap';
import ProjectTypes from './ProjectTypes';

// CSS imports
import './Projects.css';
import './ProjectRoadmap.css';
import './ProjectTypes.css';
import './ProjectsUnified.css';

type ProjectsTab = 'list' | 'roadmap' | 'types';

interface TabConfig {
  id: ProjectsTab;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  component: React.ComponentType;
}

const tabs: TabConfig[] = [
  {
    id: 'list',
    label: 'Projects',
    icon: FolderKanban,
    component: Projects
  },
  {
    id: 'roadmap',
    label: 'Roadmap',
    icon: GanttChart,
    component: ProjectRoadmap
  },
  {
    id: 'types',
    label: 'Project Types',
    icon: Palette,
    component: ProjectTypes
  }
];

export default function ProjectsUnified() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<ProjectsTab>('list');

  // Auto-switch to roadmap tab if came from /roadmap URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab') as ProjectsTab;
    if (tab && ['list', 'roadmap', 'types'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location]);

  console.log('ProjectsUnified rendering, activeTab:', activeTab);

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || Projects;

  return (
    <div className="projects-unified">
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