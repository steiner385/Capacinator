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

export function ProjectDemandChart({ projectId, projectName }: ProjectDemandChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartDimensions, setChartDimensions] = useState<{ width: number; left: number; right: number } | null>(null);
  
  const { data: apiResponse, isLoading, error } = useQuery({
    queryKey: ['project-demand', projectId],
    queryFn: async () => {
      const response = await api.demands.getProjectDemands(projectId);
      return response.data;
    }
  });

  // Process demand data for time-based stacked area chart
  const { processedData, phases, dateRange } = React.useMemo(() => {
    if (!apiResponse || !apiResponse.phases || !Array.isArray(apiResponse.phases)) {
      return { processedData: [], phases: [], dateRange: { start: new Date(), end: new Date() } };
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
    const dailyData: { [dateKey: string]: ChartDataPoint } = {};
    
    // Generate all days in the project timeline
    const currentDate = new Date(minDate);
    const maxDatePlusOne = new Date(maxDate);
    maxDatePlusOne.setDate(maxDatePlusOne.getDate() + 1);
    
    while (currentDate < maxDatePlusOne) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dailyData[dateKey] = {
        date: dateKey,
        timestamp: currentDate.getTime()
      };
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // For each demand, distribute its allocation across the phase duration
    apiResponse.demands.forEach((demand: any) => {
      const phaseStart = new Date(demand.start_date);
      const phaseEnd = new Date(demand.end_date);
      const roleName = demand.role_name;
      const allocation = demand.allocation_percentage || 0;
      
      // Distribute allocation across each day in the phase
      const currentDay = new Date(phaseStart);
      while (currentDay <= phaseEnd) {
        const dayKey = currentDay.toISOString().split('T')[0];
        if (dailyData[dayKey]) {
          if (!dailyData[dayKey][roleName]) {
            dailyData[dayKey][roleName] = 0;
          }
          dailyData[dayKey][roleName] += allocation;
        }
        currentDay.setDate(currentDay.getDate() + 1);
      }
    });

    // Convert to array and sort by date
    const chartData = Object.values(dailyData).sort((a, b) => a.timestamp - b.timestamp);

    return {
      processedData: chartData,
      phases,
      dateRange: { start: minDate, end: maxDate }
    };
  }, [apiResponse]);

  // Get unique roles for stacked areas - moved before early returns to fix hooks rule
  const allRoles = React.useMemo(() => {
    return [...new Set(processedData.flatMap(d => 
      Object.keys(d).filter(key => 
        !['date', 'timestamp'].includes(key)
      )
    ))];
  }, [processedData]);

  // Measure chart dimensions after render for precise alignment
  useEffect(() => {
    if (!chartContainerRef.current || processedData.length === 0) return;
    
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
  }, [processedData]); // Re-measure when data changes

  if (isLoading) {
    return (
      <div className="chart-container">
        <div className="chart-loading">Loading demand data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chart-container">
        <div className="chart-error">Failed to load demand data</div>
      </div>
    );
  }

  if (!processedData || processedData.length === 0) {
    return (
      <div className="chart-container">
        <div className="chart-empty">No demand data available</div>
      </div>
    );
  }
  
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


  // Calculate summary stats
  const totalRoles = allRoles.length;
  const peakDemand = Math.max(...processedData.map(d => 
    allRoles.reduce((sum, role) => sum + (d[role] || 0), 0)
  ));
  const avgDemand = processedData.length > 0 ? 
    processedData.reduce((sum, d) => 
      sum + allRoles.reduce((roleSum, role) => roleSum + (d[role] || 0), 0), 0
    ) / processedData.length : 0;

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3>Resource Demand Over Time</h3>
        <p className="chart-subtitle">
          Showing role allocation stacked over project timeline for {projectName}
        </p>
      </div>

      {/* Project Phase Timeline Chart - Separate chart above demand chart */}
      {phases.length > 0 && (
        <div className="phase-timeline-container" style={{ marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#374151' }}>
            Project Phase Timeline
          </h4>
          <ResponsiveContainer width="100%" height={80}>
            <BarChart
              data={processedData}
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
            data={processedData} 
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
              {peakDemand.toFixed(1)}%
            </div>
            <div className="summary-label">Peak Daily Demand</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">
              {avgDemand.toFixed(1)}%
            </div>
            <div className="summary-label">Average Daily Demand</div>
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