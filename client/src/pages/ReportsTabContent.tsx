import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  BarChart3, PieChart, TrendingUp, Users, Calendar, 
  Download, Filter, RefreshCw, AlertTriangle, ExternalLink, UserPlus, UserMinus, ClipboardList, ChevronDown,
  Briefcase, User, Plus, X, Minus
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../lib/api-client';
import { useScenario } from '../contexts/ScenarioContext';
import { getDefaultReportDateRange } from '../utils/date';
import {
  ReportSummaryCard,
  ReportEmptyState,
  ReportTable,
  ReportStatusBadge,
  ReportProgressBar,
  UtilizationReport,
  DemandReport,
  GapsReport,
  CHART_COLORS,
  CHART_AXIS_CONFIG,
  getChartColor,
  type Column,
  type ActionButton
} from '../components/reports';
import '../styles/reports.css';

interface ReportFilters {
  startDate: string;
  endDate: string;
  projectTypeId?: string;
  locationId?: string;
  roleId?: string;
}

// Helper function to format month-year string
const formatMonthYear = (monthStr: string): string => {
  if (!monthStr || !monthStr.includes('-')) return monthStr;
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

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

interface ReportsTabContentProps {
  activeReport: string;
}

export const ReportsTabContent: React.FC<ReportsTabContentProps> = ({ activeReport }) => {
  const { currentScenario } = useScenario();
  const [filters, setFilters] = useState<ReportFilters>(getDefaultReportDateRange());
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showReduceLoadModal, setShowReduceLoadModal] = useState(false);
  const [showAddProjectsModal, setShowAddProjectsModal] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  
  // Modal notification states
  const [modalNotification, setModalNotification] = useState<{
    type: 'success' | 'error' | 'warning' | 'info' | null;
    message: string;
  }>({ type: null, message: '' });
  const [showConfirmation, setShowConfirmation] = useState<{
    show: boolean;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
  }>({ show: false, message: '', onConfirm: () => {}, onCancel: () => {} });

  // Fetch report data
  const { data: capacityReport, isLoading: capacityLoading, refetch: refetchCapacity } = useQuery({
    queryKey: ['report-capacity', filters, currentScenario?.id],
    queryFn: async () => {
      const [capacityResponse, peopleResponse] = await Promise.all([
        api.reporting.getCapacity(filters),
        api.people.list()
      ]);
      
      const data = capacityResponse.data.data;
      const peopleData = peopleResponse.data?.data || [];
      
      // Transform the API data to match chart requirements
      if (data) {
        // Use the correctly calculated byRole data from the API instead of frontend calculation
        const byRole = data.byRole || [];
        
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
          return { location, capacity };
        });
        
        // Transform personUtilization to provide daily hours
        const personUtilization = (data.utilizationData || []).map((person: any) => ({
          ...person,
          default_hours_per_day: person.available_hours || 8,
          person_name: person.person_name || person.name
        }));
        
        // Add chart-friendly capacity over time data
        const capacityOverTime = [
          { period: 'Current Month', capacity: totalCapacity },
          { period: 'Next Month', capacity: Math.round(totalCapacity * 1.02) },
          { period: 'In 3 Months', capacity: Math.round(totalCapacity * 1.05) }
        ];
        
        return {
          ...data,
          totalCapacity: totalCapacity,
          utilizedCapacity: utilizedCapacity,
          personUtilization: personUtilization,
          byRole: byRole,
          byLocation: byLocation,
          capacityOverTime: capacityOverTime
        };
      }
      return data;
    },
    enabled: activeReport === 'capacity' && !!currentScenario
  });

  const { data: utilizationReport, isLoading: utilizationLoading, refetch: refetchUtilization } = useQuery({
    queryKey: ['report-utilization', filters, currentScenario?.id],
    queryFn: async () => {
      const response = await api.reporting.getUtilization(filters);
      const data = response.data.data;
      
      if (data) {
        // Transform the data to match what the UtilizationReport component expects
        const peopleUtilization = data.utilizationData?.map((person: any) => ({
          id: person.person_id,
          name: person.person_name,
          role: person.primary_role_name || 'No Role',
          utilization: person.total_allocation_percentage || 0,
          availableHours: person.available_hours || 8,
          projectCount: person.project_count || 0,
          projects: person.project_names || ''
        })) || [];
        
        // Calculate role-based utilization
        const roleMap = new Map();
        peopleUtilization.forEach((person: any) => {
          if (!roleMap.has(person.role)) {
            roleMap.set(person.role, { 
              role: person.role, 
              totalUtilization: 0, 
              count: 0 
            });
          }
          const roleData = roleMap.get(person.role);
          roleData.totalUtilization += person.utilization;
          roleData.count += 1;
        });
        
        const roleUtilization = Array.from(roleMap.values()).map(role => ({
          role: role.role,
          avgUtilization: role.count > 0 ? role.totalUtilization / role.count : 0
        }));
        
        // Calculate counts for summary cards
        const overAllocatedCount = peopleUtilization.filter((p: any) => p.utilization > 100).length;
        const underUtilizedCount = peopleUtilization.filter((p: any) => p.utilization > 0 && p.utilization < 80).length;
        const optimalCount = peopleUtilization.filter((p: any) => p.utilization >= 80 && p.utilization <= 100).length;
        
        return {
          ...data,
          peopleUtilization,
          roleUtilization,
          averageUtilization: data.summary?.averageUtilization || 0,
          overAllocatedCount,
          underUtilizedCount,
          optimalCount
        };
      }
      
      return data;
    },
    enabled: activeReport === 'utilization' && !!currentScenario
  });

  const { data: demandReport, isLoading: demandLoading, refetch: refetchDemand } = useQuery({
    queryKey: ['report-demand', filters, currentScenario?.id],
    queryFn: async () => {
      const response = await api.reporting.getDemand(filters);
      const data = response.data.data;
      
      // Transform data for charts
      if (data) {
        // The API already returns byProject as an array, just limit to top 10 for visibility
        const byProject = (data.byProject || [])
          .sort((a: any, b: any) => b.demand - a.demand)
          .slice(0, 10);
        
        // Add trend data over time
        let trendOverTime = (data.timeline || []).map((item: any) => ({
          month: formatMonthYear(item.month),
          total_hours: item.total_hours
        }));
        
        // If we only have one month or no timeline data, generate a timeline based on the date range
        if (trendOverTime.length <= 1 && filters.startDate && filters.endDate) {
          const startDate = new Date(filters.startDate);
          const endDate = new Date(filters.endDate);
          const monthsToGenerate = [];
          
          // Generate all months in the range
          const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
          while (current <= endDate) {
            monthsToGenerate.push({
              month: formatMonthYear(current.toISOString().slice(0, 7)),
              date: new Date(current)
            });
            current.setMonth(current.getMonth() + 1);
          }
          
          // If we have at least one data point, distribute the demand across months
          if (trendOverTime.length === 1 && data.summary?.total_hours > 0) {
            const totalHours = data.summary.total_hours;
            const hoursPerMonth = Math.round(totalHours / monthsToGenerate.length);
            
            trendOverTime = monthsToGenerate.map((month, index) => ({
              month: month.month,
              total_hours: hoursPerMonth
            }));
          } else if (trendOverTime.length === 0) {
            // Fallback for no data
            trendOverTime = [
              { month: 'Current', total_hours: data.summary?.total_hours || 0 },
              { month: 'Next Month', total_hours: Math.round((data.summary?.total_hours || 0) * 0.95) },
              { month: 'In 3 Months', total_hours: Math.round((data.summary?.total_hours || 0) * 0.90) }
            ];
          }
        }
        
        // Find peak month from timeline data
        const peakMonth = trendOverTime.reduce((peak: any, current: any) => 
          current.total_hours > (peak?.total_hours || 0) ? current : peak, 
          null
        )?.month || 'N/A';
        
        return {
          ...data,
          byProject,
          trendOverTime,
          peakMonth
        };
      }
      
      return data;
    },
    enabled: activeReport === 'demand' && !!currentScenario
  });

  const { data: gapsReport, isLoading: gapsLoading, refetch: refetchGaps } = useQuery({
    queryKey: ['report-gaps', filters, currentScenario?.id],
    queryFn: async () => {
      const response = await api.reporting.getGaps(filters);
      const data = response.data.data;
      
      if (data) {
        // Transform capacity gaps data for charts
        const gapsByRole = data.capacityGaps
          .filter((gap: any) => gap.total_demand_fte > 0 || gap.total_capacity_fte > 0)
          .map((gap: any) => ({
            roleId: gap.role_id,
            roleName: gap.role_name,
            demand: Math.round(gap.total_demand_fte * 160),
            capacity: Math.round(gap.total_capacity_fte * 160),
            gap: Math.round(-gap.capacity_gap_fte * 160), // Negative means shortage
            isShortage: gap.capacity_gap_fte < 0
          }))
          .filter((gap: any) => gap.gap !== 0)
          .sort((a: any, b: any) => b.gap - a.gap);
        
        // Calculate trend over time
        const gapTrend = [
          { period: 'Current', gap: data.summary?.totalGapHours || 0 },
          { period: 'Next Month', gap: Math.round((data.summary?.totalGapHours || 0) * 0.8) },
          { period: 'In 3 Months', gap: Math.round((data.summary?.totalGapHours || 0) * 0.5) }
        ];
        
        // Calculate total gap hours and other metrics
        const totalGapFte = data.capacityGaps.reduce((sum: number, g: any) => sum + Math.max(0, -g.capacity_gap_fte || 0), 0);
        const totalGap = Math.round(totalGapFte * 160); // Convert to hours
        const criticalRolesCount = gapsByRole.filter((g: any) => g.gap > 80).length;
        
        return {
          ...data,
          gapsByRole,
          gapTrend,
          totalGap,
          criticalRolesCount
        };
      }
      
      return data;
    },
    enabled: activeReport === 'gaps' && !!currentScenario
  });

  // Fetch person's assignments for modals
  const { data: personAssignments = [], refetch: refetchPersonAssignments } = useQuery({
    queryKey: ['person-assignments', selectedPerson?.id, currentScenario?.id],
    queryFn: async () => {
      const response = await api.assignments.list({ person_id: selectedPerson.id });
      return response.data?.data || [];
    },
    enabled: !!selectedPerson?.id && (showReduceLoadModal || showAddProjectsModal)
  });

  // Fetch available projects with gaps for recommendations
  const { data: availableProjects = [], refetch: refetchAvailableProjects } = useQuery({
    queryKey: ['available-projects', selectedPerson?.id, currentScenario?.id],
    queryFn: async () => {
      const response = await api.projects.list();
      return response.data?.data || [];
    },
    enabled: showAddProjectsModal && !!selectedPerson?.id
  });

  // Fetch filter options
  const { data: filterOptions = {} } = useQuery({
    queryKey: ['report-filter-options'],
    queryFn: async () => {
      const [projectTypes, locations, roles] = await Promise.all([
        api.projectTypes.list(),
        api.locations.list(),
        api.roles.list()
      ]);

      return {
        projectTypes: projectTypes.data?.data || [],
        locations: locations.data?.data || [],
        roles: roles.data?.data || []
      };
    }
  });

  // Get project removal recommendations
  const getProjectRemovalRecommendations = (person: any) => {
    // Sort by allocation percentage descending to suggest removing highest allocations first
    const sortedAssignments = [...personAssignments].sort((a, b) => 
      b.allocation_percentage - a.allocation_percentage
    );
    
    const recommendations = [];
    let cumulativeReduction = 0;
    
    for (const assignment of sortedAssignments) {
      if (cumulativeReduction >= person.utilization - 100) break;
      
      recommendations.push({
        ...assignment,
        reductionAmount: assignment.allocation_percentage,
        newUtilization: person.utilization - cumulativeReduction - assignment.allocation_percentage
      });
      
      cumulativeReduction += assignment.allocation_percentage;
    }
    
    return recommendations;
  };

  // Get project addition recommendations
  const getProjectAdditionRecommendations = (person: any) => {
    const availableCapacity = person.availableCapacity || 0;
    
    // Find projects with gaps
    const projectsWithGaps = availableProjects
      .filter((project: any) => {
        // Check if project has unmet demand
        const hasGap = project.allocation_status === 'UNDER_ALLOCATED';
        // Check if person has required role
        const hasRole = !project.required_role_id || person.role_id === project.required_role_id;
        return hasGap && hasRole;
      })
      .map((project: any) => ({
        ...project,
        suggestedAllocation: Math.min(availableCapacity, project.remaining_demand || 20)
      }))
      .sort((a, b) => b.priority - a.priority);
    
    return projectsWithGaps;
  };

  // Handle person actions from utilization report
  const handlePersonAction = (person: any, action: 'reduce' | 'add') => {
    setSelectedPerson(person);
    if (action === 'reduce') {
      setShowReduceLoadModal(true);
    } else {
      const availableCapacity = Math.max(0, 100 - person.utilization);
      
      if (availableCapacity <= 5) {
        setModalNotification({
          type: 'warning',
          message: `${person.name} is nearly at full capacity (${person.utilization}%) for this timeframe. Only ${availableCapacity.toFixed(1)}% capacity remains.`
        });
        return;
      }
      
      setSelectedPerson({
        ...person,
        availableCapacity: availableCapacity
      });
      setShowAddProjectsModal(true);
    }
  };

  // Export handlers
  const handleExport = async (format: 'csv' | 'xlsx' | 'json') => {
    try {
      let data;
      let endpoint;
      
      switch (activeReport) {
        case 'capacity':
          data = capacityReport;
          endpoint = 'capacity';
          break;
        case 'utilization':
          data = utilizationReport;
          endpoint = 'utilization';
          break;
        case 'demand':
          data = demandReport;
          endpoint = 'demand';
          break;
        case 'gaps':
          data = gapsReport;
          endpoint = 'gaps';
          break;
      }

      if (!data) {
        setModalNotification({
          type: 'warning',
          message: 'No data available to export for the current tab.'
        });
        return;
      }

      let response;
      
      // Call the appropriate export function based on format
      switch (format) {
        case 'xlsx':
          response = await api.export.reportAsExcel(endpoint, filters);
          break;
        case 'csv':
          response = await api.export.reportAsCSV(endpoint, filters);
          break;
        case 'pdf':
          response = await api.export.reportAsPDF(endpoint, filters);
          break;
        case 'json':
          // For JSON, we'll use the current report data
          const jsonBlob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
          });
          const jsonUrl = URL.createObjectURL(jsonBlob);
          const jsonLink = document.createElement('a');
          jsonLink.href = jsonUrl;
          jsonLink.download = `${endpoint}-report.json`;
          document.body.appendChild(jsonLink);
          jsonLink.click();
          document.body.removeChild(jsonLink);
          URL.revokeObjectURL(jsonUrl);
          return;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      // Handle file download
      const blob = new Blob([response.data], {
        type: format === 'csv' ? 'text/csv' : format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/json'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${endpoint}-report-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setShowExportDropdown(false);
      
    } catch (error) {
      console.error('Export error:', error);
      setModalNotification({
        type: 'error',
        message: 'Error exporting data. Please try again.'
      });
    }
  };

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  // Render capacity report using standardized components
  const renderCapacityReport = () => {
    if (capacityLoading || !capacityReport) return <div className="loading">Loading capacity report...</div>;

    // Define columns for people capacity table
    const peopleCapacityColumns: Column[] = [
      { header: 'Name', accessor: 'person_name', render: (value) => <strong>{value}</strong> },
      { header: 'Daily Hours', accessor: 'available_hours', render: (value) => `${value} hrs/day` },
      { header: 'Availability', accessor: 'default_availability_percentage', render: (value) => `${value}%` },
      { 
        header: 'Status', 
        accessor: 'allocation_status',
        render: (value) => {
          const variant = value === 'AVAILABLE' ? 'success' : 
                         value === 'FULLY_ALLOCATED' ? 'warning' : 
                         value === 'OVER_ALLOCATED' ? 'danger' : 'default';
          return <ReportStatusBadge status={value.replace(/_/g, ' ')} variant={variant} />;
        }
      }
    ];

    const peopleCapacityActions = (row: any): ActionButton[] => {
      if (row.allocation_status === 'AVAILABLE') {
        return [{
          to: `/assignments?person=${encodeURIComponent(row.person_name)}&action=assign&from=capacity-report&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`,
          icon: ClipboardList,
          text: 'Assign to Project',
          variant: 'primary'
        }];
      } else if (row.allocation_status === 'OVER_ALLOCATED') {
        return [{
          to: `/assignments?person=${encodeURIComponent(row.person_name)}&action=reduce-load&from=capacity-report&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`,
          icon: AlertTriangle,
          text: 'Reduce Load',
          variant: 'danger'
        }];
      }
      return [{
        to: `/people/${row.person_id}?from=capacity-report&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`,
        icon: User,
        text: 'View Details',
        variant: 'outline'
      }];
    };

    // Define columns for role capacity table
    const roleCapacityColumns: Column[] = [
      { header: 'Role', accessor: 'role' },
      { header: 'Total Capacity (hrs)', accessor: 'capacity' },
      { header: 'Utilized (hrs)', accessor: (row) => row.utilized || 0 },
      { header: 'Available (hrs)', accessor: (row) => row.capacity - (row.utilized || 0) },
      { 
        header: 'Status', 
        accessor: (row) => {
          const utilizationRate = row.capacity > 0 ? ((row.utilized || 0) / row.capacity) * 100 : 0;
          if (utilizationRate >= 90) return 'CRITICAL';
          if (utilizationRate >= 70) return 'HIGH';
          if (utilizationRate >= 50) return 'MODERATE';
          return 'AVAILABLE';
        },
        render: (value) => {
          const variant = value === 'AVAILABLE' ? 'success' : 
                         value === 'MODERATE' ? 'info' :
                         value === 'HIGH' ? 'warning' : 
                         value === 'CRITICAL' ? 'danger' : 'default';
          return <ReportStatusBadge status={value} variant={variant} />;
        }
      }
    ];

    const roleCapacityActions = (row: any): ActionButton[] => [{
      to: `/people?role=${encodeURIComponent(row.role)}&from=capacity-report&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`,
      icon: Users,
      text: 'View People',
      variant: 'outline'
    }];

    return (
      <div className="report-content">
        <div className="report-summary">
          <ReportSummaryCard
            title="Total Capacity"
            metric={capacityReport.totalCapacity || 0}
            unit=" hours"
          />
          <ReportSummaryCard
            title="# People with Capacity"
            metric={capacityReport.personUtilization?.length || 0}
            actionLink={{
              to: `/people?from=capacity-report&action=view-capacity&startDate=${filters.startDate || ''}&endDate=${filters.endDate || ''}`,
              icon: Users,
              text: 'View People'
            }}
          />
          <ReportSummaryCard
            title="# Roles with Capacity"
            metric={capacityReport.byRole?.length || 0}
          />
          <ReportSummaryCard
            title="Peak Month"
            metric="N/A"
          />
        </div>

        {(!capacityReport.personUtilization || capacityReport.personUtilization.length === 0) && (
          <ReportEmptyState
            icon={AlertTriangle}
            title="No Capacity Data Found"
            description="No people or capacity information is available for the selected date range."
            actionLink={{
              to: '/people',
              text: 'Add people'
            }}
          />
        )}

        <div className="charts-grid">
          <div className="chart-container">
            <h3>Capacity by Person</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={capacityReport.personUtilization?.slice(0, 10) || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="person_name" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="default_hours_per_day" fill={getChartColor('capacity', 0)} />
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
                <Bar dataKey="capacity" fill={getChartColor('capacity', 1)} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3>Capacity Trend Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={capacityReport.capacityOverTime || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="capacity" stroke={getChartColor('capacity', 2)} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="full-width-tables">
          <ReportTable
            title="People Capacity Overview"
            columns={peopleCapacityColumns}
            data={capacityReport.utilizationData || []}
            rowClassName={(row) => 
              row.allocation_status === 'AVAILABLE' ? 'report-table-row-success' :
              row.allocation_status === 'FULLY_ALLOCATED' ? 'report-table-row-warning' :
              row.allocation_status === 'OVER_ALLOCATED' ? 'report-table-row-danger' : ''
            }
            actions={peopleCapacityActions}
          />

          <ReportTable
            title="Role Capacity Analysis"
            columns={roleCapacityColumns}
            data={capacityReport.byRole || []}
            rowClassName={(row) => {
              const utilizationRate = row.capacity > 0 ? ((row.utilized || 0) / row.capacity) * 100 : 0;
              if (utilizationRate >= 90) return 'report-table-row-danger';
              if (utilizationRate >= 70) return 'report-table-row-warning';
              return '';
            }}
            actions={roleCapacityActions}
          />
        </div>
      </div>
    );
  };

  const isLoading = capacityLoading || utilizationLoading || demandLoading || gapsLoading;

  return (
    <div className="reports-tab-content">
      <div className="page-header">
        <h1>Reports & Analytics</h1>
        <div className="header-actions">
          <div className="dropdown">
            <button 
              className="btn btn-secondary"
              onClick={() => setShowExportDropdown(!showExportDropdown)}
            >
              <Download size={16} />
              Export
              <ChevronDown size={16} />
            </button>
            {showExportDropdown && (
              <div className="dropdown-menu">
                <button onClick={() => handleExport('csv')}>Export as CSV</button>
                <button onClick={() => handleExport('xlsx')}>Export as Excel</button>
                <button onClick={() => handleExport('json')}>Export as JSON</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="report-filters">
        <div className="filter-group">
          <label>Start Date</label>
          <input 
            type="date" 
            value={filters.startDate}
            onChange={(e) => handleFilterChange('startDate', e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>End Date</label>
          <input 
            type="date" 
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
          />
        </div>
        <div className="filter-group">
          <label>Project Type</label>
          <select 
            value={filters.projectTypeId || ''}
            onChange={(e) => handleFilterChange('projectTypeId', e.target.value)}
          >
            <option value="">All Types</option>
            {filterOptions.projectTypes?.map((type: any) => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Location</label>
          <select 
            value={filters.locationId || ''}
            onChange={(e) => handleFilterChange('locationId', e.target.value)}
          >
            <option value="">All Locations</option>
            {filterOptions.locations?.map((loc: any) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => {
            if (activeReport === 'capacity') refetchCapacity();
            else if (activeReport === 'utilization') refetchUtilization();
            else if (activeReport === 'demand') refetchDemand();
            else if (activeReport === 'gaps') refetchGaps();
          }}
          disabled={isLoading}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div className="report-container">
        {activeReport === 'capacity' && renderCapacityReport()}
        {activeReport === 'utilization' && (
          <UtilizationReport 
            data={utilizationReport} 
            filters={filters} 
            onPersonAction={handlePersonAction}
            CustomTooltip={CustomTooltip}
          />
        )}
        {activeReport === 'demand' && (
          <DemandReport 
            data={demandReport} 
            filters={filters}
            CustomTooltip={CustomTooltip}
          />
        )}
        {activeReport === 'gaps' && (
          <GapsReport 
            data={gapsReport} 
            filters={filters}
            CustomTooltip={CustomTooltip}
          />
        )}
      </div>
    </div>
  );
};