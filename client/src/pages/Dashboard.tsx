import { useQuery } from '@tanstack/react-query';
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
import { DashboardSummary } from '../types';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorMessage } from '../components/ui/ErrorMessage';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
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
  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await api.reporting.getDashboard();
      return response.data as DashboardSummary;
    },
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="Failed to load dashboard data" />;
  if (!dashboard) return null;

  // Prepare data for charts
  const projectHealthData = Object.entries(dashboard.projectHealth).map(([status, count]) => ({
    name: status.replace('_', ' '),
    value: count,
  }));

  const utilizationData = Object.entries(dashboard.utilization).map(([status, count]) => ({
    name: status.replace(/_/g, ' '),
    value: count,
  }));

  const capacityData = Object.entries(dashboard.capacityGaps).map(([status, count]) => ({
    name: status,
    value: count,
    color: status === 'GAP' ? COLORS.danger : status === 'TIGHT' ? COLORS.warning : COLORS.success,
  }));

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="page-subtitle">Overview of your project capacity planning</p>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Total Projects"
          value={dashboard.summary.projects}
          icon={FolderKanban}
          color="primary"
        />
        <StatCard
          title="Total People"
          value={dashboard.summary.people}
          icon={Users}
          color="success"
        />
        <StatCard
          title="Total Roles"
          value={dashboard.summary.roles}
          icon={Briefcase}
          color="purple"
        />
        <StatCard
          title="Capacity Gaps"
          value={dashboard.capacityGaps.GAP || 0}
          icon={AlertTriangle}
          color="danger"
        />
      </div>

      <div className="charts-grid">
        <Card title="Project Health Status">
          <div className="chart-container">
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

        <Card title="Resource Utilization">
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={utilizationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill={COLORS.primary} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Capacity Status by Role">
          <div className="capacity-summary">
            {capacityData.map((item) => (
              <div key={item.name} className="capacity-item">
                <div className="capacity-label">
                  <span className="capacity-status" style={{ backgroundColor: item.color }}></span>
                  <span>{item.name}</span>
                </div>
                <span className="capacity-value">{item.value} roles</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Quick Stats">
          <div className="quick-stats">
            <div className="stat-item">
              <UserCheck className="stat-icon" color={COLORS.success} />
              <div>
                <div className="stat-value">{dashboard.availability.AVAILABLE || 0}</div>
                <div className="stat-label">Available</div>
              </div>
            </div>
            <div className="stat-item">
              <UserX className="stat-icon" color={COLORS.danger} />
              <div>
                <div className="stat-value">{dashboard.availability.UNAVAILABLE || 0}</div>
                <div className="stat-label">On Leave</div>
              </div>
            </div>
            <div className="stat-item">
              <Activity className="stat-icon" color={COLORS.warning} />
              <div>
                <div className="stat-value">{dashboard.availability.LIMITED || 0}</div>
                <div className="stat-label">Limited Capacity</div>
              </div>
            </div>
            <div className="stat-item">
              <TrendingUp className="stat-icon" color={COLORS.primary} />
              <div>
                <div className="stat-value">{dashboard.utilization.OVER_ALLOCATED || 0}</div>
                <div className="stat-label">Over Allocated</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}