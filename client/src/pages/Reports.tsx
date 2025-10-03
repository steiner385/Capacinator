import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  BarChart3, PieChart, TrendingUp, Users, Calendar, 
  Download, Filter, RefreshCw, AlertTriangle, ExternalLink, UserPlus, UserMinus, ClipboardList, ChevronDown,
  Briefcase, User, Plus, X, Minus
} from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../lib/api-client';
import { useScenario } from '../contexts/ScenarioContext';
import { getDefaultReportDateRange } from '../utils/date';

// Helper function to format month-year string
const formatMonthYear = (monthStr: string): string => {
  if (!monthStr || !monthStr.includes('-')) return monthStr;
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};
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
  const { currentScenario } = useScenario();
  const [activeReport, setActiveReport] = useState<'capacity' | 'utilization' | 'demand' | 'gaps'>('demand');
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
      
      const data = capacityResponse.data;
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
      const data = response.data;
      
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
      console.log('Fetching demand report with filters:', filters);
      const response = await api.reporting.getDemand(filters);
      const data = response.data;
      
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
        
        console.log('Generated trendOverTime:', trendOverTime);
        
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
      const data = response.data;
      
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

      const response = await api.reporting.export({
        reportType: endpoint,
        format,
        filters
      });

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

  // Reduce Load Modal Component
  const renderReduceLoadModal = () => {
    if (!showReduceLoadModal || !selectedPerson) return null;
    
    const recommendations = getProjectRemovalRecommendations(selectedPerson);
    
    return (
      <div className="modal-backdrop" onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowReduceLoadModal(false);
          setSelectedPerson(null);
        }
      }}>
        <div className="modal" style={{ maxWidth: '800px' }}>
          <div className="modal-header">
            <div>
              <h2 style={{ margin: 0 }}>Reduce Workload for {selectedPerson.name}</h2>
              {filters.startDate && filters.endDate && (
                <p style={{ margin: '0.5rem 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Date Range: {filters.startDate} to {filters.endDate}
                </p>
              )}
            </div>
            <button
              onClick={() => {setShowReduceLoadModal(false); setSelectedPerson(null);}}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: 'var(--text-secondary)'
              }}
            >
              <X size={24} />
            </button>
          </div>
          
          <div className="modal-body">
            <div style={{
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#c00' }}>
                <AlertTriangle size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Overallocated at {selectedPerson.utilization}%
              </h4>
              <p style={{ margin: 0, color: '#800' }}>
                This person is allocated {selectedPerson.utilization - 100}% over capacity. 
                Remove or reduce assignments to bring utilization under 100%.
              </p>
            </div>

            <h3>Current Assignments</h3>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {recommendations.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                  No assignments found to remove.
                </p>
              ) : (
                <table className="table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Allocation %</th>
                      <th>New Utilization</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recommendations.map((assignment) => (
                      <tr key={assignment.id}>
                        <td>
                          <strong>{assignment.project_name}</strong>
                          <br />
                          <small style={{ color: 'var(--text-secondary)' }}>
                            {assignment.role_name}
                          </small>
                        </td>
                        <td>
                          <span style={{ 
                            color: assignment.allocation_percentage > 50 ? 'var(--danger)' : 'var(--warning)',
                            fontWeight: 600
                          }}>
                            {assignment.allocation_percentage}%
                          </span>
                        </td>
                        <td>
                          {assignment.newUtilization}% 
                          <span style={{ 
                            color: assignment.newUtilization <= 100 ? 'var(--success)' : 'var(--warning)',
                            marginLeft: '0.5rem'
                          }}>
                            {assignment.newUtilization <= 100 ? '✓' : '⚠'}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={async () => {
                              try {
                                await api.assignments.delete(assignment.id);
                                // Refresh the assignments data
                                await refetchPersonAssignments();
                                // Close modal and refresh utilization data
                                setShowReduceLoadModal(false);
                                await refetchUtilization();
                                setModalNotification({
                                  type: 'success',
                                  message: `Successfully removed ${selectedPerson.name} from ${assignment.project_name}`
                                });
                              } catch (error) {
                                console.error('Error removing assignment:', error);
                                setModalNotification({
                                  type: 'error',
                                  message: 'Failed to remove assignment. Please try again.'
                                });
                              }
                            }}
                            className="btn btn-sm btn-danger"
                          >
                            <Minus size={14} /> Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          
          <div className="modal-footer">
            <button
              onClick={() => {setShowReduceLoadModal(false); setSelectedPerson(null);}}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Add Projects Modal Component
  const renderAddProjectsModal = () => {
    if (!showAddProjectsModal || !selectedPerson) return null;
    
    const recommendations = getProjectAdditionRecommendations(selectedPerson);
    
    return (
      <div className="modal-backdrop" onClick={(e) => {
        if (e.target === e.currentTarget) {
          setShowAddProjectsModal(false);
          setSelectedPerson(null);
        }
      }}>
        <div className="modal" style={{ maxWidth: '800px' }}>
          <div className="modal-header">
            <div>
              <h2 style={{ margin: 0 }}>Add Projects for {selectedPerson.person_name || selectedPerson.name}</h2>
              {filters.startDate && filters.endDate && (
                <p style={{ margin: '0.5rem 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Date Range: {filters.startDate} to {filters.endDate}
                </p>
              )}
            </div>
            <button
              onClick={() => {setShowAddProjectsModal(false); setSelectedPerson(null);}}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: 'var(--text-secondary)'
              }}
            >
              <X size={24} />
            </button>
          </div>
          
          <div className="modal-body">
            <div style={{
              backgroundColor: '#fef8e7',
              border: '1px solid #f9e3a3',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#b87900' }}>
                <AlertTriangle size={20} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Underutilized at {selectedPerson.utilization || 0}%
              </h4>
              <p style={{ margin: 0, color: '#8b6914' }}>
                This person has {(selectedPerson.availableCapacity || 0).toFixed(1)}% capacity available. 
                Add projects to improve utilization.
              </p>
            </div>

            <h3>Available Projects</h3>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {recommendations.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>
                  No projects with gaps found that match this person's skills.
                </p>
              ) : (
                <table className="table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Priority</th>
                      <th>Gap</th>
                      <th>Suggested %</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recommendations.map((project) => (
                      <tr key={project.id}>
                        <td>
                          <strong>{project.name}</strong>
                          <br />
                          <small style={{ color: 'var(--text-secondary)' }}>
                            {project.project_type_name || 'No type'}
                          </small>
                        </td>
                        <td>
                          <ReportStatusBadge
                            status={`P${project.priority}`}
                            variant={project.priority === 1 ? 'danger' : project.priority === 2 ? 'warning' : 'default'}
                          />
                        </td>
                        <td>
                          <span style={{ color: 'var(--danger)' }}>
                            {project.remaining_demand || 'Unknown'}%
                          </span>
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max={selectedPerson.availableCapacity}
                            defaultValue={project.suggestedAllocation}
                            id={`allocation-${project.id}`}
                            style={{
                              width: '80px',
                              padding: '0.25rem',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)'
                            }}
                          />
                        </td>
                        <td>
                          <button
                            onClick={async () => {
                              const allocationInput = document.getElementById(`allocation-${project.id}`) as HTMLInputElement;
                              const allocation = parseInt(allocationInput.value) || project.suggestedAllocation;
                              
                              try {
                                // Validate allocation fits within available capacity
                                if (allocation > selectedPerson.availableCapacity) {
                                  setModalNotification({
                                    type: 'error',
                                    message: `Allocation exceeds available capacity (${selectedPerson.availableCapacity}%)`
                                  });
                                  return;
                                }

                                // Check if assignment already exists
                                const existingAssignment = personAssignments.find((a: any) => 
                                  a.project_id === project.id && 
                                  a.person_id === selectedPerson.id
                                );

                                if (existingAssignment) {
                                  // Update existing assignment
                                  await api.assignments.update(existingAssignment.id, {
                                    allocation_percentage: existingAssignment.allocation_percentage + allocation
                                  });
                                } else {
                                  // Create new assignment
                                  await api.assignments.create({
                                    person_id: selectedPerson.id || selectedPerson.person_id,
                                    project_id: project.id,
                                    role_id: selectedPerson.role_id || selectedPerson.primary_role_id,
                                    allocation_percentage: allocation,
                                    start_date: filters.startDate || project.aspiration_start,
                                    end_date: filters.endDate || project.aspiration_finish
                                  });
                                }
                                
                                // Refresh data
                                await refetchPersonAssignments();
                                await refetchAvailableProjects();
                                // Close modal and refresh main report
                                setShowAddProjectsModal(false);
                                await refetchUtilization();
                                
                                setModalNotification({
                                  type: 'success',
                                  message: `Successfully assigned ${selectedPerson.person_name} to ${project.name}`
                                });
                              } catch (error: any) {
                                console.error('Error creating assignment:', error);
                                
                                // Handle specific error cases
                                let errorMessage = 'Failed to create assignment. Please try again.';
                                
                                if (error.response?.status === 409) {
                                  errorMessage = 'Assignment already exists for this person and project.';
                                } else if (error.response?.data?.message) {
                                  errorMessage = `Assignment creation failed: ${error.response.data.message}`;
                                }
                                
                                setModalNotification({
                                  type: 'error',
                                  message: errorMessage
                                });
                              }
                            }}
                            className="btn btn-sm btn-primary"
                          >
                            <Plus size={14} /> Assign
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          
          <div className="modal-footer">
            <button
              onClick={() => {setShowAddProjectsModal(false); setSelectedPerson(null);}}
              className="btn btn-secondary"
            >
              Cancel
            </button>
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

      <div className="report-tabs">
        <button 
          className={`tab ${activeReport === 'capacity' ? 'active' : ''}`}
          onClick={() => setActiveReport('capacity')}
        >
          <Users size={16} />
          Capacity
        </button>
        <button 
          className={`tab ${activeReport === 'utilization' ? 'active' : ''}`}
          onClick={() => setActiveReport('utilization')}
        >
          <BarChart3 size={16} />
          Utilization
        </button>
        <button 
          className={`tab ${activeReport === 'demand' ? 'active' : ''}`}
          onClick={() => setActiveReport('demand')}
        >
          <TrendingUp size={16} />
          Demand
        </button>
        <button 
          className={`tab ${activeReport === 'gaps' ? 'active' : ''}`}
          onClick={() => setActiveReport('gaps')}
        >
          <AlertTriangle size={16} />
          Gaps Analysis
        </button>
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

      {/* Modal Components */}
      {renderReduceLoadModal()}
      {renderAddProjectsModal()}
      
      {/* Notification Modal */}
      {modalNotification.type && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '2rem',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          zIndex: 1001,
          minWidth: '300px',
          maxWidth: '500px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '1rem',
            color: modalNotification.type === 'error' ? 'var(--danger)' : 
                   modalNotification.type === 'warning' ? 'var(--warning)' : 
                   modalNotification.type === 'success' ? 'var(--success)' : 
                   'var(--info)'
          }}>
            <AlertTriangle size={20} style={{ marginRight: '0.5rem' }} />
            <strong>
              {modalNotification.type === 'error' ? 'Error' : 
               modalNotification.type === 'warning' ? 'Warning' : 
               modalNotification.type === 'success' ? 'Success' : 
               'Info'}
            </strong>
          </div>
          <p style={{ margin: '0 0 1rem 0' }}>
            {modalNotification.message}
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setModalNotification({ type: null, message: '' })}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: 'var(--primary-color)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
      
      {/* Confirmation Modal */}
      {showConfirmation.show && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '2rem',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          zIndex: 1001,
          minWidth: '300px',
          maxWidth: '500px'
        }}>
          <h3 style={{ marginTop: 0 }}>Confirm Action</h3>
          <p>{showConfirmation.message}</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button
              onClick={showConfirmation.onCancel}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={showConfirmation.onConfirm}
              className="btn btn-primary"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}