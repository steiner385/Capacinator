import React from 'react';
import { BarChart3, TrendingUp, Users, AlertTriangle } from 'lucide-react';
import { UnifiedTabComponent, type UnifiedTabConfig } from '../components/ui/UnifiedTabComponent';
import { ReportsTabContent } from './ReportsTabContent';

// Define report tabs configuration with icons
const reportTabs: UnifiedTabConfig[] = [
  { id: 'demand', label: 'Demand', icon: TrendingUp },
  { id: 'capacity', label: 'Capacity', icon: Users },
  { id: 'utilization', label: 'Utilization', icon: BarChart3 },
  { id: 'gaps', label: 'Gaps Analysis', icon: AlertTriangle }
];

// Custom component to render the active tab content
const ReportsContentRenderer: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  return <ReportsTabContent activeReport={activeTab} />;
};

export default function ReportsUnified() {
  return (
    <UnifiedTabComponent
      tabs={reportTabs}
      defaultTab="demand"
      paramName="tab"
      orientation="horizontal"
      variant="primary"
      size="md"
      ariaLabel="Reports and analytics navigation"
      className="reports-unified-container"
      renderContent={true}
    >
      {(activeTab: string) => <ReportsContentRenderer activeTab={activeTab} />}
    </UnifiedTabComponent>
  );
}