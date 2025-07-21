import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';
import { api } from '../lib/api-client';
import { formatDate } from '../utils/date';

interface PersonAllocationChartProps {
  personId: string;
  personName: string;
}

interface AllocationData {
  date: string;
  totalAllocation: number;
  availability: number;
  capacity: number;
  utilization: number;
  projectBreakdown: { [projectName: string]: number };
}

export function PersonAllocationChart({ personId, personName }: PersonAllocationChartProps) {
  const { data: timelineData, isLoading, error } = useQuery({
    queryKey: ['person-timeline', personId],
    queryFn: async () => {
      const response = await api.assignments.getTimeline(personId);
      return response.data;
    }
  });

  // Process timeline data for chart
  const processedData = React.useMemo(() => {
    if (!timelineData || !timelineData.timeline) return [];

    const { assignments, availability_overrides } = timelineData.timeline;
    
    // Create date range from earliest to latest assignment
    const dates = new Set<string>();
    assignments.forEach((assignment: any) => {
      const start = new Date(assignment.start_date);
      const end = new Date(assignment.end_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.add(formatDate(d.toISOString()));
      }
    });

    // Convert to array and sort chronologically
    const sortedDates = Array.from(dates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    
    return sortedDates.map(date => {
      const currentDate = new Date(date);
      let totalAllocation = 0;
      const projectBreakdown: { [projectName: string]: number } = {};

      // Calculate allocations for this date
      assignments.forEach((assignment: any) => {
        const assignmentStart = new Date(assignment.start_date);
        const assignmentEnd = new Date(assignment.end_date);
        
        if (currentDate >= assignmentStart && currentDate <= assignmentEnd) {
          totalAllocation += assignment.allocation_percentage;
          projectBreakdown[assignment.project_name] = 
            (projectBreakdown[assignment.project_name] || 0) + assignment.allocation_percentage;
        }
      });

      // Calculate availability for this date
      let availability = 100; // Default availability
      availability_overrides.forEach((override: any) => {
        const overrideStart = new Date(override.start_date);
        const overrideEnd = new Date(override.end_date);
        
        if (currentDate >= overrideStart && currentDate <= overrideEnd) {
          availability = override.availability_percentage;
        }
      });

      return {
        date,
        totalAllocation,
        availability,
        capacity: availability,
        utilization: availability > 0 ? (totalAllocation / availability) * 100 : 0,
        projectBreakdown
      };
    });
  }, [timelineData]);

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

  // Get unique projects for legend
  const allProjects = [...new Set(processedData.flatMap(d => Object.keys(d.projectBreakdown)))];
  const projectColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3>Allocation vs Availability Over Time</h3>
        <p className="chart-subtitle">
          Showing {personName}'s allocation compared to availability
        </p>
      </div>
      
      <div className="chart-content">
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={processedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Legend />
            
            {/* Availability area */}
            <Area 
              type="monotone" 
              dataKey="availability" 
              stroke="#10b981" 
              fill="#10b981"
              fillOpacity={0.1}
              name="Available Capacity"
            />
            
            {/* Total allocation line */}
            <Line 
              type="monotone" 
              dataKey="totalAllocation" 
              stroke="#dc2626" 
              strokeWidth={3}
              name="Total Allocation"
              dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
            />
            
            {/* Utilization line */}
            <Line 
              type="monotone" 
              dataKey="utilization" 
              stroke="#f59e0b" 
              strokeWidth={2}
              name="Utilization %"
              strokeDasharray="5 5"
              dot={{ fill: '#f59e0b', strokeWidth: 1, r: 3 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="chart-summary">
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-value">
              {Math.max(...processedData.map(d => d.totalAllocation)).toFixed(1)}%
            </div>
            <div className="summary-label">Peak Allocation</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">
              {(processedData.reduce((sum, d) => sum + d.totalAllocation, 0) / processedData.length).toFixed(1)}%
            </div>
            <div className="summary-label">Average Allocation</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">
              {Math.max(...processedData.map(d => d.utilization)).toFixed(1)}%
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