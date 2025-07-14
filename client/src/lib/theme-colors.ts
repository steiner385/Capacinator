/**
 * Theme-aware color utilities
 * Provides consistent color access that respects light/dark theme
 */

// Get CSS custom property value
const getCSSVariable = (variable: string): string => {
  if (typeof window !== 'undefined') {
    return getComputedStyle(document.documentElement)
      .getPropertyValue(variable)
      .trim();
  }
  return '';
};

// Chart color palette that respects theme
export const getChartColors = () => ({
  primary: getCSSVariable('--chart-primary') || '#4f46e5',
  secondary: getCSSVariable('--chart-secondary') || '#10b981',
  tertiary: getCSSVariable('--chart-tertiary') || '#f59e0b',
  quaternary: getCSSVariable('--chart-quaternary') || '#ef4444',
  quinary: getCSSVariable('--chart-quinary') || '#8b5cf6',
  accent: getCSSVariable('--chart-accent') || '#ec4899',
});

// Utility colors that respect theme
export const getUtilityColors = () => ({
  blue: getCSSVariable('--color-blue') || '#3b82f6',
  green: getCSSVariable('--color-green') || '#10b981',
  orange: getCSSVariable('--color-orange') || '#f59e0b',
  purple: getCSSVariable('--color-purple') || '#8b5cf6',
  gray: getCSSVariable('--color-gray') || '#6b7280',
  pink: getCSSVariable('--color-pink') || '#ec4899',
  indigo: getCSSVariable('--color-indigo') || '#6366f1',
  red: getCSSVariable('--color-red') || '#ef4444',
  yellow: getCSSVariable('--color-yellow') || '#eab308',
  emerald: getCSSVariable('--color-emerald') || '#10b981',
  cyan: getCSSVariable('--color-cyan') || '#06b6d4',
  slate: getCSSVariable('--color-slate') || '#64748b',
});

// Status colors that respect theme
export const getStatusColors = () => ({
  overdue: getCSSVariable('--status-overdue') || '#dc2626',
  active: getCSSVariable('--status-active') || '#16a34a',
  pending: getCSSVariable('--status-pending') || '#d97706',
  complete: getCSSVariable('--status-complete') || '#059669',
  cancelled: getCSSVariable('--status-cancelled') || '#6b7280',
});

// Project-specific colors that respect theme
export const getProjectColors = () => ({
  active: getCSSVariable('--project-active') || '#2563eb',
  selected: getCSSVariable('--project-selected') || '#1d4ed8',
  hover: getCSSVariable('--project-hover') || 'rgba(37, 99, 235, 0.1)',
});

// Default color for project types with fallback
export const getDefaultProjectTypeColor = (): string => {
  return getCSSVariable('--color-gray') || '#6b7280';
};

// Get chart color array for recharts
export const getChartColorArray = (): string[] => {
  const colors = getChartColors();
  return [
    colors.primary,
    colors.secondary,
    colors.tertiary,
    colors.quaternary,
    colors.quinary,
    colors.accent,
  ];
};

// React hook for theme-aware colors (updates when theme changes)
import { useEffect, useState } from 'react';

export const useThemeColors = () => {
  const [colors, setColors] = useState({
    chart: getChartColors(),
    utility: getUtilityColors(),
    status: getStatusColors(),
    project: getProjectColors(),
  });

  useEffect(() => {
    const updateColors = () => {
      setColors({
        chart: getChartColors(),
        utility: getUtilityColors(),
        status: getStatusColors(),
        project: getProjectColors(),
      });
    };

    // Update colors when theme changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'data-theme'
        ) {
          updateColors();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  return colors;
};