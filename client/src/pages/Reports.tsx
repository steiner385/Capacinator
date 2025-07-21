import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  BarChart3, PieChart, TrendingUp, Users, Calendar, 
  Download, Filter, RefreshCw, AlertTriangle, ExternalLink, UserPlus, ClipboardList, ChevronDown,
  Briefcase, User, Plus
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../lib/api-client';

interface ReportFilters {
  startDate: string;
  endDate: string;
  projectTypeId?: string;
  locationId?: string;
  roleId?: string;
}

// Custom tooltip component for charts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="recharts-custom-tooltip" style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        padding: '0.75rem'
      }}>
        <p className="recharts-tooltip-label" style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color, margin: '0.25rem 0' }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Reports() {
  const [activeReport, setActiveReport] = useState<'capacity' | 'utilization' | 'demand' | 'gaps'>('demand');
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: '2023-08-01', // Set to match actual data range
    endDate: '2023-12-31'
  });
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Fetch report data
  const { data: capacityReport, isLoading: capacityLoading, refetch: refetchCapacity } = useQuery({
    queryKey: ['report-capacity', filters],
    queryFn: async () => {
      const [capacityResponse, peopleResponse] = await Promise.all([
        api.reporting.getCapacity(filters),
        api.people.list()
      ]);
      
      const data = capacityResponse.data;
      const peopleData = peopleResponse.data?.data || [];
      
      // Transform the API data to match chart requirements
      if (data) {
        // Calculate capacity by role from person utilization data
        const roleUtilization = new Map();
        
        data.personUtilization?.forEach((person: any) => {
          const roleName = person.primary_role_name || 'Unknown';
          const capacity = person.available_hours || 0;
          const utilized = person.total_allocated_hours || 0;
          
          if (!roleUtilization.has(roleName)) {
            roleUtilization.set(roleName, { capacity: 0, utilized: 0 });
          }
          
          const current = roleUtilization.get(roleName);
          roleUtilization.set(roleName, {
            capacity: current.capacity + capacity,
            utilized: current.utilized + utilized
          });
        });
        
        const byRole = Array.from(roleUtilization.entries()).map(([role, data]) => ({
          role,
          capacity: Math.round(data.capacity * 20), // Convert daily hours to monthly (20 working days)
          utilized: Math.round(data.utilized * 20)
        })).filter(item => item.capacity > 0);
        
        // Calculate totals
        const totalCapacity = byRole.reduce((sum: number, r: any) => sum + r.capacity, 0);
        const utilizedCapacity = byRole.reduce((sum: number, r: any) => sum + r.utilized, 0);
        
        // Calculate actual location-based capacity using people data
        const locationCapacity = new Map();
        
        peopleData.forEach((person: any) => {
          const locationName = person.location_name || 'Unknown';
          const personCapacity = Math.round((person.default_availability_percentage || 100) * (person.default_hours_per_day || 8) * 20 / 100); // Monthly hours
          
          if (!locationCapacity.has(locationName)) {
            locationCapacity.set(locationName, 0);
          }
          locationCapacity.set(locationName, locationCapacity.get(locationName) + personCapacity);
        });
        
        // Convert to array format for the chart
        const byLocation = Array.from(locationCapacity.entries()).map(([location, capacity]) => {
          const percentage = totalCapacity > 0 ? Math.round((capacity / totalCapacity) * 100) : 0;
          return { location, capacity, percentage };
        }).filter(item => item.capacity > 0);

        return {
          ...data,
          byRole,
          byLocation,
          totalCapacity,
          utilizedCapacity,
          availableCapacity: totalCapacity - utilizedCapacity,
          utilizationRate: totalCapacity > 0 ? Math.round((utilizedCapacity / totalCapacity) * 100) : 0
        };
      }
      return data;
    },
    enabled: activeReport === 'capacity'
  });

  const { data: utilizationReport, isLoading: utilizationLoading, refetch: refetchUtilization } = useQuery({
    queryKey: ['report-utilization', filters],
    queryFn: async () => {
      const response = await api.reporting.getUtilization(filters);
      const data = response.data;
      
      if (data && data.personUtilization) {
        // Transform person utilization data for charts
        const peopleUtilization = data.personUtilization.map((person: any) => ({
          id: person.person_id,
          name: person.person_name,
          role: person.primary_role_name,
          utilization: Math.round(person.total_allocation_percentage || 0)
        }));
        
        const averageUtilization = Math.round(
          peopleUtilization.reduce((sum: number, p: any) => sum + p.utilization, 0) / 
          (peopleUtilization.length || 1)
        );
        
        // Create utilization distribution chart instead of fake trend data
        const utilizationDistribution = [
          { range: '0-25%', count: peopleUtilization.filter((p: any) => p.utilization >= 0 && p.utilization < 25).length },
          { range: '25-50%', count: peopleUtilization.filter((p: any) => p.utilization >= 25 && p.utilization < 50).length },
          { range: '50-75%', count: peopleUtilization.filter((p: any) => p.utilization >= 50 && p.utilization < 75).length },
          { range: '75-100%', count: peopleUtilization.filter((p: any) => p.utilization >= 75 && p.utilization <= 100).length },
          { range: '>100%', count: peopleUtilization.filter((p: any) => p.utilization > 100).length }
        ];

        return {
          ...data,
          peopleUtilization,
          averageUtilization,
          utilizationDistribution,
          overAllocatedCount: peopleUtilization.filter((p: any) => p.utilization > 100).length,
          underUtilizedCount: peopleUtilization.filter((p: any) => p.utilization < 70).length,
          optimalCount: peopleUtilization.filter((p: any) => p.utilization >= 70 && p.utilization <= 100).length
        };
      }
      return data;
    },
    enabled: activeReport === 'utilization'
  });

  const { data: demandReport, isLoading: demandLoading, refetch: refetchDemand } = useQuery({
    queryKey: ['report-demand', filters],
    queryFn: async () => {
      const response = await api.reporting.getDemand({
        startDate: filters.startDate,
        endDate: filters.endDate,
        projectTypeId: filters.projectTypeId,
        location_id: filters.locationId
      });
      const data = response.data;
      
      if (data) {
        // Use actual project type data
        const byProjectType = data.by_project_type?.map((projectType: any) => ({
          type: projectType.project_type_name,
          demand: projectType.total_hours
        })) || [];
        
        // Create forecast from timeline data if available
        const forecast = data.timeline?.map((item: any) => ({
          month: item.month,
          demand: item.total_hours || 0,
          capacity: 0 // We don't have capacity in this view yet
        })).filter((item: any) => item.demand > 0) || [];
        
        // Calculate peak month from timeline data
        const peakMonth = data.timeline?.reduce((max: any, month: any) => {
          return (month.total_hours || 0) > (max?.total_hours || 0) ? month : max;
        }, null)?.month || null;
        
        return {
          ...data,
          totalDemand: data.summary?.total_hours || 0,
          projectCount: data.summary?.total_projects || 0,
          byProjectType,
          forecast,
          peakMonth
        };
      }
      return data;
    },
    enabled: activeReport === 'demand'
  });

  const { data: gapsReport, isLoading: gapsLoading, refetch: refetchGaps } = useQuery({
    queryKey: ['report-gaps', filters],
    queryFn: async () => {
      const response = await api.reporting.getGaps(filters);
      const data = response.data;
      
      if (data && data.gaps) {
        // Transform gaps data for the table
        const gapsByRole = data.gaps.map((gap: any) => ({
          roleId: gap.role_id,
          roleName: gap.role_name,
          demand: Math.round(gap.total_demand_fte * 160), // Convert FTE to hours
          capacity: Math.round(gap.total_capacity_fte * 160),
          gap: Math.round(gap.gap_fte * 160)
        }));
        
        // Don't generate recommendations - only use what comes from API
        
        return {
          ...data,
          totalGap: data.summary?.total_shortage_fte ? Math.round(data.summary.total_shortage_fte * 160) : 0,
          criticalRolesCount: data.summary?.critical_gaps || 0,
          gapPercentage: (() => {
            if (!data.gaps.length) return 0;
            const totalCapacity = data.gaps.reduce((sum: number, g: any) => sum + g.total_capacity_fte, 0);
            const totalShortage = data.summary?.total_shortage_fte || 0;
            // If no capacity exists, show percentage based on total demand
            if (totalCapacity === 0) {
              const totalDemand = data.gaps.reduce((sum: number, g: any) => sum + g.total_demand_fte, 0);
              return totalDemand > 0 ? 100 : 0; // 100% gap if there's demand but no capacity
            }
            return Math.round((totalShortage / totalCapacity) * 100);
          })(),
          gapsByRole
        };
      }
      return data;
    },
    enabled: activeReport === 'gaps'
  });

  // Fetch filter options
  const { data: projectTypes } = useQuery({
    queryKey: ['projectTypes'],
    queryFn: async () => {
      const response = await api.projectTypes.list();
      return response.data?.data || [];
    }
  });

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await api.locations.list();
      return response.data?.data || [];
    }
  });

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const response = await api.roles.list();
      return response.data || [];
    }
  });

  const handleRefresh = () => {
    switch (activeReport) {
      case 'capacity': refetchCapacity(); break;
      case 'utilization': refetchUtilization(); break;
      case 'demand': refetchDemand(); break;
      case 'gaps': refetchGaps(); break;
    }
  };

  const handleExport = async (format: 'excel' | 'csv' | 'pdf' = 'excel') => {
    try {
      let data: any = null;
      
      // Check if we have data for the active report
      switch (activeReport) {
        case 'capacity':
          data = capacityReport;
          break;
        case 'utilization':
          data = utilizationReport;
          break;
        case 'demand':
          data = demandReport;
          break;
        case 'gaps':
          data = gapsReport;
          break;
        default:
          throw new Error('No data available for export');
      }

      if (!data) {
        alert('No data available to export for the current tab.');
        return;
      }

      // Export using the new API
      let response;
      switch (format) {
        case 'excel':
          response = await api.export.reportAsExcel(activeReport, filters);
          break;
        case 'csv':
          response = await api.export.reportAsCSV(activeReport, filters);
          break;
        case 'pdf':
          response = await api.export.reportAsPDF(activeReport, filters);
          break;
        default:
          // Fallback to JSON export
          exportAsJSON(data, `${activeReport}-report.json`);
          return;
      }

      // Download the file
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers['content-disposition'];
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `${activeReport}-report.${format}`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Export error:', error);
      alert('Error exporting data. Please try again.');
    }
  };

  const exportAsCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(value => 
        typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      ).join(',')
    ).join('\n');
    
    const csvContent = `${headers}\n${rows}`;
    downloadFile(csvContent, filename, 'text/csv');
  };

  const exportAsJSON = (data: any, filename: string) => {
    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, filename, 'application/json');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Use theme colors for charts - light mode palette
  const CHART_COLORS = [
    '#4f46e5', // primary (indigo)
    '#10b981', // success (emerald)
    '#f59e0b', // warning (amber)
    '#ef4444', // danger (red)
    '#8b5cf6', // purple (violet)
  ];

  const renderCapacityReport = () => {
    if (capacityLoading || !capacityReport) return <div className="loading">Loading capacity report...</div>;

    return (
      <div className="report-content">
        <div className="report-summary">
          <div className="summary-card">
            <h3>Total Capacity</h3>
            <div className="metric">{capacityReport.totalCapacity || 0} hours</div>
          </div>
          <div className="summary-card">
            <h3># People with Capacity</h3>
            <div className="metric">{capacityReport.personUtilization?.length || 0}</div>
            <Link to={`/people?from=capacity-report&action=view-capacity&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`} className="card-action-link">
              <Users size={14} /> View People
            </Link>
          </div>
          <div className="summary-card">
            <h3># Roles with Capacity</h3>
            <div className="metric">{capacityReport.byRole?.length || 0}</div>
          </div>
          <div className="summary-card">
            <h3>Peak Month</h3>
            <div className="metric">N/A</div>
          </div>
        </div>

        <div className="charts-grid">
          <div className="chart-container">
            <h3>Capacity by Person</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={capacityReport.personUtilization?.slice(0, 10) || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="person_name" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="available_hours" fill={CHART_COLORS[0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3>Capacity by Role</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={capacityReport.byRole || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="role" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="capacity" fill={CHART_COLORS[0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3>Capacity Trend Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={capacityReport.timeline || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="capacity" stroke={CHART_COLORS[0]} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="full-width-tables">
          <div className="table-container">
            <h3>People Capacity Overview</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Daily Hours</th>
                  <th>Availability</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(capacityReport.personUtilization || []).map((person: any) => (
                  <tr key={person.person_id} className={
                    person.allocation_status === 'AVAILABLE' ? 'row-success' :
                    person.allocation_status === 'FULLY_ALLOCATED' ? 'row-warning' :
                    person.allocation_status === 'OVER_ALLOCATED' ? 'row-danger' : ''
                  }>
                    <td><strong>{person.person_name}</strong></td>
                    <td>{person.available_hours} hrs/day</td>
                    <td>{person.default_availability_percentage || 100}%</td>
                    <td>
                      <span className={`badge ${
                        person.allocation_status === 'AVAILABLE' ? 'badge-success' :
                        person.allocation_status === 'FULLY_ALLOCATED' ? 'badge-warning' :
                        person.allocation_status === 'OVER_ALLOCATED' ? 'badge-danger' : 'badge-secondary'
                      }`}>
                        {person.allocation_status === 'AVAILABLE' ? 'Available' :
                         person.allocation_status === 'FULLY_ALLOCATED' ? 'Fully Allocated' :
                         person.allocation_status === 'OVER_ALLOCATED' ? 'Over Allocated' : 'Unknown'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <Link to={`/people/${person.person_id}?from=capacity-report&status=${person.allocation_status}&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`} className="btn btn-sm btn-outline">
                          <User size={14} /> Profile
                        </Link>
                        {person.allocation_status === 'AVAILABLE' && (
                          <Link to={`/assignments?person=${encodeURIComponent(person.person_name)}&action=assign&from=capacity-report&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`} className="btn btn-sm btn-primary">
                            <Plus size={14} /> Assign
                          </Link>
                        )}
                        {person.allocation_status === 'FULLY_ALLOCATED' && (
                          <Link to={`/assignments?person=${encodeURIComponent(person.person_name)}&action=view&from=capacity-report&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`} className="btn btn-sm btn-warning">
                            <ClipboardList size={14} /> View Load
                          </Link>
                        )}
                        {person.allocation_status === 'OVER_ALLOCATED' && (
                          <Link to={`/assignments?person=${encodeURIComponent(person.person_name)}&action=reduce&from=capacity-report&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`} className="btn btn-sm btn-danger">
                            <ClipboardList size={14} /> Reduce Load
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-container">
            <h3>Role Capacity Analysis</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Total Capacity (hrs)</th>
                  <th>Utilized (hrs)</th>
                  <th>Available (hrs)</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(capacityReport.byRole || []).map((role: any) => {
                  const utilized = role.utilized || 0;
                  const available = role.capacity - utilized;
                  const utilizationRate = role.capacity > 0 ? (utilized / role.capacity) * 100 : 0;
                  
                  return (
                    <tr key={role.id || role.role} className={
                      available > 100 ? 'row-success' :
                      available > 50 ? 'row-info' :
                      available > 0 ? 'row-warning' : 'row-danger'
                    }>
                      <td><strong>{role.role}</strong></td>
                      <td>{role.capacity}</td>
                      <td>{utilized}</td>
                      <td>{available}</td>
                      <td>
                        <span className={`badge ${
                          available > 100 ? 'badge-success' :
                          available > 50 ? 'badge-info' :
                          available > 0 ? 'badge-warning' : 'badge-danger'
                        }`}>
                          {available > 100 ? 'High Capacity' :
                           available > 50 ? 'Moderate Capacity' :
                           available > 0 ? 'Limited Capacity' : 'At Capacity'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <Link to={`/people?role=${encodeURIComponent(role.role)}&from=capacity-report&capacity=${role.capacity}&available=${available}&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`} className="btn btn-sm btn-outline">
                            <Users size={14} /> View People
                          </Link>
                          {available > 50 && (
                            <Link to={`/assignments?role=${encodeURIComponent(role.role)}&action=assign&from=capacity-report&available=${available}&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`} className="btn btn-sm btn-primary">
                              <Briefcase size={14} /> Assign Work
                            </Link>
                          )}
                          {available <= 50 && (
                            <Link to={`/people?role=${encodeURIComponent(role.role)}&action=hire&from=capacity-report&shortage=${Math.abs(available)}&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`} className="btn btn-sm btn-warning">
                              <UserPlus size={14} /> Hire More
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderUtilizationReport = () => {
    if (utilizationLoading || !utilizationReport) return <div className="loading">Loading utilization report...</div>;

    return (
      <div className="report-content">
        <div className="report-summary">
          <div className="summary-card">
            <h3>Utilization %</h3>
            <div className="metric">{utilizationReport.averageUtilization || 0}%</div>
          </div>
          <div className="summary-card">
            <h3># People Overutilized</h3>
            <div className="metric text-danger">{utilizationReport.overAllocatedCount || 0}</div>
            {utilizationReport.overAllocatedCount > 0 && (
              <Link to={`/assignments?action=manage-overutilized&from=utilization-report&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`} className="card-action-link">
                <ClipboardList size={14} /> Manage Assignments
              </Link>
            )}
          </div>
          <div className="summary-card">
            <h3># People Underutilized</h3>
            <div className="metric text-warning">{utilizationReport.underUtilizedCount || 0}</div>
            {utilizationReport.underUtilizedCount > 0 && (
              <Link to={`/assignments?action=find-projects&from=utilization-report&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`} className="card-action-link">
                <ClipboardList size={14} /> Find Projects
              </Link>
            )}
          </div>
          <div className="summary-card">
            <h3># People Optimally Utilized</h3>
            <div className="metric text-success">{utilizationReport.optimalCount || 0}</div>
          </div>
        </div>

        <div className="charts-grid">
          <div className="chart-container">
            <h3>Utilization by Person</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={utilizationReport.peopleUtilization || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="utilization" fill={CHART_COLORS[1]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3>Utilization by Role</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={utilizationReport.byRole || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avgUtilization" fill={CHART_COLORS[2]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3>Utilization Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={utilizationReport.timeline || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="utilization" stroke={CHART_COLORS[1]} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3>Actionable People</h3>
            <div className="actionable-list">
              <div className="list-section">
                <h4>Overutilized People</h4>
                {(utilizationReport.peopleUtilization || [])
                  .filter((person: any) => person.utilization > 100)
                  .map((person: any) => (
                  <div key={person.id} className="actionable-item danger">
                    <div className="item-info">
                      <strong>{person.name}</strong>
                      <span className="item-detail">{person.utilization}% utilized</span>
                    </div>
                    <div className="item-actions">
                      <Link to={`/people/${person.id}?from=utilization-report&utilization=${person.utilization}&action=reduce-load&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`} className="btn btn-sm btn-outline">
                        <User size={14} /> View Profile
                      </Link>
                      <Link to={`/assignments?person=${encodeURIComponent(person.name)}&action=reduce&from=utilization-report&utilization=${person.utilization}&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`} className="btn btn-sm btn-danger">
                        <ClipboardList size={14} /> Reduce Load
                      </Link>
                    </div>
                  </div>
                ))}
                {(utilizationReport.peopleUtilization || []).filter((person: any) => person.utilization > 100).length === 0 && (
                  <p className="no-items">No overutilized people</p>
                )}
              </div>
              
              <div className="list-section">
                <h4>Underutilized People</h4>
                {(utilizationReport.peopleUtilization || [])
                  .filter((person: any) => person.utilization < 70)
                  .map((person: any) => (
                  <div key={person.id} className="actionable-item warning">
                    <div className="item-info">
                      <strong>{person.name}</strong>
                      <span className="item-detail">{person.utilization}% utilized</span>
                    </div>
                    <div className="item-actions">
                      <Link to={`/people/${person.id}?from=utilization-report&utilization=${person.utilization}&action=add-work&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`} className="btn btn-sm btn-outline">
                        <User size={14} /> View Profile
                      </Link>
                      <Link to={`/assignments?person=${encodeURIComponent(person.name)}&action=assign&from=utilization-report&utilization=${person.utilization}&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`} className="btn btn-sm btn-primary">
                        <Plus size={14} /> Add Projects
                      </Link>
                    </div>
                  </div>
                ))}
                {(utilizationReport.peopleUtilization || []).filter((person: any) => person.utilization < 70).length === 0 && (
                  <p className="no-items">No underutilized people</p>
                )}
              </div>
            </div>
          </div>

          <div className="chart-container">
            <h3>Actionable Roles</h3>
            <div className="actionable-list">
              <div className="list-section">
                <h4>Overcommitted Roles</h4>
                {(utilizationReport.byRole || [])
                  .filter((role: any) => role.avgUtilization > 100)
                  .map((role: any) => (
                  <div key={role.id || role.name} className="actionable-item danger">
                    <div className="item-info">
                      <strong>{role.name}</strong>
                      <span className="item-detail">{role.avgUtilization}% average utilization</span>
                    </div>
                    <div className="item-actions">
                      <Link to={`/people?role=${encodeURIComponent(role.name)}`} className="btn btn-sm btn-outline">
                        <Users size={14} /> View People
                      </Link>
                      <Link to="/people" className="btn btn-sm btn-danger">
                        <UserPlus size={14} /> Hire More
                      </Link>
                    </div>
                  </div>
                ))}
                {(utilizationReport.byRole || []).filter((role: any) => role.avgUtilization > 100).length === 0 && (
                  <p className="no-items">No overcommitted roles</p>
                )}
              </div>

              <div className="list-section">
                <h4>Underutilized Roles</h4>
                {(utilizationReport.byRole || [])
                  .filter((role: any) => role.avgUtilization < 70)
                  .map((role: any) => (
                  <div key={role.id || role.name} className="actionable-item warning">
                    <div className="item-info">
                      <strong>{role.name}</strong>
                      <span className="item-detail">{role.avgUtilization}% average utilization</span>
                    </div>
                    <div className="item-actions">
                      <Link to={`/people?role=${encodeURIComponent(role.name)}`} className="btn btn-sm btn-outline">
                        <Users size={14} /> View People
                      </Link>
                      <Link to="/projects" className="btn btn-sm btn-primary">
                        <Briefcase size={14} /> Find Projects
                      </Link>
                    </div>
                  </div>
                ))}
                {(utilizationReport.byRole || []).filter((role: any) => role.avgUtilization < 70).length === 0 && (
                  <p className="no-items">No underutilized roles</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDemandReport = () => {
    if (demandLoading || !demandReport) return <div className="loading">Loading demand report...</div>;

    return (
      <div className="report-content">
        <div className="report-summary">
          <div className="summary-card">
            <h3>Total Demand</h3>
            <div className="metric">{demandReport.summary?.total_hours || 0} hours</div>
          </div>
          <div className="summary-card">
            <h3># Projects with Demand</h3>
            <div className="metric">{demandReport.summary?.total_projects || 0}</div>
            <Link to={`/projects?from=demand-report&action=view-high-demand&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`} className="card-action-link">
              <ExternalLink size={14} /> View Projects
            </Link>
          </div>
          <div className="summary-card">
            <h3># Roles with Demand</h3>
            <div className="metric">{demandReport.by_role?.length || 0}</div>
          </div>
          <div className="summary-card">
            <h3>Peak Month</h3>
            <div className="metric">{demandReport.peakMonth || 'N/A'}</div>
          </div>
        </div>

        <div className="charts-grid">
          <div className="chart-container">
            <h3>Demand by Project</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={demandReport.byProject || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="demand" fill={CHART_COLORS[0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3>Demand by Role</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={demandReport.by_role || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="role_name" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total_hours" fill={CHART_COLORS[1]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3>Demand Trend Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={demandReport.timeline || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="total_hours" stroke={CHART_COLORS[3]} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="action-lists">
          <div className="list-container">
            <h3>High-Demand Projects</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Demand</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(demandReport.byProject || []).slice(0, 5).map((project: any, index: number) => (
                  <tr key={project.id || project.name || index}>
                    <td>{project.name}</td>
                    <td>{project.demand} hrs</td>
                    <td>
                      <Link to={`/projects/${project.id}?from=demand-report&demand=${project.demand}&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`} className="btn btn-sm btn-outline">
                        <ExternalLink size={14} /> View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="list-container">
            <h3>High-Demand Roles</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Role</th>
                  <th>Demand</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(demandReport.by_role || []).slice(0, 5).map((role: any, index: number) => (
                  <tr key={role.role_id || role.role_name || index}>
                    <td>{role.role_name}</td>
                    <td>{role.total_hours} hrs</td>
                    <td>
                      <Link to={`/people?role=${encodeURIComponent(role.role_name)}&from=demand-report&demand=${role.total_hours}&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`} className="btn btn-sm btn-outline">
                        <Users size={14} /> Find People
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderGapsReport = () => {
    if (gapsLoading || !gapsReport) return <div className="loading">Loading gaps report...</div>;

    return (
      <div className="report-content">
        <div className="report-summary">
          <div className="summary-card">
            <h3>Total Gap in Hours</h3>
            <div className="metric text-danger">{gapsReport.totalGap || 0} hours</div>
            {gapsReport.totalGap > 0 && (
              <Link to={`/people?action=hire&from=gaps-report&gap=${gapsReport.totalGap}&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`} className="card-action-link">
                <UserPlus size={14} /> Add People
              </Link>
            )}
          </div>
          <div className="summary-card">
            <h3># Projects with Gaps</h3>
            <div className="metric">{gapsReport.summary?.total_gaps || 0}</div>
            <Link to={`/projects?from=demand-report&action=view-high-demand&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`} className="card-action-link">
              <ExternalLink size={14} /> View Projects
            </Link>
          </div>
          <div className="summary-card">
            <h3># Roles with Gaps</h3>
            <div className="metric">{gapsReport.criticalRolesCount || 0}</div>
            {gapsReport.criticalRolesCount > 0 && (
              <Link to={`/roles?from=gaps-report&action=address-gaps&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`} className="card-action-link">
                <Users size={14} /> View Roles
              </Link>
            )}
          </div>
          <div className="summary-card">
            <h3># Unutilized Hours</h3>
            <div className="metric">N/A</div>
          </div>
        </div>

        <div className="charts-grid">
          <div className="chart-container">
            <h3>Gaps by Project</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gapsReport.gapsByProject || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="projectName" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="gap" fill={CHART_COLORS[3]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3>Gaps by Role</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gapsReport.gapsByRole || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="roleName" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="gap" fill={CHART_COLORS[0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3>Gap Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={gapsReport.timeline || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="gap" stroke={CHART_COLORS[3]} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3>Actionable Projects</h3>
            <div className="actionable-list">
              <div className="list-section">
                <h4>Projects with Critical Gaps</h4>
                {(gapsReport.gapsByProject || [])
                  .filter((project: any) => project.gap > 0)
                  .map((project: any) => (
                  <div key={project.id} className="actionable-item danger">
                    <div className="item-info">
                      <strong>{project.projectName}</strong>
                      <span className="item-detail">{project.gap} hours short</span>
                    </div>
                    <div className="item-actions">
                      <Link to={`/projects/${project.id}?from=gaps-report&gap=${project.gap}&action=address-gap&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`} className="btn btn-sm btn-outline">
                        <Briefcase size={14} /> View Project
                      </Link>
                      <Link to={`/assignments?project=${encodeURIComponent(project.projectName)}&action=add-resources&from=gaps-report&gap=${project.gap}&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`} className="btn btn-sm btn-danger">
                        <ClipboardList size={14} /> Add Resources
                      </Link>
                    </div>
                  </div>
                ))}
                {(gapsReport.gapsByProject || []).filter((project: any) => project.gap > 0).length === 0 && (
                  <p className="no-items">No projects with critical gaps</p>
                )}
              </div>

              <div className="list-section">
                <h4>Well-Staffed Projects</h4>
                {(gapsReport.gapsByProject || [])
                  .filter((project: any) => project.gap <= 0)
                  .slice(0, 5)
                  .map((project: any) => (
                  <div key={project.id} className="actionable-item success">
                    <div className="item-info">
                      <strong>{project.projectName}</strong>
                      <span className="item-detail">Adequately staffed</span>
                    </div>
                    <div className="item-actions">
                      <Link to={`/projects/${project.id}?from=gaps-report&status=well-staffed&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`} className="btn btn-sm btn-outline">
                        <Briefcase size={14} /> View Project
                      </Link>
                    </div>
                  </div>
                ))}
                {(gapsReport.gapsByProject || []).filter((project: any) => project.gap <= 0).length === 0 && (
                  <p className="no-items">No well-staffed projects</p>
                )}
              </div>
            </div>
          </div>

          <div className="chart-container">
            <h3>Actionable Roles</h3>
            <div className="actionable-list">
              <div className="list-section">
                <h4>Roles with Critical Shortages</h4>
                {(gapsReport.gapsByRole || [])
                  .filter((role: any) => role.gap > 0)
                  .map((role: any) => (
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
                {(gapsReport.gapsByRole || []).filter((role: any) => role.gap > 0).length === 0 && (
                  <p className="no-items">No roles with critical shortages</p>
                )}
              </div>

              <div className="list-section">
                <h4>Roles with Adequate Capacity</h4>
                {(gapsReport.gapsByRole || [])
                  .filter((role: any) => role.gap <= 0)
                  .slice(0, 5)
                  .map((role: any) => (
                  <div key={role.roleId} className="actionable-item success">
                    <div className="item-info">
                      <strong>{role.roleName}</strong>
                      <span className="item-detail">Sufficient capacity</span>
                    </div>
                    <div className="item-actions">
                      <Link to={`/people?role=${encodeURIComponent(role.roleName)}&from=gaps-report&status=adequate-capacity&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`} className="btn btn-sm btn-outline">
                        <Users size={14} /> View People
                      </Link>
                      <Link to={`/assignments?role=${encodeURIComponent(role.roleName)}&action=assign&from=gaps-report&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`} className="btn btn-sm btn-primary">
                        <Plus size={14} /> Assign More Work
                      </Link>
                    </div>
                  </div>
                ))}
                {(gapsReport.gapsByRole || []).filter((role: any) => role.gap <= 0).length === 0 && (
                  <p className="no-items">No roles with adequate capacity</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const isLoading = capacityLoading || utilizationLoading || demandLoading || gapsLoading;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Reports & Analytics</h1>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleRefresh}>
            <RefreshCw size={20} />
            Refresh
          </button>
          <div className="dropdown" style={{ position: 'relative' }}>
            <button 
              className="btn btn-primary" 
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Download size={20} />
              Export
              <ChevronDown size={16} />
            </button>
            {showExportDropdown && (
              <div className="dropdown-menu" style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                backgroundColor: 'white',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                zIndex: 1000,
                minWidth: '120px'
              }}>
                <button 
                  className="dropdown-item" 
                  onClick={() => { handleExport('excel'); setShowExportDropdown(false); }}
                  style={{ 
                    width: '100%', 
                    padding: '8px 16px', 
                    border: 'none', 
                    background: 'none', 
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  Excel (.xlsx)
                </button>
                <button 
                  className="dropdown-item" 
                  onClick={() => { handleExport('csv'); setShowExportDropdown(false); }}
                  style={{ 
                    width: '100%', 
                    padding: '8px 16px', 
                    border: 'none', 
                    background: 'none', 
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  CSV (.csv)
                </button>
                <button 
                  className="dropdown-item" 
                  onClick={() => { handleExport('pdf'); setShowExportDropdown(false); }}
                  style={{ 
                    width: '100%', 
                    padding: '8px 16px', 
                    border: 'none', 
                    background: 'none', 
                    textAlign: 'left',
                    cursor: 'pointer'
                  }}
                >
                  PDF (.pdf)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="report-tabs">
        <button 
          className={`tab ${activeReport === 'demand' ? 'active' : ''}`}
          onClick={() => setActiveReport('demand')}
        >
          <PieChart size={20} />
          Demand Report
        </button>
        <button 
          className={`tab ${activeReport === 'capacity' ? 'active' : ''}`}
          onClick={() => setActiveReport('capacity')}
        >
          <BarChart3 size={20} />
          Capacity Report
        </button>
        <button 
          className={`tab ${activeReport === 'utilization' ? 'active' : ''}`}
          onClick={() => setActiveReport('utilization')}
        >
          <TrendingUp size={20} />
          Utilization Report
        </button>
        <button 
          className={`tab ${activeReport === 'gaps' ? 'active' : ''}`}
          onClick={() => setActiveReport('gaps')}
        >
          <AlertTriangle size={20} />
          Gaps Analysis
        </button>
      </div>

      <div className="filter-section">
        <div className="filter-group">
          <label>Start Date</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({...filters, startDate: e.target.value})}
            className="form-input"
          />
        </div>
        <div className="filter-group">
          <label>End Date</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({...filters, endDate: e.target.value})}
            className="form-input"
          />
        </div>
        <div className="filter-group">
          <label>Project Type</label>
          <select
            value={filters.projectTypeId || ''}
            onChange={(e) => setFilters({...filters, projectTypeId: e.target.value || undefined})}
            className="form-select"
          >
            <option value="">All Types</option>
            {projectTypes?.map((type: any) => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Location</label>
          <select
            value={filters.locationId || ''}
            onChange={(e) => setFilters({...filters, locationId: e.target.value || undefined})}
            className="form-select"
          >
            <option value="">All Locations</option>
            {locations?.map((location: any) => (
              <option key={location.id} value={location.id}>{location.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="report-container">
        {activeReport === 'capacity' && renderCapacityReport()}
        {activeReport === 'utilization' && renderUtilizationReport()}
        {activeReport === 'demand' && renderDemandReport()}
        {activeReport === 'gaps' && renderGapsReport()}
      </div>
    </div>
  );
}