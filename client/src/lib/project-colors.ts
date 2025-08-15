import type { Project, ProjectType } from '../types';

/**
 * Default project type color when no color is specified
 * Note: This is a fallback hex value for cases where CSS variables cannot be used
 * (e.g., when colors need to be manipulated programmatically)
 */
const DEFAULT_PROJECT_TYPE_COLOR = '#6b7280'; // Matches var(--color-gray)

/**
 * Get the color code for a project based on its project type
 */
export function getProjectTypeColor(project: Project): string {
  return project.project_type?.color_code || DEFAULT_PROJECT_TYPE_COLOR;
}

/**
 * Get the color code for a project type
 */
export function getProjectTypeColorFromType(projectType: ProjectType | undefined): string {
  return projectType?.color_code || DEFAULT_PROJECT_TYPE_COLOR;
}

/**
 * Get a lighter version of the project type color for backgrounds
 */
export function getProjectTypeColorLight(project: Project, opacity: number = 0.1): string {
  const color = getProjectTypeColor(project);
  return color + Math.round(opacity * 255).toString(16).padStart(2, '0');
}

/**
 * Get project type color with custom opacity
 */
export function getProjectTypeColorWithOpacity(project: Project, opacity: number): string {
  const color = getProjectTypeColor(project);
  // Convert hex to rgb and add alpha
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * Check if a color is light or dark to determine text color
 */
export function isLightColor(hexColor: string): boolean {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return brightness > 155;
}

/**
 * Get appropriate text color (black or white) for a given background color
 */
export function getContrastingTextColor(backgroundColor: string): string {
  return isLightColor(backgroundColor) ? '#000000' : '#ffffff';
}

/**
 * Create a project type color indicator element props
 */
export function getProjectTypeIndicatorStyle(project: Project): React.CSSProperties {
  const color = getProjectTypeColor(project);
  return {
    backgroundColor: color,
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    display: 'inline-block',
    marginRight: '8px',
    flexShrink: 0
  };
}