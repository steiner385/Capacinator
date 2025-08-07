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
import { getDefaultReportDateRange } from '../utils/date';

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
          const roleName = person.role_name || 'Unknown';
          const capacity = person.default_hours_per_day || 8;
          const utilized = (person.utilization_percentage || 0) * capacity / 100;
          
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
      
      if (data && data.utilizationData) {
        // Transform person utilization data for charts and table
        const peopleUtilization = data.utilizationData.map((person: any) => ({
          id: person.person_id,
          name: person.person_name,
          email: person.person_email || person.email,
          role: person.primary_role_name,
          location: person.location_name || person.primary_location,
          availableHours: person.available_hours || person.default_hours_per_day || 8,
          allocatedHours: person.total_allocated_hours || 0,
          availabilityPercentage: person.default_availability_percentage || 100,
          projectCount: person.project_count || 0,
          projectNames: person.project_names,
          utilization: Math.round(person.total_allocation_percentage || 0),
          totalUtilization: Math.round(person.total_allocation_percentage_all_assignments || 0),
          hasExternalConflicts: person.has_external_conflicts || false
        }));
        
        const averageUtilization = Math.round(
          peopleUtilization.reduce((sum: number, p: any) => sum + p.utilization, 0) / 
          (peopleUtilization.length || 1)
        );
        
        // Aggregate utilization by role
        const roleMap = new Map();
        if (peopleUtilization && peopleUtilization.length > 0) {
          peopleUtilization.forEach((person: any) => {
            const roleName = person.role || 'No Role';
            if (!roleMap.has(roleName)) {
              roleMap.set(roleName, { totalUtilization: 0, count: 0, people: [] });
            }
            const roleData = roleMap.get(roleName);
            roleData.totalUtilization += (person.utilization || 0);
            roleData.count += 1;
            roleData.people.push(person.name || 'Unknown');
          });
        }

        let roleUtilization = Array.from(roleMap.entries()).map(([role, data]: [string, any]) => ({
          role,
          avgUtilization: Math.round(data.totalUtilization / data.count),
          peopleCount: data.count,
          totalUtilization: data.totalUtilization,
          people: data.people
        })).sort((a, b) => b.avgUtilization - a.avgUtilization);


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
          roleUtilization,
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
      const response = await api.reporting.getDemand(filters);
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
      
      if (data && data.capacityGaps) {
        // Transform gaps data for the table
        const gapsByRole = data.capacityGaps.map((gap: any) => ({
          roleId: gap.role_id,
          roleName: gap.role_name,
          demand: Math.round(gap.total_demand_fte * 160), // Convert FTE to hours
          capacity: Math.round(gap.total_capacity_fte * 160),
          gap: Math.round(gap.gap_fte * 160)
        }));
        
        // Don't generate recommendations - only use what comes from API
        
        return {
          ...data,
          totalGap: data.summary?.totalGapHours || 0,
          criticalRolesCount: data.summary?.capacity_gaps || 0,
          gapPercentage: (() => {
            if (!data.capacityGaps.length) return 0;
            const totalCapacity = data.capacityGaps.reduce((sum: number, g: any) => sum + (g.total_capacity_fte || 0), 0);
            const totalGapFte = data.capacityGaps.reduce((sum: number, g: any) => sum + (g.gap_fte || 0), 0);
            // If no capacity exists, show percentage based on total demand
            if (totalCapacity === 0) {
              const totalDemand = data.capacityGaps.reduce((sum: number, g: any) => sum + (g.total_demand_fte || 0), 0);
              return totalDemand > 0 ? 100 : 0; // 100% gap if there's demand but no capacity
            }
            return Math.round((totalGapFte / totalCapacity) * 100);
          })(),
          gapsByRole
        };
      }
      return data;
    },
    enabled: activeReport === 'gaps'
  });

  // Fetch person assignments for recommendations
  const { data: personAssignments, refetch: refetchPersonAssignments } = useQuery({
    queryKey: ['person-assignments', selectedPerson?.id],
    queryFn: async () => {
      if (!selectedPerson?.id) return null;
      const response = await api.assignments.list({ person_id: selectedPerson.id });
      return response.data?.data || [];
    },
    enabled: !!selectedPerson?.id && (showReduceLoadModal || showAddProjectsModal)
  });

  // Fetch available projects with gaps for recommendations
  const { data: availableProjects, refetch: refetchAvailableProjects } = useQuery({
    queryKey: ['available-projects', filters],
    queryFn: async () => {
      const response = await api.projects.list();
      return response.data?.data || [];
    },
    enabled: showAddProjectsModal && !!selectedPerson?.id
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
        setModalNotification({
          type: 'warning',
          message: 'No data available to export for the current tab.'
        });
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
      setModalNotification({
        type: 'error',
        message: 'Error exporting data. Please try again.'
      });
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

  // Helper function to determine if the current date range is actionable
  const isDateRangeActionable = () => {
    if (!filters.endDate) return true; // No filter = current/future view
    
    const filterEndDate = new Date(filters.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day for comparison
    
    // If the end date is in the past, no actions should be available
    return filterEndDate >= today;
  };

  const getDateRangeContext = () => {
    if (!filters.startDate || !filters.endDate) return 'current';
    
    const filterStartDate = new Date(filters.startDate);
    const filterEndDate = new Date(filters.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (filterEndDate < today) return 'past';
    if (filterStartDate > today) return 'future';
    return 'current';
  };

  // Recommendation logic functions
  const getProjectRemovalRecommendations = (person: any) => {
    if (!personAssignments) return [];
    
    const filterStartDate = filters.startDate ? new Date(filters.startDate) : null;
    const filterEndDate = filters.endDate ? new Date(filters.endDate) : null;
    
    // Filter assignments to only those that overlap with the selected date range
    const filteredAssignments = personAssignments.filter((assignment: any) => {
      if (!filterStartDate || !filterEndDate) return true;
      
      const assignmentStart = assignment.start_date ? new Date(assignment.start_date) : null;
      const assignmentEnd = assignment.end_date ? new Date(assignment.end_date) : null;
      
      if (!assignmentStart || !assignmentEnd) return true; // Include assignments without dates
      
      // Assignment must overlap with the filter range
      return assignmentStart <= filterEndDate && assignmentEnd >= filterStartDate;
    });
    
    // Sort by impact and removal ease
    return filteredAssignments.map((assignment: any) => ({
      ...assignment,
      removalScore: calculateRemovalScore(assignment, person),
      impactLevel: (assignment.allocation_percentage || 0) > 50 ? 'High' : (assignment.allocation_percentage || 0) > 25 ? 'Medium' : 'Low'
    })).sort((a: any, b: any) => b.removalScore - a.removalScore);
  };

  const getProjectAdditionRecommendations = (person: any) => {
    if (!availableProjects) return [];
    
    const filterStartDate = filters.startDate ? new Date(filters.startDate) : null;
    const filterEndDate = filters.endDate ? new Date(filters.endDate) : null;
    const today = new Date();
    
    // Filter and score projects based on person's skills and availability
    return availableProjects
      .filter((project: any) => {
        if (project.include_in_demand === false) return false;
        
        // Only include projects that overlap with the selected date range
        if (filterStartDate && filterEndDate) {
          const projectStart = project.aspiration_start ? new Date(project.aspiration_start) : null;
          const projectEnd = project.aspiration_finish ? new Date(project.aspiration_finish) : null;
          
          // If project has dates, check for overlap with filter range
          if (projectStart && projectEnd) {
            // Project must overlap with the filter range
            const overlaps = projectStart <= filterEndDate && projectEnd >= filterStartDate;
            if (!overlaps) return false;
          }
          
          // For projects with no specific dates, only include if we're looking at future/current periods
          if (!projectStart && filterEndDate < today) {
            return false; // Don't recommend projects for past periods
          }
        }
        
        return true;
      })
      .map((project: any) => ({
        ...project,
        matchScore: calculateMatchScore(project, person),
        estimatedHours: calculateEstimatedHours(project, person),
        priority: project.priority === 1 ? 'High' : project.priority === 2 ? 'Medium' : 'Low'
      }))
      .sort((a: any, b: any) => b.matchScore - a.matchScore)
      .slice(0, 5); // Top 5 recommendations
  };

  const calculateRemovalScore = (assignment: any, person: any) => {
    // Higher score = better candidate for removal
    let score = 0;
    
    // Less critical projects get higher removal scores
    if (assignment.project_priority === 'Low') score += 30;
    else if (assignment.project_priority === 'Medium') score += 10;
    
    // Lower allocation percentage = easier to remove
    score += (50 - (assignment.allocation_percentage || 0));
    
    // Recent assignments are easier to remove
    const assignmentAge = new Date().getTime() - new Date(assignment.start_date || Date.now()).getTime();
    const ageInDays = assignmentAge / (1000 * 60 * 60 * 24);
    if (ageInDays < 30) score += 15;
    
    return Math.max(0, score);
  };

  const calculateMatchScore = (project: any, person: any) => {
    // Higher score = better match
    let score = 20; // Base score for all projects
    
    // Priority-based scoring (priority 1 = highest)
    if (project.priority === 1) score += 30;
    else if (project.priority === 2) score += 20;
    else if (project.priority === 3) score += 10;
    
    // Location match bonus (if available)
    if (project.location_id === person.locationId || project.location_name === person.location) {
      score += 15;
    }
    
    // Person's current utilization affects matching
    if (person.utilization < 50) score += 25; // Low utilization = better candidate
    else if (person.utilization < 80) score += 15; // Medium utilization
    else if (person.utilization < 100) score += 5; // High but not over-allocated
    
    // Project has aspiration dates (better structured)
    if (project.aspiration_start && project.aspiration_finish) score += 10;
    
    // Include in demand flag
    if (project.include_in_demand === true) score += 15;
    
    // Random factor for variety (between 0-10)
    score += Math.floor(Math.random() * 10);
    
    return Math.max(0, score);
  };

  const calculateEstimatedHours = (project: any, person: any) => {
    // Use the available capacity from the enhanced person object if available
    const availableCapacity = person.availableCapacity || Math.max(0, 100 - (person.utilization || 0));
    const dailyHours = person.availableHours || 8;
    
    // If nearly no capacity, suggest minimal allocation
    if (availableCapacity <= 10) {
      return Math.max(1, Math.round(availableCapacity * dailyHours / 100)); // Use almost all remaining capacity
    }
    
    // For good capacity, suggest allocation that fits well within the gap
    // Aim to use 60-80% of available capacity for optimal fit
    let targetCapacityUsage;
    if (project.priority === 1) {
      targetCapacityUsage = Math.min(availableCapacity * 0.8, 40); // High priority: up to 80% of available, max 40%
    } else if (project.priority === 2) {
      targetCapacityUsage = Math.min(availableCapacity * 0.6, 30); // Medium priority: up to 60% of available, max 30%
    } else {
      targetCapacityUsage = Math.min(availableCapacity * 0.4, 20); // Low priority: up to 40% of available, max 20%
    }
    
    const suggestedHours = Math.round(targetCapacityUsage * dailyHours / 100);
    return Math.max(1, suggestedHours); // Minimum 1 hour total
  };

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

        {(!capacityReport.personUtilization || capacityReport.personUtilization.length === 0) && (
          <div className="info-banner" style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '1rem',
            margin: '1rem 0',
            textAlign: 'center'
          }}>
            <AlertTriangle size={20} style={{ marginRight: '0.5rem' }} />
            <strong>No Capacity Data Found</strong>
            <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)' }}>
              No people or capacity information is available for the selected date range. 
              <Link to="/people" style={{ marginLeft: '0.5rem' }}>Add people</Link> to see capacity data.
            </p>
          </div>
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
                <Bar dataKey="default_hours_per_day" fill={CHART_COLORS[0]} />
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
                {(capacityReport.utilizationData || []).map((person: any) => (
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

        {(utilizationReport.averageUtilization || 0) === 0 && (
          <div className="info-banner" style={{
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '1rem',
            margin: '1rem 0',
            textAlign: 'center'
          }}>
            <AlertTriangle size={20} style={{ marginRight: '0.5rem' }} />
            <strong>No Project Assignments Found</strong>
            <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)' }}>
              Utilization is 0% because no people have been assigned to projects yet. 
              <Link to="/assignments" style={{ marginLeft: '0.5rem' }}>Create assignments</Link> to see utilization data.
            </p>
          </div>
        )}

        <div className="charts-grid">
          <div className="chart-container">
            <h3>Utilization by Person</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={utilizationReport.peopleUtilization || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  interval="preserveStartEnd"
                  tick={{ fontSize: 11 }}
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="utilization" fill={CHART_COLORS[1]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3>Utilization by Role</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={utilizationReport.roleUtilization || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis 
                  dataKey="role" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  interval="preserveStartEnd"
                  tick={{ fontSize: 11 }}
                />
                <YAxis />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="custom-tooltip">
                          <p className="tooltip-label">{`${label}`}</p>
                          <p className="tooltip-value">
                            {`Average Utilization: ${data.avgUtilization}%`}
                          </p>
                          <p className="tooltip-value">
                            {`People Count: ${data.peopleCount}`}
                          </p>
                          <p className="tooltip-value">
                            {`Total Utilization: ${data.totalUtilization}%`}
                          </p>
                          {data.people && (
                            <p className="tooltip-detail">
                              {`Team: ${data.people.slice(0, 3).join(', ')}${data.people.length > 3 ? ` +${data.people.length - 3} more` : ''}`}
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="avgUtilization" fill={CHART_COLORS[0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3>Utilization Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={utilizationReport.utilizationDistribution || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill={CHART_COLORS[2]} />
              </BarChart>
            </ResponsiveContainer>
          </div>


        </div>

        {/* Enhanced Team Utilization Overview - Full Width */}
        <div style={{ 
          width: '100%', 
          margin: '2rem 0 0 0',
          background: 'var(--bg-secondary)', 
          borderRadius: '12px', 
          padding: '2rem',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
            <h2 style={{ margin: '0', color: 'var(--text-primary)', fontSize: '1.5rem', fontWeight: '600' }}>
              🎯 Team Utilization Overview
            </h2>
            {filters.startDate && filters.endDate && (
              <div style={{
                backgroundColor: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                fontSize: '0.875rem',
                color: '#92400e',
                maxWidth: '300px'
              }}>
                <strong>⚠️ Date Filter Active:</strong><br />
                Showing utilization for {filters.startDate} to {filters.endDate}.<br />
                <span style={{ fontSize: '0.75rem' }}>
                  Assignment validation checks all dates and may show different results.
                </span>
              </div>
            )}
          </div>
          
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              backgroundColor: 'var(--bg-primary)',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid var(--border-color)'
            }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--table-header-bg)' }}>
                  <th style={{ 
                    padding: '1rem 1.5rem', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    color: 'var(--text-primary)',
                    borderBottom: '2px solid var(--border-color)',
                    fontSize: '0.875rem'
                  }}>
                    Team Member
                  </th>
                  <th style={{ 
                    padding: '1rem 1.5rem', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    color: 'var(--text-primary)',
                    borderBottom: '2px solid var(--border-color)',
                    fontSize: '0.875rem'
                  }}>
                    Role & Details
                  </th>
                  <th style={{ 
                    padding: '1rem 1.5rem', 
                    textAlign: 'left', 
                    fontWeight: '600', 
                    color: 'var(--text-primary)',
                    borderBottom: '2px solid var(--border-color)',
                    fontSize: '0.875rem'
                  }}>
                    Utilization & Projects
                  </th>
                  <th style={{ 
                    padding: '1rem 1.5rem', 
                    textAlign: 'center',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: '600', 
                    color: 'var(--text-primary)',
                    borderBottom: '2px solid var(--border-color)',
                    fontSize: '0.875rem'
                  }}>
                    Status
                  </th>
                  <th style={{ 
                    padding: '1rem 1.5rem', 
                    textAlign: 'center',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    fontWeight: '600', 
                    color: 'var(--text-primary)',
                    borderBottom: '2px solid var(--border-color)',
                    fontSize: '0.875rem'
                  }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {(utilizationReport.peopleUtilization || []).map((person: any, index: number) => (
                  <tr key={person.id || index} style={{
                    borderBottom: '1px solid var(--border-color)',
                    backgroundColor: index % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-hover)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--primary-bg-hover)';
                    e.currentTarget.style.transform = 'scale(1.01)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'var(--bg-primary)' : 'var(--bg-hover)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}>
                    <td style={{ padding: '1.25rem 1.5rem', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                          {person.name}
                        </strong>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {person.email || 'No email available'}
                        </span>
                      </div>
                    </td>
                    
                    <td style={{ padding: '1.25rem 1.5rem', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                          {person.role || 'No Role'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          📍 {person.location || 'No location'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                          {person.availableHours}h/day • {person.availabilityPercentage}% available
                        </span>
                      </div>
                    </td>
                    
                    <td style={{ padding: '1.25rem 1.5rem', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{
                            flex: 1,
                            height: '8px',
                            backgroundColor: 'var(--border-color)',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            position: 'relative'
                          }}>
                            <div style={{
                              height: '100%',
                              backgroundColor: 
                                person.utilization > 100 ? '#ef4444' :
                                person.utilization >= 80 ? '#22c55e' :
                                person.utilization >= 50 ? '#f59e0b' : '#94a3b8',
                              width: `${Math.min(person.utilization, 100)}%`,
                              borderRadius: '4px',
                              transition: 'width 0.3s ease'
                            }} />
                            {person.utilization > 100 && (
                              <div style={{
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                height: '100%',
                                width: '3px',
                                backgroundColor: '#dc2626',
                                animation: 'pulse 2s infinite'
                              }} />
                            )}
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'flex-end',
                            minWidth: '70px'
                          }}>
                            <span style={{ 
                              fontSize: '1rem', 
                              fontWeight: '600', 
                              color: 
                                person.utilization > 100 ? '#ef4444' :
                                person.utilization >= 80 ? '#22c55e' :
                                person.utilization >= 50 ? '#f59e0b' : '#94a3b8'
                            }}>
                              {person.utilization}%
                            </span>
                            {person.utilization < 100 && (
                              <span 
                                style={{ 
                                  fontSize: '0.7rem', 
                                  color: '#16a34a',
                                  fontWeight: '500'
                                }}
                              >
                                +{Math.round(100 - person.utilization)}% available
                              </span>
                            )}
                            {person.hasExternalConflicts && person.utilization < 100 && (
                              <span 
                                style={{ 
                                  fontSize: '0.65rem', 
                                  color: '#f59e0b',
                                  fontWeight: '500',
                                  cursor: 'help'
                                }}
                                title={`Note: Has assignments outside this timeframe that may limit availability`}
                              >
                                ⚠️ External assignments
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            📊 {person.allocatedHours}h allocated / {person.availableHours}h available
                          </span>
                          <span style={{ color: 'var(--text-tertiary)' }}>
                            🎯 {person.projectCount} project{person.projectCount !== 1 ? 's' : ''}
                            {person.projectNames && (
                              <span style={{ marginLeft: '0.5rem' }}>
                                ({person.projectNames.split(',').slice(0, 2).join(', ')}
                                {person.projectNames.split(',').length > 2 && ` +${person.projectNames.split(',').length - 2} more`})
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </td>
                    
                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center', verticalAlign: 'middle' }}>
                      <span style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        backgroundColor: 
                          person.utilization > 100 ? '#fee2e2' :
                          person.utilization >= 80 ? '#dcfce7' :
                          person.utilization >= 50 ? '#fef3c7' : '#f1f5f9',
                        color: 
                          person.utilization > 100 ? '#dc2626' :
                          person.utilization >= 80 ? '#16a34a' :
                          person.utilization >= 50 ? '#d97706' : '#64748b'
                      }}>
                        {person.utilization > 100 ? 'Over-utilized' :
                         person.utilization >= 80 ? 'Well-utilized' :
                         person.utilization >= 50 ? 'Under-utilized' : 'Available'}
                      </span>
                    </td>
                    
                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <Link 
                          to={`/people/${person.id}?from=utilization-report`}
                          style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: 'var(--primary)',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--primary-hover)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--primary)';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          👤 View Profile
                        </Link>
                        {person.utilization > 100 && isDateRangeActionable() ? (
                          <button 
                            onClick={() => {
                              setSelectedPerson(person);
                              setShowReduceLoadModal(true);
                            }}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#dc2626',
                              color: 'white',
                              border: 'none',
                              cursor: 'pointer',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            🔻 Reduce Load
                          </button>
                        ) : person.utilization > 100 && !isDateRangeActionable() ? (
                          <span style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#e5e7eb',
                            color: '#6b7280',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            📊 Historical Data
                          </span>
                        ) : person.utilization < 70 && isDateRangeActionable() ? (
                          <button 
                            onClick={async () => {
                              // Calculate available capacity in the filtered timeframe
                              const availableCapacity = Math.max(0, 100 - person.utilization);
                              
                              if (availableCapacity <= 5) {
                                setModalNotification({
                                  type: 'warning',
                                  message: `${person.name} is nearly at full capacity (${person.utilization}%) for this timeframe (${filters.startDate || 'all'} to ${filters.endDate || 'all'}). Only ${availableCapacity.toFixed(1)}% capacity remains.`
                                });
                                return;
                              }
                              
                              // Inform about external assignments if they exist, but don't block
                              if (person.hasExternalConflicts && availableCapacity > 5) {
                                setShowConfirmation({
                                  show: true,
                                  message: `💡 Assignment Opportunity for ${person.name}:\n\nCurrent utilization in timeframe: ${person.utilization}%\nAvailable capacity: ${availableCapacity.toFixed(1)}%\n\nNote: ${person.name} has assignments outside this timeframe, but we can still add work within the ${availableCapacity.toFixed(1)}% available capacity.\n\nWould you like to see recommended assignments that fit this capacity?`,
                                  onConfirm: () => {
                                    setShowConfirmation({ show: false, message: '', onConfirm: () => {}, onCancel: () => {} });
                                    setSelectedPerson({
                                      ...person,
                                      availableCapacity: availableCapacity
                                    });
                                    setShowAddProjectsModal(true);
                                  },
                                  onCancel: () => {
                                    setShowConfirmation({ show: false, message: '', onConfirm: () => {}, onCancel: () => {} });
                                  }
                                });
                                return;
                              }
                              
                              setSelectedPerson({
                                ...person,
                                availableCapacity: availableCapacity
                              });
                              setShowAddProjectsModal(true);
                            }}
                            style={{
                              padding: '0.5rem 1rem',
                              backgroundColor: '#16a34a',
                              color: 'white',
                              border: 'none',
                              cursor: 'pointer',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '500',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            ➕ Add Projects
                          </button>
                        ) : person.utilization < 70 && !isDateRangeActionable() ? (
                          <span style={{
                            padding: '0.5rem 1rem',
                            backgroundColor: '#e5e7eb',
                            color: '#6b7280',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            📊 Historical Data
                          </span>
                        ) : null}
                      </div>
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
            <div className="metric">{gapsReport.summary?.project_gaps || 0}</div>
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
            <div className="metric">{gapsReport.summary?.unutilizedHours || 0} hours</div>
          </div>
        </div>

        <div className="charts-grid">
          <div className="chart-container">
            <h3>Gaps by Project</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gapsReport.projectHealth || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis 
                  dataKey="project_name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={120}
                  interval="preserveStartEnd"
                  tick={{ fontSize: 11 }}
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total_allocation_percentage" fill={CHART_COLORS[3]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3>Gaps by Role</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gapsReport.gapsByRole || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis 
                  dataKey="roleName" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  interval="preserveStartEnd"
                  tick={{ fontSize: 11 }}
                />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="gap" fill={CHART_COLORS[0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <h3>Gap Trend (Projected)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={(() => {
                // Generate a simple timeline based on current gaps data
                const currentGap = gapsReport?.totalGap || 0;
                const months = ['Current', '1 Month', '2 Months', '3 Months'];
                return months.map((month, index) => ({
                  period: month,
                  gap: Math.max(0, currentGap - (index * currentGap * 0.15)) // Show decreasing trend
                }));
              })()}>
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
                {(gapsReport.projectHealth || [])
                  .filter((project: any) => project.allocation_health === 'UNDER_ALLOCATED')
                  .map((project: any) => (
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
                {(gapsReport.projectHealth || []).filter((project: any) => project.allocation_health === 'UNDER_ALLOCATED').length === 0 && (
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

  // Reduce Load Modal Component
  const renderReduceLoadModal = () => {
    if (!showReduceLoadModal || !selectedPerson) return null;
    
    const recommendations = getProjectRemovalRecommendations(selectedPerson);
    
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
          position: 'relative',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>
                🔻 Reduce Load: {selectedPerson.person_name}
              </h2>
              {filters.startDate && filters.endDate && (
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  📅 Showing assignments for {filters.startDate} to {filters.endDate}
                  {getDateRangeContext() === 'past' && ' (Historical period - informational only)'}
                  {getDateRangeContext() === 'future' && ' (Future period)'}
                </p>
              )}
            </div>
            <button
              onClick={() => {setShowReduceLoadModal(false); setSelectedPerson(null);}}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                color: 'var(--text-secondary)',
                borderRadius: '6px'
              }}
            >
              <X size={20} />
            </button>
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
              <strong>{selectedPerson.name}</strong> is currently at <strong>{selectedPerson.utilization}% utilization</strong>. 
              Here are recommended projects to remove based on impact and removal ease:
            </p>
          </div>

          {recommendations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recommendations.map((assignment: any, index: number) => (
                <div key={assignment.id || index} style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                        {assignment.project_name || 'Project'}
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          📊 {Math.round((assignment.allocation_percentage || 0) * 40 / 100)}h/week • {assignment.impactLevel} Impact • 👤 {assignment.role_name || 'Role'}
                        </span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                          {assignment.notes || 'No description available'}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: assignment.removalScore > 50 ? '#dcfce7' : assignment.removalScore > 30 ? '#fef3c7' : '#fee2e2',
                        color: assignment.removalScore > 50 ? '#16a34a' : assignment.removalScore > 30 ? '#d97706' : '#dc2626'
                      }}>
                        {assignment.removalScore > 50 ? 'Easy to Remove' : assignment.removalScore > 30 ? 'Moderate' : 'Keep if Possible'}
                      </span>
                      <button
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                        onClick={async () => {
                          setShowConfirmation({
                            show: true,
                            message: `Are you sure you want to remove ${selectedPerson.name} from ${assignment.project_name}?`,
                            onConfirm: async () => {
                              setShowConfirmation({ show: false, message: '', onConfirm: () => {}, onCancel: () => {} });
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
                            },
                            onCancel: () => {
                              setShowConfirmation({ show: false, message: '', onConfirm: () => {}, onCancel: () => {} });
                            }
                          });
                        }}
                      >
                        <Minus size={14} style={{ marginRight: '0.25rem' }} />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>
              <p>No assignments found for this person in the selected period.</p>
              {filters.startDate && filters.endDate && (
                <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  This person may have assignments outside the date range ({filters.startDate} to {filters.endDate}).
                  Try expanding the date range to see all assignments.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Add Projects Modal Component
  const renderAddProjectsModal = () => {
    if (!showAddProjectsModal || !selectedPerson) return null;
    
    const recommendations = getProjectAdditionRecommendations(selectedPerson);
    
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          backgroundColor: 'var(--bg-secondary)',
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
          position: 'relative',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>
                ➕ Add Projects: {selectedPerson.person_name}
              </h2>
              {filters.startDate && filters.endDate && (
                <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  📅 Showing project recommendations for {filters.startDate} to {filters.endDate}
                  {getDateRangeContext() === 'past' && ' (Historical period)'}
                  {getDateRangeContext() === 'future' && ' (Future period)'}
                </p>
              )}
            </div>
            <button
              onClick={() => {setShowAddProjectsModal(false); setSelectedPerson(null);}}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                color: 'var(--text-secondary)',
                borderRadius: '6px'
              }}
            >
              <X size={20} />
            </button>
          </div>
          
          <div style={{ marginBottom: '1.5rem' }}>
            <p style={{ color: 'var(--text-secondary)', margin: '0 0 1rem 0' }}>
              <strong>{selectedPerson.name}</strong> has <strong>{selectedPerson.availableCapacity?.toFixed(1) || (100 - selectedPerson.utilization)?.toFixed(1)}% available capacity</strong> in this timeframe ({filters.startDate || 'all'} to {filters.endDate || 'all'}). 
              Here are recommended assignments that fit within this capacity:
            </p>
          </div>

          {recommendations.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recommendations.map((project: any, index: number) => (
                <div key={project.id || index} style={{
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                        {project.name || 'Project'}
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                          📊 ~{project.estimatedHours}h/week • {project.priority} Priority • 👤 {selectedPerson.role || 'Current Role'}
                        </span>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
                          {project.description || 'No description available'}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        backgroundColor: project.matchScore > 60 ? '#dcfce7' : project.matchScore > 40 ? '#fef3c7' : '#fee2e2',
                        color: project.matchScore > 60 ? '#16a34a' : project.matchScore > 40 ? '#d97706' : '#dc2626'
                      }}>
                        {project.matchScore > 60 ? 'Great Match' : project.matchScore > 40 ? 'Good Match' : 'Fair Match'}
                      </span>
                      <button
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#16a34a',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                        onClick={async () => {
                          // Calculate allocation percentage for confirmation
                          const allocationPercent = Math.min(100, Math.round(project.estimatedHours * 100 / 40));
                          const currentUtilization = selectedPerson.utilization || 0;
                          const availableCapacity = selectedPerson.availableCapacity || Math.max(0, 100 - currentUtilization);
                          const projectedUtilization = currentUtilization + allocationPercent;
                          const remainingCapacity = availableCapacity - allocationPercent;
                          
                          let confirmMessage = `💡 Gap-Filling Assignment: ${selectedPerson.person_name} → ${project.name}\n\n`;
                          confirmMessage += `📊 Capacity Analysis:\n`;
                          confirmMessage += `• Available capacity: ${availableCapacity.toFixed(1)}%\n`;
                          confirmMessage += `• Assignment allocation: ${allocationPercent}%\n`;
                          confirmMessage += `• Remaining capacity after: ${remainingCapacity.toFixed(1)}%\n\n`;
                          confirmMessage += `📅 Timeframe: ${filters.startDate || 'all'} to ${filters.endDate || 'all'}\n`;
                          confirmMessage += `⏱️ Estimated effort: ${project.estimatedHours || 'TBD'} hours\n\n`;
                          
                          if (remainingCapacity < 0) {
                            confirmMessage += `⚠️ This assignment slightly exceeds available capacity by ${Math.abs(remainingCapacity).toFixed(1)}%. `;
                            confirmMessage += `Consider reducing allocation or choosing a smaller project.\n\n`;
                          } else if (remainingCapacity > 20) {
                            confirmMessage += `✅ Great fit! This leaves ${remainingCapacity.toFixed(1)}% capacity for additional assignments.\n\n`;
                          } else {
                            confirmMessage += `✅ Good fit! This utilizes most available capacity efficiently.\n\n`;
                          }
                          
                          confirmMessage += `Proceed with this assignment?`;
                          
                          setShowConfirmation({
                            show: true,
                            message: confirmMessage,
                            onConfirm: async () => {
                              setShowConfirmation({ show: false, message: '', onConfirm: () => {}, onCancel: () => {} });
                              try {
                                // Get person's primary role - fallback to first available role if needed
                                let roleId = null;
                                if (selectedPerson.primary_role_id) {
                                  roleId = selectedPerson.primary_role_id;
                                } else if (roles && roles.length > 0) {
                                  roleId = roles[0].id; // Use first available role as fallback
                                } else {
                                  throw new Error('No roles available for assignment');
                                }
                                
                                // Create assignment with fixed dates and estimated hours as allocation
                                const startDate = project.aspiration_start || new Date().toISOString().split('T')[0];
                                const endDate = project.aspiration_finish || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                                
                                await api.assignments.create({
                                  project_id: project.id,
                                  person_id: selectedPerson.id,
                                  role_id: roleId,
                                  phase_id: null,
                                  assignment_date_mode: 'fixed', // Use fixed dates to avoid aspiration date issues
                                  start_date: startDate,
                                  end_date: endDate,
                                  allocation_percentage: Math.min(100, Math.round(project.estimatedHours * 100 / 40)), // Convert hours to percentage, cap at 100%
                                  notes: `Assigned via utilization report recommendation (Match Score: ${project.matchScore})`
                                });
                                
                                // Refresh all data
                                await refetchPersonAssignments();
                                await refetchAvailableProjects();
                                // Close modal and refresh main report
                                setShowAddProjectsModal(false);
                                await refetchUtilization();
                                
                                setModalNotification({
                                  type: 'success',
                                  message: `Successfully assigned ${selectedPerson.person_name} to ${project.name}`
                                });
                              } catch (error) {
                                console.error('Error creating assignment:', error);
                                
                                // Provide more specific error feedback
                                let errorMessage = 'Failed to create assignment. Please try again.';
                                
                                if (error.response?.status === 400 && error.response?.data?.conflicts) {
                                  // Handle capacity conflicts with detailed information
                                  const conflicts = error.response.data.conflicts;
                                  const allocationPercent = Math.min(100, Math.round(project.estimatedHours * 100 / 40));
                                  errorMessage = `Cannot assign ${selectedPerson.person_name} at ${allocationPercent}% allocation.\n\n` +
                                               `Current allocation: ${conflicts.total_allocation - allocationPercent}%\n` +
                                               `Requested allocation: ${allocationPercent}%\n` +
                                               `Total would be: ${conflicts.total_allocation}%\n` +
                                               `Available capacity: ${conflicts.available_capacity}%\n\n` +
                                               `Consider reducing the estimated hours for this project or choosing different dates.`;
                                } else if (error.response?.status === 400) {
                                  errorMessage = 'Assignment creation failed: Invalid assignment data. Please check capacity constraints.';
                                } else if (error.response?.status === 409) {
                                  errorMessage = 'Assignment creation failed: This would cause over-allocation. Please reduce hours or choose different dates.';
                                } else if (error.response?.data?.message) {
                                  errorMessage = `Assignment creation failed: ${error.response.data.message}`;
                                }
                                
                                setModalNotification({
                                  type: 'error',
                                  message: errorMessage
                                });
                              }
                            },
                            onCancel: () => {
                              setShowConfirmation({ show: false, message: '', onConfirm: () => {}, onCancel: () => {} });
                            }
                          });
                        }}
                      >
                        <Plus size={14} style={{ marginRight: '0.25rem' }} />
                        Assign
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>
              <p>No suitable projects found for assignment.</p>
              {filters.startDate && filters.endDate && (
                <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  This may be because no projects overlap with the selected date range ({filters.startDate} to {filters.endDate}).
                  Try expanding the date range or removing date filters to see more options.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

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

      {/* Modal Components */}
      {renderReduceLoadModal()}
      {renderAddProjectsModal()}
      
      {/* Notification Modal */}
      {modalNotification.type && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-primary)',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            maxWidth: '500px',
            width: '90%',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '1rem',
              color: modalNotification.type === 'success' ? '#16a34a' : 
                     modalNotification.type === 'error' ? '#dc2626' :
                     modalNotification.type === 'warning' ? '#d97706' : '#0ea5e9'
            }}>
              <span style={{ fontSize: '1.25rem', marginRight: '0.5rem' }}>
                {modalNotification.type === 'success' ? '✅' :
                 modalNotification.type === 'error' ? '❌' :
                 modalNotification.type === 'warning' ? '⚠️' : 'ℹ️'}
              </span>
              <h3 style={{ margin: 0 }}>
                {modalNotification.type === 'success' ? 'Success' :
                 modalNotification.type === 'error' ? 'Error' :
                 modalNotification.type === 'warning' ? 'Warning' : 'Information'}
              </h3>
            </div>
            <p style={{ 
              margin: '0 0 1.5rem 0', 
              color: 'var(--text-primary)',
              whiteSpace: 'pre-line' 
            }}>
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
        </div>
      )}
      
      {/* Confirmation Modal */}
      {showConfirmation.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-primary)',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            maxWidth: '500px',
            width: '90%',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '1rem',
              color: 'var(--text-primary)'
            }}>
              <span style={{ fontSize: '1.25rem', marginRight: '0.5rem' }}>❓</span>
              <h3 style={{ margin: 0 }}>Confirm Action</h3>
            </div>
            <p style={{ 
              margin: '0 0 1.5rem 0', 
              color: 'var(--text-primary)',
              whiteSpace: 'pre-line' 
            }}>
              {showConfirmation.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                onClick={showConfirmation.onCancel}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={showConfirmation.onConfirm}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'var(--primary-color)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}