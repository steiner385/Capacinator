import React from 'react';
import { AlertTriangle, ClipboardList } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ReportSummaryCard, ReportEmptyState, ReportTable, ReportProgressBar } from './index';
import { getChartColor, CHART_AXIS_CONFIG } from './chartConfig';
import type { Column, ActionButton } from './ReportTable';

interface PersonUtilizationData {
  id: string;
  name: string;
  role: string;
  utilization: number;
  availableHours: number;
  projectCount: number;
  projects: string;
}

interface RoleUtilizationData {
  role: string;
  avgUtilization: number;
}

interface UtilizationReportData {
  summary?: { averageUtilization: number };
  peopleUtilization: PersonUtilizationData[];
  roleUtilization: RoleUtilizationData[];
  averageUtilization: number;
  overAllocatedCount: number;
  underUtilizedCount: number;
  optimalCount: number;
}

interface ReportFilters {
  startDate?: string;
  endDate?: string;
  projectTypeId?: string;
  locationId?: string;
  roleId?: string;
}

interface UtilizationReportProps {
  data: UtilizationReportData | null;
  filters: ReportFilters;
  onPersonAction: (person: PersonUtilizationData, action: 'reduce' | 'add') => void;
  CustomTooltip: React.FC<{ active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }>;
}

export const UtilizationReport: React.FC<UtilizationReportProps> = ({ 
  data, 
  filters, 
  onPersonAction,
  CustomTooltip 
}) => {
  if (!data) return <div className="loading">Loading utilization report...</div>;
  
  // Debug info
  console.log('UtilizationReport data:', data);
  console.log('Date filters:', filters);
  console.log('peopleUtilization:', data.peopleUtilization);
  console.log('roleUtilization:', data.roleUtilization);

  // Define columns for team utilization table
  const utilizationColumns: Column[] = [
    { header: 'Name', accessor: 'name' },
    { header: 'Role', accessor: (row) => row.role || 'No Role' },
    {
      header: 'Utilization (%)',
      accessor: 'utilization',
      render: (value, _row) => (
        <ReportProgressBar
          value={value}
          variant={value > 100 ? 'danger' : value >= 80 ? 'success' : 'warning'}
        />
      )
    },
    { 
      header: 'Available Capacity (%)', 
      accessor: (row) => Math.max(0, 100 - row.utilization),
      render: (value) => `${value.toFixed(1)}%`
    },
    { 
      header: 'Available Hours (Daily)', 
      accessor: (row) => {
        const availablePercent = Math.max(0, 100 - row.utilization) / 100;
        return (row.availableHours * availablePercent).toFixed(1);
      },
      render: (value) => `${value} hrs`
    }
  ];

  const utilizationActions = (row: PersonUtilizationData): ActionButton[] => {
    const actions: ActionButton[] = [];

    if (row.utilization > 100) {
      actions.push({
        onClick: () => onPersonAction(row, 'reduce'),
        icon: ClipboardList,
        text: 'Reduce Load',
        variant: 'danger'
      });
    } else if (row.utilization < 80) {
      actions.push({
        onClick: () => onPersonAction(row, 'add'),
        icon: ClipboardList,
        text: 'Add Projects',
        variant: 'primary'
      });
    }

    return actions;
  };

  // Prepare utilization distribution data
  const utilizationDistribution = [
    {
      range: '0-50%',
      count: data.peopleUtilization?.filter((p: PersonUtilizationData) => p.utilization <= 50).length || 0
    },
    {
      range: '51-79%',
      count: data.peopleUtilization?.filter((p: PersonUtilizationData) => p.utilization > 50 && p.utilization <= 79).length || 0
    },
    {
      range: '80-100%',
      count: data.peopleUtilization?.filter((p: PersonUtilizationData) => p.utilization >= 80 && p.utilization <= 100).length || 0
    },
    {
      range: '> 100%',
      count: data.peopleUtilization?.filter((p: PersonUtilizationData) => p.utilization > 100).length || 0
    }
  ];

  // Prepare role utilization data
  const roleUtilization = data.roleUtilization?.map((role: RoleUtilizationData) => ({
    ...role,
    avgUtilization: Math.round(role.avgUtilization || 0)
  })) || [];

  return (
    <div className="report-content">
      <div className="report-summary">
        <ReportSummaryCard
          title="Utilization %"
          metric={data.averageUtilization || 0}
          unit="%"
        />
        <ReportSummaryCard
          title="# People Overutilized"
          metric={data.overAllocatedCount || 0}
          metricType="danger"
          actionLink={data.overAllocatedCount > 0 ? {
            to: `/assignments?action=manage-overutilized&from=utilization-report&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`,
            icon: ClipboardList,
            text: 'Manage Assignments'
          } : undefined}
        />
        <ReportSummaryCard
          title="# People Underutilized"
          metric={data.underUtilizedCount || 0}
          metricType="warning"
          actionLink={data.underUtilizedCount > 0 ? {
            to: `/assignments?action=find-projects&from=utilization-report&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`,
            icon: ClipboardList,
            text: 'Find Projects'
          } : undefined}
        />
        <ReportSummaryCard
          title="# People Optimally Utilized"
          metric={data.optimalCount || 0}
          metricType="success"
        />
      </div>

      {(data.averageUtilization || 0) === 0 && (
        <ReportEmptyState
          icon={AlertTriangle}
          title="No Project Assignments Found"
          description="Utilization is 0% because no people have been assigned to projects yet."
          actionLink={{
            to: '/assignments',
            text: 'Create assignments'
          }}
        />
      )}

      <div className="charts-grid">
        <div className="chart-container">
          <h3>Utilization by Person</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.peopleUtilization?.slice(0, 10) || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis 
                dataKey="name"
                {...CHART_AXIS_CONFIG.angled}
              />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="utilization" fill={getChartColor('utilization', 0)} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>Utilization by Role</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={roleUtilization}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis 
                dataKey="role"
                {...CHART_AXIS_CONFIG.angled}
              />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="avgUtilization" fill={getChartColor('utilization', 1)} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>Utilization Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={utilizationDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill={getChartColor('utilization', 2)} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <ReportTable
        title="Team Utilization Details"
        columns={utilizationColumns}
        data={data.peopleUtilization || []}
        rowClassName={(row) => 
          row.utilization > 100 ? 'report-table-row-danger' :
          row.utilization >= 80 ? 'report-table-row-success' :
          'report-table-row-warning'
        }
        actions={utilizationActions}
      />
    </div>
  );
};