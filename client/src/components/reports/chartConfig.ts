// Unified chart configuration for all reports

export const CHART_COLORS = {
  capacity: ['#4f46e5', '#10b981', '#f59e0b', '#ef4444'],
  utilization: ['#4f46e5', '#10b981', '#ef4444', '#8b5cf6'],
  demand: ['#4f46e5', '#10b981', '#8b5cf6', '#f59e0b'],
  gaps: ['#ef4444', '#f59e0b', '#10b981', '#4f46e5']
};

export const CHART_AXIS_CONFIG = {
  standard: {
    tick: { fontSize: 12 },
    style: { fill: 'var(--text-secondary)' }
  },
  angled: {
    angle: -45,
    textAnchor: 'end' as const,
    height: 120,
    interval: 'preserveStartEnd' as const,
    tick: { fontSize: 11 }
  }
};

export const getChartColor = (reportType: keyof typeof CHART_COLORS, index: number) => {
  const colors = CHART_COLORS[reportType];
  return colors[index % colors.length];
};