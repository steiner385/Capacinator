import React, { useRef, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceArea, BarChart, Bar } from 'recharts';
import { api } from '../lib/api-client';
import { formatDate } from '../utils/date';

interface ProjectDemandChartProps {
  projectId: string;
  projectName: string;
}

interface ChartDataPoint {
  date: string;
  timestamp: number;
  [roleName: string]: any;
}

interface PhaseInfo {
  id: string;
  phase_name: string;
  start_date: string;
  end_date: string;
  phase_order: number;
}

type ChartView = 'demand' | 'capacity' | 'gaps';

export function ProjectDemandChart({ projectId, projectName }: ProjectDemandChartProps) {
  // ALL HOOKS MUST BE CALLED FIRST - before any conditional logic or early returns
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartDimensions, setChartDimensions] = useState<{ width: number; left: number; right: number } | null>(null);
  const [currentView, setCurrentView] = useState<ChartView>('demand');
  
  const { data: apiResponse, isLoading, error } = useQuery({
    queryKey: ['project-demand', projectId],
    queryFn: async () => {
      const response = await api.demands.getProjectDemands(projectId);
      return response.data;
    }
  });

  // Get project assignments for capacity calculation
  const { data: assignmentsResponse, isLoading: assignmentsLoading } = useQuery({
    queryKey: ['project-assignments', projectId],
    queryFn: async () => {
      const response = await api.assignments.list({ project_id: projectId });
      return response.data;
    }
  });

  // Process data for all three views: demand, capacity, and gaps
  const { demandData, capacityData, gapsData, phases, dateRange } = React.useMemo(() => {
    if (!apiResponse || !apiResponse.phases || !Array.isArray(apiResponse.phases)) {
      return { 
        demandData: [], 
        capacityData: [], 
        gapsData: [], 
        phases: [], 
        dateRange: { start: new Date(), end: new Date() } 
      };
    }

    // Extract phase information for the roadmap overlay
    const phases: PhaseInfo[] = apiResponse.phases.map((phase: any) => ({
      id: phase.phase_id,
      phase_name: phase.phase_name,
      start_date: phase.start_date,
      end_date: phase.end_date,
      phase_order: phase.phase_order
    })).sort((a, b) => a.phase_order - b.phase_order);

    // Find the overall date range for the project
    const allDates = phases.flatMap(p => [new Date(p.start_date), new Date(p.end_date)]);
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    // Create daily data points across the entire project timeline
    const createEmptyTimeline = () => {
      const timeline: { [dateKey: string]: ChartDataPoint } = {};
      const currentDate = new Date(minDate);
      const maxDatePlusOne = new Date(maxDate);
      maxDatePlusOne.setDate(maxDatePlusOne.getDate() + 1);
      
      while (currentDate < maxDatePlusOne) {
        const dateKey = currentDate.toISOString().split('T')[0];
        timeline[dateKey] = {
          date: dateKey,
          timestamp: currentDate.getTime()
        };
        currentDate.setDate(currentDate.getDate() + 1);
      }
      return timeline;
    };

    // 1. DEMAND DATA - allocation percentages by role
    const demandTimeline = createEmptyTimeline();
    apiResponse.demands.forEach((demand: any) => {
      const phaseStart = new Date(demand.start_date);
      const phaseEnd = new Date(demand.end_date);
      const roleName = demand.role_name;
      const allocation = demand.allocation_percentage || 0;
      
      const currentDay = new Date(phaseStart);
      while (currentDay <= phaseEnd) {
        const dayKey = currentDay.toISOString().split('T')[0];
        if (demandTimeline[dayKey]) {
          if (!demandTimeline[dayKey][roleName]) {
            demandTimeline[dayKey][roleName] = 0;
          }
          demandTimeline[dayKey][roleName] += allocation;
        }
        currentDay.setDate(currentDay.getDate() + 1);
      }
    });

    // 2. CAPACITY DATA - calculate from project assignments
    const capacityTimeline = createEmptyTimeline();
    const uniqueRoles = [...new Set(apiResponse.demands.map((d: any) => d.role_name))];
    
    // Calculate capacity from people assigned to this specific project
    if (assignmentsResponse?.data && assignmentsResponse.data.length > 0) {
      assignmentsResponse.data.forEach((assignment: any) => {
        const assignmentStart = new Date(assignment.computed_start_date || assignment.start_date);
        const assignmentEnd = new Date(assignment.computed_end_date || assignment.end_date);
        const roleName = assignment.role_name;
        const allocationPercentage = assignment.allocation_percentage || 0;
        
        // Only include if role is relevant to demand data
        if (roleName && uniqueRoles.includes(roleName)) {
          // Apply allocation across assignment date range
          const currentDay = new Date(assignmentStart);
          while (currentDay <= assignmentEnd) {
            const dayKey = currentDay.toISOString().split('T')[0];
            if (capacityTimeline[dayKey]) {
              if (!capacityTimeline[dayKey][roleName]) {
                capacityTimeline[dayKey][roleName] = 0;
              }
              // Add this person's allocation percentage to the role's total capacity for this day
              capacityTimeline[dayKey][roleName] += allocationPercentage;
            }
            currentDay.setDate(currentDay.getDate() + 1);
          }
        }
      });
    } else {
      // No assignments found - show zero capacity for all roles
      // This makes it clear that there is no capacity assigned to this project
      Object.keys(capacityTimeline).forEach(dateKey => {
        uniqueRoles.forEach(roleName => {
          capacityTimeline[dateKey][roleName] = 0;
        });
      });
    }

    // 3. GAPS DATA - demand minus capacity (shortfalls)
    const gapsTimeline = createEmptyTimeline();
    Object.keys(gapsTimeline).forEach(dateKey => {
      const demandDay = demandTimeline[dateKey];
      const capacityDay = capacityTimeline[dateKey];
      
      // Calculate gaps for each role that has demand
      uniqueRoles.forEach(roleName => {
        const demand = demandDay[roleName] || 0;
        const capacity = capacityDay[roleName] || 0;
        const gap = demand - capacity;
        
        // Only show shortfalls (positive gaps) where demand exceeds capacity
        if (gap > 0) {
          gapsTimeline[dateKey][roleName] = gap;
        }
        // For negative gaps (surplus capacity), we don't show them in this view
        // as it represents resource availability, not shortage
      });
    });

    // Convert to arrays and sort by date
    const demandData = Object.values(demandTimeline).sort((a, b) => a.timestamp - b.timestamp);
    const capacityData = Object.values(capacityTimeline).sort((a, b) => a.timestamp - b.timestamp);
    const gapsData = Object.values(gapsTimeline).sort((a, b) => a.timestamp - b.timestamp);

    return {
      demandData,
      capacityData,
      gapsData,
      phases,
      dateRange: { start: minDate, end: maxDate }
    };
  }, [apiResponse, assignmentsResponse, currentView]);

  // Get current dataset based on view selection
  const currentData = React.useMemo(() => {
    switch (currentView) {
      case 'demand': return demandData;
      case 'capacity': return capacityData;
      case 'gaps': return gapsData;
      default: return demandData;
    }
  }, [currentView, demandData, capacityData, gapsData]);

  // Get unique roles for stacked areas
  const allRoles = React.useMemo(() => {
    return [...new Set(demandData.flatMap(d => 
      Object.keys(d).filter(key => 
        !['date', 'timestamp'].includes(key)
      )
    ))];
  }, [demandData]); // Use demandData to get all roles consistently

  // Measure chart dimensions after render for precise alignment
  useEffect(() => {
    if (!chartContainerRef.current || currentData.length === 0) return;
    
    const measureChart = () => {
      const container = chartContainerRef.current;
      if (!container) return;
      
      // Find the actual chart area (SVG) within the ResponsiveContainer
      const svg = container.querySelector('svg');
      if (!svg) return;
      
      // Find the actual plotting area by looking for X-axis ticks
      const xAxisGroup = svg.querySelector('.recharts-xAxis');
      const plotArea = svg.querySelector('.recharts-cartesian-grid');
      
      if (xAxisGroup && plotArea) {
        const containerRect = container.getBoundingClientRect();
        const plotRect = plotArea.getBoundingClientRect();
        
        // DEBUGGING: Inspect actual Recharts tick positions
        const ticks = xAxisGroup.querySelectorAll('.recharts-cartesian-axis-tick');
        console.log('🔍 RECHARTS TICK ANALYSIS:');
        console.log(`Found ${ticks.length} X-axis ticks`);
        
        ticks.forEach((tick, index) => {
          const tickRect = tick.getBoundingClientRect();
          const relativeX = tickRect.left - plotRect.left;
          const percentageX = (relativeX / plotRect.width) * 100;
          
          // Get the tick's text content (date)
          const textElement = tick.querySelector('text');
          const tickText = textElement ? textElement.textContent : 'N/A';
          
          console.log(`Tick ${index}: "${tickText}" at ${relativeX.toFixed(1)}px = ${percentageX.toFixed(1)}%`);
          
          // Compare with our calculated positions for key dates
          if (index === 0) {
            console.log(`  → First tick (should align with Business Planning start)`);
          } else if (index === ticks.length - 1) {
            console.log(`  → Last tick (should align with Cutover end)`);
          }
        });
        
        console.log(`Plot area: ${plotRect.width.toFixed(1)}px wide`);
        
        // Calculate precise positioning based on actual plot area
        setChartDimensions({
          width: plotRect.width,
          left: plotRect.left - containerRect.left,
          right: plotRect.right - containerRect.left
        });
        
        console.log('Chart dimensions measured:', {
          containerWidth: containerRect.width,
          plotWidth: plotRect.width,
          plotLeft: plotRect.left - containerRect.left,
          plotRight: plotRect.right - containerRect.left
        });
      }
    };
    
    // Measure after a longer delay to ensure Recharts is fully rendered
    const timer = setTimeout(measureChart, 500);
    
    // Also measure on resize
    window.addEventListener('resize', measureChart);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', measureChart);
    };
  }, [currentData]); // Re-measure when data changes
  
  const roleColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0', '#ff8c00', '#9932cc'];

  // Phase colors matching the roadmap component
  const phaseColors: Record<string, string> = {
    'pending': '#64748b',
    'business planning': '#3b82f6',
    'development': '#10b981',
    'system integration testing': '#f59e0b',
    'user acceptance testing': '#8b5cf6',
    'validation': '#ec4899',
    'cutover': '#ef4444',
    'hypercare': '#06b6d4',
    'support': '#84cc16'
  };


  // Calculate summary stats based on current view
  const { totalRoles, peakValue, avgValue, summaryLabels } = React.useMemo(() => {
    const totalRoles = allRoles.length;
    const peakValue = Math.max(...currentData.map(d => 
      allRoles.reduce((sum, role) => sum + (d[role] || 0), 0)
    ));
    const avgValue = currentData.length > 0 ? 
      currentData.reduce((sum, d) => 
        sum + allRoles.reduce((roleSum, role) => roleSum + (d[role] || 0), 0), 0
      ) / currentData.length : 0;

    // Dynamic labels based on current view
    const summaryLabels = {
      demand: { peak: 'Peak Daily Demand', avg: 'Average Daily Demand', title: 'Resource Demand Over Time' },
      capacity: { peak: 'Peak Available Capacity', avg: 'Average Available Capacity', title: 'Available Resource Capacity by Role' },
      gaps: { peak: 'Peak Resource Shortfall', avg: 'Average Resource Shortfall', title: 'Resource Capacity Gaps (Shortfalls)' }
    };

    return { totalRoles, peakValue, avgValue, summaryLabels: summaryLabels[currentView] };
  }, [currentData, allRoles, currentView]);

  // Loading state
  if (isLoading) {
    return <div>Loading demand data...</div>;
  }

  // Error state
  if (error) {
    return <div>Error loading demand data: {error.message}</div>;
  }

  // No data state
  if (!apiResponse) {
    return <div>No demand data available for this project.</div>;
  }

  return (
    <div className="chart-container">
      <div className="chart-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div>
            <h3>{summaryLabels.title}</h3>
            <p className="chart-subtitle">
              Showing {currentView} by role stacked over project timeline for {projectName}
            </p>
          </div>
          
          {/* View Toggle Buttons */}
          <div className="view-toggle" style={{
            display: 'flex',
            gap: '4px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            padding: '2px',
            backgroundColor: '#f8fafc'
          }}>
            {(['demand', 'capacity', 'gaps'] as const).map((view) => (
              <button
                key={view}
                onClick={() => setCurrentView(view)}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  backgroundColor: currentView === view ? '#3b82f6' : 'transparent',
                  color: currentView === view ? 'white' : '#64748b',
                  transition: 'all 0.2s ease'
                }}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Project Phase Timeline Chart - Separate chart above demand chart */}
      {phases.length > 0 && (
        <div className="phase-timeline-container" style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#374151' }}>
            Project Phase Timeline
          </h4>
          <ResponsiveContainer width="100%" height={80}>
            <BarChart
              data={currentData}
              margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
            >
              <XAxis 
                dataKey="date"
                type="category"
                scale="point"
                axisLine={false}
                tickLine={false}
                tick={false} // Hide X-axis labels for cleaner look
              />
              <YAxis 
                tick={false}
                axisLine={false}
                tickLine={false}
                width={60} // Reserve same space as demand chart Y-axis
              />
              
              {/* Phase bars using ReferenceArea - perfectly aligned */}
              {phases.map((phase, index) => {
                const phaseColor = phaseColors[phase.phase_name?.toLowerCase() || ''] || 
                                  `hsl(${index * 45 + 200}, 65%, 55%)`;
                
                return (
                  <ReferenceArea
                    key={`phase-timeline-${phase.id}`}
                    x1={phase.start_date}
                    x2={phase.end_date}
                    fill={phaseColor}
                    fillOpacity={0.8}
                    stroke={phaseColor}
                    strokeWidth={1}
                    label={{
                      value: phase.phase_name,
                      position: 'center',
                      fontSize: 11,
                      fill: 'white',
                      fontWeight: 'bold',
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                    }}
                  />
                );
              })}
              
              {/* Invisible bar to establish the chart structure */}
              <Bar dataKey={() => 1} fill="transparent" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      
      <div className="chart-content" ref={chartContainerRef}>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart 
            data={currentData} 
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date"
              type="category"
              scale="point"
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }}
              angle={-45}
              textAnchor="end"
              height={80}
              fontSize={11}
              interval="preserveStartEnd"
            />
            <YAxis 
              label={{ value: 'Allocation (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value: number, name: string) => [`${value?.toFixed(1)}%`, name]}
              labelFormatter={(label) => `Date: ${formatDate(label as string)}`}
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #ccc', 
                borderRadius: '4px' 
              }}
            />
            <Legend />
            
            {/* Stacked areas for each role */}
            {allRoles.map((role, index) => (
              <Area 
                key={role}
                dataKey={role}
                stackId="demand"
                stroke={roleColors[index % roleColors.length]}
                fill={roleColors[index % roleColors.length]}
                name={role}
                connectNulls={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="chart-summary">
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-value">
              {peakValue.toFixed(1)}%
            </div>
            <div className="summary-label">{summaryLabels.peak}</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">
              {avgValue.toFixed(1)}%
            </div>
            <div className="summary-label">{summaryLabels.avg}</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{totalRoles}</div>
            <div className="summary-label">Roles Involved</div>
          </div>
        </div>
      </div>
    </div>
  );
}