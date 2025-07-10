import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api } from '../lib/api-client';
import { formatDate } from '../utils/date';

interface ProjectDemandChartProps {
  projectId: string;
  projectName: string;
}

interface DemandData {
  date: string;
  totalDemand: number;
  roleBreakdown: { [roleName: string]: number };
  phaseBreakdown: { [phaseName: string]: number };
}

export function ProjectDemandChart({ projectId, projectName }: ProjectDemandChartProps) {
  const { data: demandData, isLoading, error } = useQuery({
    queryKey: ['project-demand', projectId],
    queryFn: async () => {
      const response = await api.demands.getProjectDemands(projectId);
      return response.data;
    }
  });

  // Process demand data for chart
  const processedData = React.useMemo(() => {
    if (!demandData || !Array.isArray(demandData)) return [];

    // Group by date and calculate totals
    const dateGroups: { [date: string]: DemandData } = {};
    
    demandData.forEach((demand: any) => {
      const date = formatDate(demand.date);
      if (!dateGroups[date]) {
        dateGroups[date] = {
          date,
          totalDemand: 0,
          roleBreakdown: {},
          phaseBreakdown: {}
        };
      }
      
      dateGroups[date].totalDemand += demand.demand_percentage || 0;
      
      // Role breakdown
      if (demand.role_name) {
        dateGroups[date].roleBreakdown[demand.role_name] = 
          (dateGroups[date].roleBreakdown[demand.role_name] || 0) + (demand.demand_percentage || 0);
      }
      
      // Phase breakdown
      if (demand.phase_name) {
        dateGroups[date].phaseBreakdown[demand.phase_name] = 
          (dateGroups[date].phaseBreakdown[demand.phase_name] || 0) + (demand.demand_percentage || 0);
      }
    });

    return Object.values(dateGroups).sort((a, b) => a.date.localeCompare(b.date));
  }, [demandData]);

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

  // Get unique roles for legend
  const allRoles = [...new Set(processedData.flatMap(d => Object.keys(d.roleBreakdown)))];
  const roleColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1', '#d084d0'];

  return (
    <div className="chart-container">
      <div className="chart-header">
        <h3>Resource Demand Over Time</h3>
        <p className="chart-subtitle">
          Showing total resource demand and role breakdown for {projectName}
        </p>
      </div>
      
      <div className="chart-content">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={processedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis 
              label={{ value: 'Demand (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              formatter={(value: number, name: string) => [`${value}%`, name]}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Legend />
            
            {/* Total demand line */}
            <Line 
              type="monotone" 
              dataKey="totalDemand" 
              stroke="#2563eb" 
              strokeWidth={3}
              name="Total Demand"
              dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
            />
            
            {/* Role breakdown lines */}
            {allRoles.map((role, index) => (
              <Line 
                key={role}
                type="monotone" 
                dataKey={`roleBreakdown.${role}`}
                stroke={roleColors[index % roleColors.length]}
                strokeWidth={2}
                name={role}
                strokeDasharray="5 5"
                dot={{ fill: roleColors[index % roleColors.length], strokeWidth: 1, r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="chart-summary">
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-value">
              {Math.max(...processedData.map(d => d.totalDemand)).toFixed(1)}%
            </div>
            <div className="summary-label">Peak Demand</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">
              {(processedData.reduce((sum, d) => sum + d.totalDemand, 0) / processedData.length).toFixed(1)}%
            </div>
            <div className="summary-label">Average Demand</div>
          </div>
          <div className="summary-card">
            <div className="summary-value">{allRoles.length}</div>
            <div className="summary-label">Roles Involved</div>
          </div>
        </div>
      </div>
    </div>
  );
}