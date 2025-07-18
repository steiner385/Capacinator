import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  BarChart3, PieChart, TrendingUp, Users, Calendar, 
  Download, Filter, RefreshCw, AlertTriangle, ExternalLink, UserPlus, ClipboardList, ChevronDown
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
  const [activeReport, setActiveReport] = useState<'capacity' | 'utilization' | 'demand' | 'gaps'>('capacity');
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: '2024-09-01', // Set to match actual data range
    endDate: '2024-12-31'
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
        // Calculate capacity by role from capacity gaps
        const byRole = data.capacityGaps?.reduce((acc: any[], gap: any) => {
          if (gap.total_capacity_fte && gap.total_capacity_fte > 0) {
            acc.push({
              role: gap.role_name,
              capacity: Math.round(gap.total_capacity_fte * 160), // Convert FTE to hours (160 hours/month)
              utilized: Math.round((gap.total_capacity_fte - Math.abs(gap.gap_fte || 0)) * 160)
            });
          }
          return acc;
        }, []) || [];
        
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
      const response = await api.reporting.getCapacity(filters);
      const data = response.data;
      
      if (data && data.personUtilization) {
        // Transform person utilization data for charts
        const peopleUtilization = data.personUtilization.map((person: any) => ({
          id: person.person_id,
          name: person.person_name,
          role: person.primary_role,
          utilization: Math.round(person.total_allocation || 0)
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
          overAllocatedCount: data.summary?.overAllocated || 0,
          underUtilizedCount: data.summary?.underAllocated || 0,
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
      const response = await api.demands.getSummary({
        // Don't apply date filters for now to show all demand data
        project_type_id: filters.projectTypeId,
        location_id: filters.locationId
      });
      const data = response.data;
      
      if (data) {
        // Transform by_role to byProjectType for the chart
        const byProjectType = data.by_role?.map((role: any) => ({
          type: role.role_name,
          demand: role.total_hours
        })) || [];
        
        // Create forecast from timeline data if available
        const forecast = data.timeline?.map((item: any) => ({
          month: item.month,
          demand: item.total_hours,
          capacity: 0 // We don't have capacity in this view yet
        })) || [];
        
        return {
          ...data,
          totalDemand: data.summary?.total_hours || 0,
          projectCount: data.summary?.total_projects || 0,
          byProjectType,
          forecast
        };
      }
      return data;
    },
    enabled: activeReport === 'demand'
  });

  const { data: gapsReport, isLoading: gapsLoading, refetch: refetchGaps } = useQuery({
    queryKey: ['report-gaps', filters],
    queryFn: async () => {
      const response = await api.demands.getGaps();
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
          gapPercentage: data.gaps.length > 0 ? 
            Math.round((data.summary?.total_shortage_fte / data.gaps.reduce((sum: number, g: any) => sum + g.total_capacity_fte, 0)) * 100) : 0,
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
            <div className="metric">{capacityReport.totalCapacity} hours</div>
          </div>
          <div className="summary-card">
            <h3>Utilized</h3>
            <div className="metric">{capacityReport.utilizedCapacity} hours</div>
          </div>
          <div className="summary-card">
            <h3>Available</h3>
            <div className="metric">{capacityReport.availableCapacity} hours</div>
          </div>
          <div className="summary-card">
            <h3>Utilization Rate</h3>
            <div className="metric">{capacityReport.utilizationRate}%</div>
          </div>
        </div>

        <div className="charts-grid">
          <div className="chart-container">
            <h3>Capacity by Role</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={capacityReport.byRole}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="role" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="capacity" fill={CHART_COLORS[0]} />
                <Bar dataKey="utilized" fill={CHART_COLORS[1]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3>Capacity by Location</h3>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={capacityReport.byLocation || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => entry.location ? `${entry.location}: ${entry.percentage}%` : ''}
                  outerRadius={80}
                  fill={CHART_COLORS[0]}
                  dataKey="capacity"
                >
                  {capacityReport.byLocation?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </RechartsPieChart>
            </ResponsiveContainer>
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
            <h3>Average Utilization</h3>
            <div className="metric">{utilizationReport.averageUtilization}%</div>
          </div>
          <div className="summary-card">
            <h3>Over-allocated</h3>
            <div className="metric text-danger">{utilizationReport.overAllocatedCount} people</div>
            {utilizationReport.overAllocatedCount > 0 && (
              <Link to="/assignments" className="card-action-link">
                <ClipboardList size={14} /> Manage Assignments
              </Link>
            )}
          </div>
          <div className="summary-card">
            <h3>Under-utilized</h3>
            <div className="metric text-warning">{utilizationReport.underUtilizedCount} people</div>
            {utilizationReport.underUtilizedCount > 0 && (
              <Link to="/assignments" className="card-action-link">
                <ClipboardList size={14} /> Find Projects
              </Link>
            )}
          </div>
          <div className="summary-card">
            <h3>Optimal</h3>
            <div className="metric text-success">{utilizationReport.optimalCount} people</div>
          </div>
        </div>

        <div className="chart-container">
          <h3>Utilization Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={utilizationReport.utilizationDistribution || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="range" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" fill={CHART_COLORS[1]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="people-list">
          <h3>People by Utilization</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Utilization</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {utilizationReport.peopleUtilization?.map((person: any) => (
                <tr key={person.id}>
                  <td>{person.name}</td>
                  <td>{person.role}</td>
                  <td>{person.utilization}%</td>
                  <td>
                    <span className={`badge ${
                      person.utilization > 100 ? 'badge-danger' :
                      person.utilization < 70 ? 'badge-warning' :
                      'badge-success'
                    }`}>
                      {person.utilization > 100 ? 'Over-allocated' :
                       person.utilization < 70 ? 'Under-utilized' :
                       'Optimal'}
                    </span>
                  </td>
                  <td>
                    {(person.utilization > 100 || person.utilization < 70) && (
                      <Link 
                        to={`/assignments?person=${encodeURIComponent(person.name)}`}
                        className="btn btn-sm btn-outline"
                        title="Manage assignments"
                      >
                        <ClipboardList size={14} /> View Assignments
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            <div className="metric">{demandReport.totalDemand || 0} hours</div>
          </div>
          <div className="summary-card">
            <h3>Projects</h3>
            <div className="metric">{demandReport.projectCount || 0}</div>
            <Link to="/projects" className="card-action-link">
              <ExternalLink size={14} /> View Projects
            </Link>
          </div>
          <div className="summary-card">
            <h3>Peak Month</h3>
            <div className="metric">{demandReport.peakMonth || 'N/A'}</div>
          </div>
        </div>

        <div className="charts-grid">
          <div className="chart-container">
            <h3>Demand by Project Type</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={demandReport.byProjectType || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="demand" fill={CHART_COLORS[0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3>Demand Forecast</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={demandReport.forecast || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="demand" stroke={CHART_COLORS[3]} strokeWidth={2} />
                <Line type="monotone" dataKey="capacity" stroke={CHART_COLORS[1]} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
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
            <h3>Total Gap</h3>
            <div className="metric text-danger">{gapsReport.totalGap || 0} hours</div>
            {gapsReport.totalGap > 0 && (
              <Link to="/people" className="card-action-link">
                <UserPlus size={14} /> Add People
              </Link>
            )}
          </div>
          <div className="summary-card">
            <h3>Critical Roles</h3>
            <div className="metric">{gapsReport.criticalRolesCount || 0}</div>
            {gapsReport.criticalRolesCount > 0 && (
              <Link to="/roles" className="card-action-link">
                <Users size={14} /> View Roles
              </Link>
            )}
          </div>
          <div className="summary-card">
            <h3>Gap Percentage</h3>
            <div className="metric">{gapsReport.gapPercentage || 0}%</div>
          </div>
        </div>

        <div className="gaps-analysis">
          <h3>Capacity Gaps by Role</h3>
          <table className="table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Demand</th>
                <th>Capacity</th>
                <th>Gap</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(gapsReport.gapsByRole || []).map((gap: any) => (
                <tr key={gap.roleId} className={gap.gap < 0 ? 'highlight-danger' : ''}>
                  <td>{gap.roleName}</td>
                  <td>{gap.demand} hrs</td>
                  <td>{gap.capacity} hrs</td>
                  <td className={gap.gap < 0 ? 'text-danger' : 'text-success'}>
                    {gap.gap < 0 ? `${gap.gap}` : `+${gap.gap}`} hrs
                  </td>
                  <td>
                    {gap.gap < 0 ? (
                      <div className="action-cell">
                        <span className="badge badge-danger">
                          <AlertTriangle size={14} /> Gap ({Math.abs(gap.gap)} hrs short)
                        </span>
                        <Link 
                          to={`/people?role=${encodeURIComponent(gap.roleName)}`}
                          className="btn btn-sm btn-outline"
                          title="View people with this role"
                        >
                          <Users size={14} /> View People
                        </Link>
                        <Link 
                          to="/people"
                          className="btn btn-sm btn-primary"
                          title="Add new person"
                        >
                          <UserPlus size={14} /> Add Person
                        </Link>
                      </div>
                    ) : (
                      <span className="badge badge-success">Sufficient</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {gapsReport.recommendations && gapsReport.recommendations.length > 0 && (
          <div className="recommendations">
            <h3>Recommendations</h3>
            <ul>
              {gapsReport.recommendations.map((rec: any, index: number) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
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
          className={`tab ${activeReport === 'demand' ? 'active' : ''}`}
          onClick={() => setActiveReport('demand')}
        >
          <PieChart size={20} />
          Demand Report
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