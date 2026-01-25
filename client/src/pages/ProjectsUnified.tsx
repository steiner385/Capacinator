import React from 'react';
import { FolderKanban, GanttChart, Palette } from 'lucide-react';

// Import existing page components
import { Projects } from './Projects';
import ProjectRoadmap from './ProjectRoadmap';
import ProjectTypes from './ProjectTypes';

// Import the new unified tab component
import { UnifiedTabComponent, type UnifiedTabConfig } from '../components/ui/UnifiedTabComponent';

// CSS imports
import './Projects.css';
import './ProjectRoadmap.css';
import './ProjectTypes.css';

const tabs: UnifiedTabConfig[] = [
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
  return (
    <UnifiedTabComponent
      tabs={tabs}
      defaultTab="list"
      paramName="tab"
      orientation="horizontal"
      variant="primary"
      size="md"
      ariaLabel="Project management navigation"
      className="projects-unified-container"
    />
  );
}