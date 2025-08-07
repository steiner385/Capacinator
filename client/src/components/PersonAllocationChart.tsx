import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart, Brush, ReferenceLine } from 'recharts';
import { api } from '../lib/api-client';
import { formatDate } from '../utils/date';

interface PersonAllocationChartProps {
  personId: string;
  personName: string;
  startDate?: string;
  endDate?: string;
}

interface AllocationData {
  date: string;
  totalAllocation: number;
  availability: number;
  capacity: number;
  utilization: number;
  projectBreakdown: { [projectName: string]: number };
}

export function PersonAllocationChart({ personId, personName, startDate, endDate }: PersonAllocationChartProps) {
  const [zoomLevel, setZoomLevel] = React.useState<'full' | 'half' | 'quarter'>('full');
  const { data: timelineData, isLoading, error } = useQuery({
    queryKey: ['person-timeline', personId],
    queryFn: async () => {
      const response = await api.assignments.getTimeline(personId);
      return response.data;
    }
  });

  // Fetch utilization timeline to get consistent date range
  const { data: utilizationData } = useQuery({
    queryKey: ['person-utilization-timeline', personId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      const response = await fetch(`/api/people/${personId}/utilization-timeline?${params}`);
      return response.json();
    },
    enabled: !!personId
  });

  // Determine appropriate granularity based on date range
  const getGranularity = (startMonth: string, endMonth: string) => {
    const start = new Date(startMonth + '-01');
    const end = new Date(endMonth + '-01');
    const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1;
    
    if (monthsDiff <= 3) return 'daily';     // 3 months or less: daily
    if (monthsDiff <= 12) return 'weekly';   // 4-12 months: weekly
    if (monthsDiff <= 24) return 'monthly';  // 13-24 months: monthly
    return 'quarterly';                      // > 24 months: quarterly
  };

  // Generate date points based on granularity
  const generateDatePoints = (startMonth: string, endMonth: string, granularity: string) => {
    const start = new Date(startMonth + '-01');
    const end = new Date(endMonth + '-01');
    end.setMonth(end.getMonth() + 1, 0); // Last day of end month
    
    const points: string[] = [];
    const current = new Date(start);
    
    if (granularity === 'weekly') {
      // Start from the beginning of the week containing the start date
      const startOfWeek = new Date(current);
      startOfWeek.setDate(current.getDate() - current.getDay()); // Go to Sunday
      
      current.setTime(startOfWeek.getTime());
      
      while (current <= end) {
        points.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 7); // Add 7 days for weekly
      }
    } else if (granularity === 'daily') {
      while (current <= end) {
        points.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
    } else { // monthly or quarterly
      while (current <= end) {
        const year = current.getFullYear();
        const month = (current.getMonth() + 1).toString().padStart(2, '0');
        points.push(`${year}-${month}`);
        
        if (granularity === 'quarterly') {
          current.setMonth(current.getMonth() + 3);
        } else {
          current.setMonth(current.getMonth() + 1);
        }
      }
    }
    
    return points.sort();
  };

  // Process timeline data for chart - MOVED BEFORE CONDITIONAL RETURNS
  const processedData = React.useMemo(() => {
    if (!timelineData?.timeline || !utilizationData?.timeline) return [];

    const { assignments, availability_overrides } = timelineData.timeline;
    
    // Get date range from utilization data
    const utilizationMonths = utilizationData.timeline.map((item: any) => item.month);
    const sortedMonths = utilizationMonths.sort((a: string, b: string) => a.localeCompare(b));
    
    if (sortedMonths.length === 0) return [];
    
    const startMonth = sortedMonths[0];
    const endMonth = sortedMonths[sortedMonths.length - 1];
    const granularity = getGranularity(startMonth, endMonth);
    const datePoints = generateDatePoints(startMonth, endMonth, granularity);
    
    return datePoints.map(datePoint => {
      let periodStart: Date;
      let periodEnd: Date;
      let displayDate: string;
      
      if (granularity === 'weekly' || granularity === 'daily') {
        const pointDate = new Date(datePoint);
        if (granularity === 'weekly') {
          // Week period: from this Sunday to next Saturday
          periodStart = new Date(pointDate);
          periodEnd = new Date(pointDate);
          periodEnd.setDate(periodEnd.getDate() + 6);
          displayDate = datePoint; // Use ISO date for weekly
        } else {
          // Daily period: just this day
          periodStart = new Date(pointDate);
          periodEnd = new Date(pointDate);
          displayDate = datePoint; // Use ISO date for daily
        }
      } else {
        // Monthly or quarterly
        const [year, monthNum] = datePoint.split('-').map(Number);
        periodStart = new Date(year, monthNum - 1, 1);
        if (granularity === 'quarterly') {
          periodEnd = new Date(year, monthNum - 1 + 3, 0); // Last day of quarter
        } else {
          periodEnd = new Date(year, monthNum, 0); // Last day of month
        }
        displayDate = datePoint; // Use YYYY-MM format
      }
      
      let totalAllocation = 0;
      const projectBreakdown: { [projectName: string]: number } = {};

      // Calculate allocations for this period
      assignments.forEach((assignment: any) => {
        const assignmentStart = new Date(assignment.start_date);
        const assignmentEnd = new Date(assignment.end_date);
        
        // Check if assignment overlaps with this period
        if (assignmentStart <= periodEnd && assignmentEnd >= periodStart) {
          totalAllocation += assignment.allocation_percentage;
          projectBreakdown[assignment.project_name] = 
            (projectBreakdown[assignment.project_name] || 0) + assignment.allocation_percentage;
        }
      });

      // Calculate availability for this period
      let availability = 100; // Default availability
      availability_overrides.forEach((override: any) => {
        const overrideStart = new Date(override.start_date);
        const overrideEnd = new Date(override.end_date);
        
        // Check if override overlaps with this period
        if (overrideStart <= periodEnd && overrideEnd >= periodStart) {
          availability = override.availability_percentage;
        }
      });

      // Create individual project data keys for stacked areas
      const projectData: { [key: string]: number } = {};
      Object.entries(projectBreakdown).forEach(([project, allocation]) => {
        projectData[`project_${project}`] = allocation as number;
      });

      return {
        date: displayDate,
        granularity,
        totalAllocation,
        availability,
        capacity: availability,
        utilization: availability > 0 ? (totalAllocation / availability) * 100 : 0,
        projectBreakdown,
        ...projectData // Spread individual project allocations as separate keys
      };
    });
  }, [timelineData, utilizationData, startDate, endDate]);

  // Validate data structure and apply zoom filtering - MOVED BEFORE CONDITIONAL RETURNS
  const validData = React.useMemo(() => {
    if (!processedData || processedData.length === 0) return [];
    
    return processedData.filter(d => {
      const isValid = d && 
                     d.date && 
                     typeof d.totalAllocation === 'number' &&
                     typeof d.availability === 'number' &&
                     !isNaN(d.totalAllocation) &&
                     !isNaN(d.availability);
      return isValid;
    });
  }, [processedData]);

  // Apply zoom filtering
  const zoomedData = React.useMemo(() => {
    if (zoomLevel === 'full') return validData;
    
    const totalMonths = validData.length;
    if (totalMonths === 0) return validData;
    
    if (zoomLevel === 'half') {
      // Show last 50% of data (minimum 4 data points)
      const startIndex = Math.max(0, totalMonths - Math.max(4, Math.floor(totalMonths / 2)));
      return validData.slice(startIndex);
    } else if (zoomLevel === 'quarter') {
      // Show last 25% of data (minimum 2 data points)  
      const startIndex = Math.max(0, totalMonths - Math.max(2, Math.floor(totalMonths / 4)));
      return validData.slice(startIndex);
    }
    
    return validData;
  }, [validData, zoomLevel]);

  // Get unique projects for legend
  const allProjects = React.useMemo(() => {
    return [...new Set(zoomedData.flatMap(d => Object.keys(d.projectBreakdown)))];
  }, [zoomedData]);

  if (isLoading) {
    return (
      <div className="chart-container">
        <div className="chart-loading">Loading allocation data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chart-container">
        <div className="chart-error">Failed to load allocation data</div>
      </div>
    );
  }

  if (!processedData || processedData.length === 0) {
    return (
      <div className="chart-container">
        <div className="chart-empty">No allocation data available</div>
      </div>
    );
  }

  if (validData.length === 0) {
    return (
      <div className="chart-container">
        <div className="chart-empty">Invalid allocation data format</div>
      </div>
    );
  }

  const projectColors = [
    '#3b82f6', // Blue
    '#10b981', // Emerald 
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#f97316', // Orange
    '#ec4899', // Pink
    '#6b7280'  // Gray
  ];

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3>Allocation vs Availability Over Time</h3>
        <p className="chart-subtitle">
          Showing {personName}'s project allocations stacked over time compared to availability
        </p>
      </div>
      
      <div className="chart-controls" style={{ marginBottom: '10px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button 
          onClick={() => setZoomLevel('full')}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            backgroundColor: zoomLevel === 'full' ? 'var(--primary)' : 'var(--bg-secondary)',
            color: zoomLevel === 'full' ? 'white' : 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Full View
        </button>
        <button 
          onClick={() => setZoomLevel('half')}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            backgroundColor: zoomLevel === 'half' ? 'var(--primary)' : 'var(--bg-secondary)',
            color: zoomLevel === 'half' ? 'white' : 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Last 4 Months
        </button>
        <button 
          onClick={() => setZoomLevel('quarter')}
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            backgroundColor: zoomLevel === 'quarter' ? 'var(--primary)' : 'var(--bg-secondary)',
            color: zoomLevel === 'quarter' ? 'white' : 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Last 2 Months
        </button>
      </div>
      
      <div className="chart-content">
        <ResponsiveContainer width="100%" height={450}>
          <AreaChart 
            data={zoomedData} 
            margin={{ top: 5, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              angle={-45}
              textAnchor="end"
              height={80}
              interval="preserveStartEnd"
              tick={{ fontSize: 12 }}
              tickFormatter={(value, index) => {
                // Find the data point by value instead of index for more reliability
                const dataPoint = zoomedData.find(d => d.date === value) || zoomedData[0];
                if (!dataPoint) return value;
                
                const granularity = dataPoint.granularity;
                
                if (granularity === 'weekly') {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                } else if (granularity === 'daily') {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                } else if (granularity === 'monthly') {
                  const date = new Date(value + '-01');
                  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                } else { // quarterly
                  const date = new Date(value + '-01');
                  return 'Q' + Math.ceil(date.getMonth() / 3 + 1) + ' ' + date.getFullYear().toString().slice(-2);
                }
              }}
            />
            <YAxis 
              label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }}
              domain={[0, 'dataMax']}
            />
            <Tooltip 
              formatter={(value: number, name: string) => {
                if (name === 'Available Capacity') {
                  return [`${value.toFixed(1)}%`, name];
                }
                return [`${value.toFixed(1)}%`, name];
              }}
              labelFormatter={(label) => {
                const dataPoint = zoomedData.find(d => d.date === label);
                if (!dataPoint) return label;
                
                const granularity = dataPoint.granularity;
                
                if (granularity === 'weekly') {
                  const startDate = new Date(label);
                  const endDate = new Date(startDate);
                  endDate.setDate(endDate.getDate() + 6);
                  return `Week: ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                } else if (granularity === 'daily') {
                  const date = new Date(label);
                  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
                } else if (granularity === 'monthly') {
                  const date = new Date(label + '-01');
                  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                } else { // quarterly
                  const date = new Date(label + '-01');
                  const quarter = Math.ceil((date.getMonth() + 1) / 3);
                  return `Q${quarter} ${date.getFullYear()}`;
                }
              }}
              content={({ active, payload, label }) => {
                if (!active || !payload) return null;
                
                const data = payload[0]?.payload;
                if (!data) return null;
                
                const dataPoint = zoomedData.find(d => d.date === label);
                const granularity = dataPoint?.granularity || 'monthly';
                
                let formattedPeriod = '';
                if (granularity === 'weekly') {
                  const startDate = new Date(label);
                  const endDate = new Date(startDate);
                  endDate.setDate(endDate.getDate() + 6);
                  formattedPeriod = `Week: ${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                } else if (granularity === 'daily') {
                  formattedPeriod = `Day: ${new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                } else if (granularity === 'monthly') {
                  formattedPeriod = `Month: ${new Date(label + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
                } else {
                  const date = new Date(label + '-01');
                  const quarter = Math.ceil((date.getMonth() + 1) / 3);
                  formattedPeriod = `Quarter: Q${quarter} ${date.getFullYear()}`;
                }
                
                return (
                  <div className="custom-tooltip">
                    <p className="tooltip-title">{formattedPeriod}</p>
                    <p className="tooltip-capacity">{`Available: ${data.availability.toFixed(1)}%`}</p>
                    <p className="tooltip-total">{`Total Allocation: ${data.totalAllocation.toFixed(1)}%`}</p>
                    <div className="tooltip-projects">
                      {Object.entries(data.projectBreakdown).map(([project, allocation]: [string, any]) => (
                        <p key={project} className="tooltip-project">
                          {`${project}: ${allocation.toFixed(1)}%`}
                        </p>
                      ))}
                    </div>
                    {data.totalAllocation > data.availability && (
                      <p className="tooltip-warning">⚠️ Over-allocated by {(data.totalAllocation - data.availability).toFixed(1)}%</p>
                    )}
                  </div>
                );
              }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              content={({ payload }) => {
                if (!payload) return null;
                
                return (
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    justifyContent: 'center', 
                    gap: '20px',
                    fontSize: '14px'
                  }}>
                    {payload.map((entry, index) => {
                      const isCapacity = entry.value === 'Available Capacity';
                      return (
                        <div key={index} style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px' 
                        }}>
                          {isCapacity ? (
                            <div style={{
                              width: '16px',
                              height: '3px',
                              backgroundColor: entry.color,
                              border: `2px dashed ${entry.color}`,
                              borderRadius: '1px'
                            }} />
                          ) : (
                            <div style={{
                              width: '12px',
                              height: '12px',
                              backgroundColor: entry.color,
                              borderRadius: '2px'
                            }} />
                          )}
                          <span style={{ 
                            color: 'var(--text-primary)', 
                            fontWeight: 500 
                          }}>
                            {entry.value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              }}
            />
            
            {/* Available capacity area - shown at the back with distinct styling */}
            <Area 
              type="monotone" 
              dataKey="availability" 
              stroke="#10b981" 
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="transparent"
              name="Available Capacity"
              stackId="capacity"
            />
            
            {/* Stacked project allocations */}
            {allProjects.map((project, index) => (
              <Area
                key={project}
                type="monotone"
                dataKey={`project_${project}`}
                stackId="allocation"
                stroke={projectColors[index % projectColors.length]}
                fill={projectColors[index % projectColors.length]}
                fillOpacity={0.8}
                name={project}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="chart-summary">
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-value">
              {Math.max(...zoomedData.map(d => d.totalAllocation)).toFixed(1)}%
            </div>
            <div className="summary-label">Peak Allocation</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">
              {(zoomedData.reduce((sum, d) => sum + d.totalAllocation, 0) / zoomedData.length).toFixed(1)}%
            </div>
            <div className="summary-label">Average Allocation</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">
              {Math.max(...zoomedData.map(d => d.utilization)).toFixed(1)}%
            </div>
            <div className="summary-label">Peak Utilization</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{allProjects.length}</div>
            <div className="summary-label">Active Projects</div>
          </div>
        </div>
      </div>
      
      {/* Project breakdown */}
      {allProjects.length > 0 && (
        <div className="chart-breakdown">
          <h4>Project Breakdown</h4>
          <div className="breakdown-legend">
            {allProjects.map((project, index) => (
              <div key={project} className="breakdown-item">
                <div 
                  className="breakdown-color" 
                  style={{ backgroundColor: projectColors[index % projectColors.length] }}
                />
                <span className="breakdown-label">{project}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}