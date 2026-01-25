import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FolderKanban,
  AlertTriangle,
  TrendingUp,
  UserCheck,
  UserX,
  Activity,
  Briefcase,
} from 'lucide-react';
import { api } from '../lib/api-client';
import { queryKeys } from '../lib/queryKeys';
import { useScenario } from '../contexts/ScenarioContext';
import { DashboardSummary } from '../types';
import { Card } from '../components/ui/CustomCard';
import { StatCard } from '../components/ui/StatCard';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CriticalAlertsPanel } from '../components/dashboard/CriticalAlertsPanel';
import { DateRangeSelector, DateRangePreset } from '../components/dashboard/DateRangeSelector';
import { EnhancedKPIs } from '../components/dashboard/EnhancedKPIs';
import { useCriticalAlerts } from '../hooks/useCriticalAlerts';
import './Dashboard.css';

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
};

export function Dashboard() {
  const navigate = useNavigate();
  const { currentScenario } = useScenario();
  
  // Date range state for time-based filtering
  const [dateRange, setDateRange] = React.useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    preset: 'current' as DateRangePreset
  });
  
  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: queryKeys.dashboard.summary(currentScenario?.id, dateRange),
    queryFn: async () => {
      const response = await api.reporting.getDashboard();
      // Handle the nested response structure: response.data.data
      return response.data.data as DashboardSummary;
    },
    enabled: !!currentScenario
  });

  const { alerts, hasAlerts } = useCriticalAlerts();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="Failed to load dashboard data" />;
  if (!dashboard) return null;

  // Prepare data for charts with defensive checks
  const projectHealthData = dashboard.projectHealth && Object.keys(dashboard.projectHealth).length > 0
    ? Object.entries(dashboard.projectHealth).map(([status, count]) => ({
        name: status.replace('_', ' '),
        value: count,
      }))
    : [{ name: 'No Projects', value: 0 }];

  // Handle empty utilization data gracefully
  const utilizationData = dashboard.utilization && Object.keys(dashboard.utilization).length > 0 
    ? Object.entries(dashboard.utilization).map(([status, count]) => ({
        name: status === 'NO_ASSIGNMENTS' ? 'No Assignments Yet' : status.replace(/_/g, ' '),
        value: count,
      }))
    : [{ name: 'No Data', value: 0 }];

  const capacityData = dashboard.capacityGaps && Object.keys(dashboard.capacityGaps).length > 0
    ? Object.entries(dashboard.capacityGaps).map(([status, count]) => ({
        name: status,
        value: count,
        color: status === 'GAP' ? COLORS.danger : status === 'TIGHT' ? COLORS.warning : COLORS.success,
      }))
    : [{ name: 'No Data', value: 0, color: COLORS.primary }];

  return (
    <div className="page-container">
      <header className="page-header" role="banner">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">Overview of your project capacity planning</p>
        </div>
      </header>

      {/* Date Range Filter */}
      <div className="dashboard-filter-bar">
        <DateRangeSelector
          selectedRange={dateRange}
          onRangeChange={setDateRange}
        />
      </div>

      {/* Critical Alerts Panel */}
      {hasAlerts && (
        <section className="mb-6" role="region" aria-labelledby="alerts-heading">
          <h2 id="alerts-heading" className="sr-only">Critical Alerts and Notifications</h2>
          <CriticalAlertsPanel alerts={alerts} />
        </section>
      )}

      <section className="stats-grid" role="region" aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">Key Metrics Overview</h2>
        <StatCard
          title="Current Projects"
          value={dashboard.summary.projects}
          icon={FolderKanban}
          color="primary"
          onClick={() => navigate('/projects')}
          aria-label={`${dashboard.summary.projects} current projects. Click to view all projects.`}
        />
        <StatCard
          title="Total People"
          value={dashboard.summary.people}
          icon={Users}
          color="success"
          onClick={() => navigate('/people')}
          aria-label={`${dashboard.summary.people} total people. Click to view people directory.`}
        />
        <StatCard
          title="Total Roles"
          value={dashboard.summary.roles}
          icon={Briefcase}
          color="purple"
          onClick={() => navigate('/people')}
          aria-label={`${dashboard.summary.roles} total roles defined. Click to view people and roles.`}
        />
        <StatCard
          title="Capacity Gaps"
          value={dashboard.capacityGaps?.GAP || 0}
          icon={AlertTriangle}
          color="danger"
          onClick={() => navigate('/reports')}
          aria-label={`${dashboard.capacityGaps?.GAP || 0} capacity gaps detected. Click to view detailed reports.`}
        />
      </section>

      {/* Enhanced KPIs Section */}
      <EnhancedKPIs dashboard={dashboard} className="mb-6" />

      <div className="charts-grid" role="region" aria-labelledby="charts-heading">
        <h2 id="charts-heading" className="sr-only">Dashboard Charts and Analytics</h2>
        <Card 
          title="Current Project Health"
          onClick={() => navigate('/projects')}
        >
          <div 
            className="chart-container" 
            role="img" 
            aria-label={`Project health breakdown: ${projectHealthData.map(item => `${item.name} ${item.value} projects`).join(', ')}. Click to view all projects.`}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/projects');
              }
            }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={projectHealthData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  onClick={() => navigate('/projects')}
                  style={{ cursor: 'pointer' }}
                >
                  {projectHealthData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.name.includes('OVERDUE') ? COLORS.danger :
                        entry.name.includes('ACTIVE') ? COLORS.success :
                        entry.name.includes('PLANNING') ? COLORS.warning :
                        COLORS.primary
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card 
          title="Resource Utilization"
          onClick={() => navigate('/people')}
        >
          <div 
            className="chart-container" 
            role="img" 
            aria-label={`Resource utilization breakdown: ${utilizationData.map(item => `${item.name} ${item.value} people`).join(', ')}. Click to view people directory.`}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate('/people');
              }
            }}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={utilizationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar 
                  dataKey="value" 
                  fill={COLORS.primary}
                  onClick={() => navigate('/people')}
                  style={{ cursor: 'pointer' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card 
          title="Capacity Status by Role"
          onClick={() => navigate('/reports')}
        >
          <div 
            className="capacity-summary" 
            role="list"
            aria-label="Capacity status breakdown by role type"
          >
            {capacityData.map((item) => (
              <div 
                key={item.name} 
                className="capacity-item capacity-item-clickable"
                role="listitem"
                tabIndex={0}
                aria-label={`${item.name} status: ${item.value} roles. Click to view detailed reports.`}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/reports');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/reports');
                  }
                }}
              >
                <div className="capacity-label">
                  <span 
                    className="capacity-status" 
                    style={{ backgroundColor: item.color }}
                    role="img"
                    aria-label={`Status indicator for ${item.name}`}
                  ></span>
                  <span>{item.name}</span>
                </div>
                <span className="capacity-value">{item.value} roles</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Quick Stats">
          <div className="quick-stats" role="list" aria-label="Quick availability and utilization statistics">
            <div 
              className="stat-item stat-item-clickable" 
              role="listitem"
              tabIndex={0}
              aria-label={`${dashboard.availability?.AVAILABLE || 0} people available. Click to view people directory.`}
              onClick={() => navigate('/people')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate('/people');
                }
              }}
            >
              <UserCheck className="stat-icon" color={COLORS.success} aria-hidden="true" />
              <div>
                <div className="stat-value">{dashboard.availability?.AVAILABLE || 0}</div>
                <div className="stat-label">Available</div>
              </div>
            </div>
            <div 
              className="stat-item stat-item-clickable" 
              role="listitem"
              tabIndex={0}
              aria-label={`${dashboard.availability?.UNAVAILABLE || 0} people on leave. Click to view people directory.`}
              onClick={() => navigate('/people')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate('/people');
                }
              }}
            >
              <UserX className="stat-icon" color={COLORS.danger} aria-hidden="true" />
              <div>
                <div className="stat-value">{dashboard.availability?.UNAVAILABLE || 0}</div>
                <div className="stat-label">On Leave</div>
              </div>
            </div>
            <div 
              className="stat-item stat-item-clickable" 
              role="listitem"
              tabIndex={0}
              aria-label={`${dashboard.availability?.LIMITED || 0} people with limited capacity. Click to view people directory.`}
              onClick={() => navigate('/people')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate('/people');
                }
              }}
            >
              <Activity className="stat-icon" color={COLORS.warning} aria-hidden="true" />
              <div>
                <div className="stat-value">{dashboard.availability?.LIMITED || 0}</div>
                <div className="stat-label">Limited Capacity</div>
              </div>
            </div>
            <div 
              className="stat-item stat-item-clickable" 
              role="listitem"
              tabIndex={0}
              aria-label={`${dashboard.utilization?.OVER_ALLOCATED || 0} people over allocated. Click to view people directory.`}
              onClick={() => navigate('/people')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate('/people');
                }
              }}
            >
              <TrendingUp className="stat-icon" color={COLORS.primary} aria-hidden="true" />
              <div>
                <div className="stat-value">{dashboard.utilization?.OVER_ALLOCATED || 0}</div>
                <div className="stat-label">Over Allocated</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}