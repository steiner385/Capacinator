import React from 'react';
import { ExternalLink, Users, AlertTriangle, GitBranch } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ReportSummaryCard, ReportEmptyState, ReportTable } from './index';
import { getChartColor } from './chartConfig';
import { useScenario } from '../../contexts/ScenarioContext';
import type { Column, ActionButton } from './ReportTable';

interface DemandReportProps {
  data: any;
  filters: any;
  CustomTooltip: React.FC<any>;
}

export const DemandReport: React.FC<DemandReportProps> = ({ 
  data, 
  filters,
  CustomTooltip 
}) => {
  const { currentScenario } = useScenario();
  
  if (!data) return <div className="loading">Loading demand report...</div>;
  
  // Debug logging
  console.log('DemandReport data:', data);
  console.log('byProject:', data.byProject);
  console.log('timeline:', data.timeline);
  console.log('trendOverTime:', data.trendOverTime);

  // Define columns for high-demand projects table
  const projectDemandColumns: Column[] = [
    { header: 'Project', accessor: 'name' },
    { header: 'Demand', accessor: 'demand', render: (value) => `${value} hrs` }
  ];

  const projectDemandActions = (row: any): ActionButton[] => [{
    to: `/projects/${row.id}?from=demand-report&demand=${row.demand}&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`,
    icon: ExternalLink,
    text: 'View Details',
    variant: 'outline'
  }];

  // Define columns for high-demand roles table
  const roleDemandColumns: Column[] = [
    { header: 'Role', accessor: 'role_name' },
    { header: 'Demand', accessor: 'total_hours', render: (value) => `${value} hrs` }
  ];

  const roleDemandActions = (row: any): ActionButton[] => [{
    to: `/people?role=${encodeURIComponent(row.role_name)}&from=demand-report&demand=${row.total_hours}&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`,
    icon: Users,
    text: 'Find People',
    variant: 'outline'
  }];

  // Check if we have no demand data
  const hasNoDemand = !data.byProject || Object.keys(data.byProject).length === 0;

  return (
    <div className="report-content">
      {/* Scenario Context Display */}
      {currentScenario && (
        <div style={{
          backgroundColor: currentScenario.scenario_type === 'baseline' ? 'var(--bg-secondary)' : 'var(--primary-light)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <GitBranch size={20} style={{ color: 'var(--primary)' }} />
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>Current Scenario:</strong>{' '}
            <span style={{ color: 'var(--text-secondary)' }}>
              {currentScenario.name}
              {currentScenario.scenario_type !== 'baseline' && (
                <span style={{ fontSize: '0.875rem', marginLeft: '8px' }}>
                  (Branch from {currentScenario.parent_scenario_name || 'Baseline'})
                </span>
              )}
            </span>
          </div>
          {currentScenario.description && (
            <div style={{ marginLeft: 'auto', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {currentScenario.description}
            </div>
          )}
        </div>
      )}
      
      <div className="report-summary">
        <ReportSummaryCard
          title="Total Demand"
          metric={data.summary?.total_hours || 0}
          unit=" hours"
        />
        <ReportSummaryCard
          title="# Projects with Demand"
          metric={data.summary?.total_projects || 0}
          actionLink={{
            to: `/projects?from=demand-report&action=view-high-demand&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`,
            icon: ExternalLink,
            text: 'View Projects'
          }}
        />
        <ReportSummaryCard
          title="# Roles with Demand"
          metric={data.summary?.roles_with_demand || 0}
        />
        <ReportSummaryCard
          title="Peak Month"
          metric={data.peakMonth || 'N/A'}
        />
      </div>

      {hasNoDemand && (
        <ReportEmptyState
          icon={AlertTriangle}
          title="No Demand Data Found"
          description="No project demand information is available for the selected date range."
          actionLink={{
            to: '/projects',
            text: 'Create projects'
          }}
        />
      )}

      <div className="charts-grid">
        <div className="chart-container">
          <h3>Demand by Project</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.byProject || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="demand" fill={getChartColor('demand', 0)} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>Demand by Role</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.by_role || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="role_name" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total_hours" fill={getChartColor('demand', 1)} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>Demand Trend Over Time</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.trendOverTime || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="total_hours" 
                stroke={getChartColor('demand', 2)} 
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="action-lists" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <ReportTable
          title="High-Demand Projects"
          columns={projectDemandColumns}
          data={data.byProject || []}
          actions={projectDemandActions}
          maxRows={5}
          emptyMessage="No project demand data available"
        />

        <ReportTable
          title="High-Demand Roles"
          columns={roleDemandColumns}
          data={data.by_role || []}
          actions={roleDemandActions}
          maxRows={5}
          emptyMessage="No role demand data available"
        />
      </div>
    </div>
  );
};