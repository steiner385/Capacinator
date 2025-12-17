import React from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, ExternalLink, Users, Briefcase, ClipboardList, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ReportSummaryCard, ReportEmptyState, ReportStatusBadge } from './index';
import { getChartColor, CHART_AXIS_CONFIG } from './chartConfig';

interface ProjectHealth {
  project_id: string;
  project_name: string;
  allocation_health: 'UNDER_ALLOCATED' | 'FULLY_ALLOCATED' | 'OVER_ALLOCATED';
  total_allocation_percentage: number;
}

interface RoleGap {
  role_id: string;
  roleName: string;
  gap: number;
}

interface GapTrendData {
  period: string;
  gap: number;
}

interface GapsReportData {
  summary?: { projectsWithGaps?: number; unutilizedHours?: number };
  projectHealth?: ProjectHealth[];
  gapsByRole?: RoleGap[];
  gapTrend?: GapTrendData[];
  totalGap: number;
  criticalRolesCount: number;
}

interface ReportFilters {
  startDate?: string;
  endDate?: string;
  projectTypeId?: string;
  locationId?: string;
  roleId?: string;
}

interface GapsReportProps {
  data: GapsReportData | null;
  filters: ReportFilters;
  CustomTooltip: React.FC<{ active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }>;
}

export const GapsReport: React.FC<GapsReportProps> = ({ 
  data, 
  filters,
  CustomTooltip 
}) => {
  if (!data) return <div className="loading">Loading gaps report...</div>;

  const hasNoGaps = data.totalGap === 0;

  return (
    <div className="report-content">
      <div className="report-summary">
        <ReportSummaryCard
          title="Total Gap in Hours"
          metric={data.totalGap || 0}
          unit=" hours"
          metricType="danger"
          actionLink={data.totalGap > 0 ? {
            to: `/people?action=hire&from=gaps-report&gap=${data.totalGap}&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`,
            icon: UserPlus,
            text: 'Add People'
          } : undefined}
        />
        <ReportSummaryCard
          title="# Projects with Gaps"
          metric={data.summary?.projectsWithGaps || 0}
          actionLink={{
            to: `/projects?from=demand-report&action=view-high-demand&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`,
            icon: ExternalLink,
            text: 'View Projects'
          }}
        />
        <ReportSummaryCard
          title="# Roles with Gaps"
          metric={data.criticalRolesCount || 0}
          actionLink={data.criticalRolesCount > 0 ? {
            to: `/roles?from=gaps-report&action=address-gaps&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`,
            icon: Users,
            text: 'View Roles'
          } : undefined}
        />
        <ReportSummaryCard
          title="# Unutilized Hours"
          metric={data.summary?.unutilizedHours || 0}
          unit=" hours"
        />
      </div>

      {hasNoGaps && (
        <ReportEmptyState
          icon={AlertTriangle}
          title="No Capacity Gaps Found"
          description="Great! Your capacity matches demand perfectly for the selected date range."
        />
      )}

      <div className="charts-grid">
        <div className="chart-container">
          <h3>Gaps by Project</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.projectHealth || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis 
                dataKey="project_name" 
                {...CHART_AXIS_CONFIG.angled}
              />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total_allocation_percentage" fill={getChartColor('gaps', 0)} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>Gaps by Role</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.gapsByRole || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis 
                dataKey="roleName" 
                {...CHART_AXIS_CONFIG.angled}
              />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="gap" fill={getChartColor('gaps', 1)} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container">
          <h3>Gap Trend (Projected)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.gapTrend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="gap" stroke={getChartColor('gaps', 2)} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Full-width actionable sections */}
      <div className="actionable-sections">
        <div className="actionable-table-container">
          <h3>Actionable Projects</h3>
          <div className="actionable-table">
            <div className="table-section">
              <h4>Projects with Critical Gaps</h4>
              <div className="actionable-items-grid">
                {(data.projectHealth || [])
                  .filter((project: ProjectHealth) => project.allocation_health === 'UNDER_ALLOCATED')
                  .map((project: ProjectHealth) => (
                  <div key={project.project_id} className="actionable-item danger">
                    <div className="item-info">
                      <strong>{project.project_name}</strong>
                      <span className="item-detail">{Math.round(project.total_allocation_percentage)}% allocated</span>
                    </div>
                    <div className="item-actions">
                      <Link to={`/projects/${project.project_id}?from=gaps-report&gap=${100-project.total_allocation_percentage}&action=address-gap&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`} className="btn btn-sm btn-outline">
                        <Briefcase size={14} /> View Project
                      </Link>
                      <Link to={`/assignments?project=${encodeURIComponent(project.project_name)}&action=add-resources&from=gaps-report&gap=${100-project.total_allocation_percentage}&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`} className="btn btn-sm btn-danger">
                        <ClipboardList size={14} /> Add Resources
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="table-section">
              <h4>Projects with Adequate Coverage</h4>
              <div className="actionable-items-grid">
                {(data.projectHealth || [])
                  .filter((project: ProjectHealth) => project.allocation_health === 'FULLY_ALLOCATED' || project.allocation_health === 'OVER_ALLOCATED')
                  .slice(0, 3)
                  .map((project: ProjectHealth) => (
                  <div key={project.project_id} className="actionable-item success">
                    <div className="item-info">
                      <strong>{project.project_name}</strong>
                      <span className="item-detail">
                        {Math.round(project.total_allocation_percentage)}% allocated - 
                        <ReportStatusBadge 
                          status={project.allocation_health.replace(/_/g, ' ')} 
                          variant={project.allocation_health === 'OVER_ALLOCATED' ? 'warning' : 'success'}
                          className="ml-2"
                        />
                      </span>
                    </div>
                    <div className="item-actions">
                      <Link to={`/projects/${project.project_id}?from=gaps-report`} className="btn btn-sm btn-outline">
                        <Briefcase size={14} /> View Project
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="actionable-table-container">
          <h3>Actionable Roles</h3>
          <div className="actionable-table">
            <div className="table-section">
              <h4>Roles with Critical Shortages</h4>
              <div className="actionable-items-grid">
                {(data.gapsByRole || [])
                  .filter((role: RoleGap) => role.gap > 0)
                  .map((role: RoleGap) => (
                  <div key={role.roleId} className="actionable-item danger">
                    <div className="item-info">
                      <strong>{role.roleName}</strong>
                      <span className="item-detail">{role.gap} hours short</span>
                    </div>
                    <div className="item-actions">
                      <Link to={`/people?role=${encodeURIComponent(role.roleName)}&from=gaps-report&gap=${role.gap}&action=address-shortage&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`} className="btn btn-sm btn-outline">
                        <Users size={14} /> View People
                      </Link>
                      <Link to={`/people?role=${encodeURIComponent(role.roleName)}&action=hire&from=gaps-report&gap=${role.gap}&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`} className="btn btn-sm btn-danger">
                        <UserPlus size={14} /> Hire More
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="table-section">
              <h4>Roles with Adequate Capacity</h4>
              <div className="actionable-items-grid">
                {(data.gapsByRole || [])
                  .filter((role: RoleGap) => role.gap <= 0)
                  .slice(0, 3)
                  .map((role: RoleGap) => (
                  <div key={role.roleId} className="actionable-item success">
                    <div className="item-info">
                      <strong>{role.roleName}</strong>
                      <span className="item-detail">
                        {Math.abs(role.gap)} hours excess capacity
                      </span>
                    </div>
                    <div className="item-actions">
                      <Link to={`/people?role=${encodeURIComponent(role.roleName)}&from=gaps-report`} className="btn btn-sm btn-outline">
                        <Users size={14} /> View People
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};