/**
 * Types for export formatting service
 */

export type ReportType = 'capacity' | 'utilization' | 'demand' | 'gaps';

export type CsvCellValue = string | number | boolean | null | undefined;

/**
 * Capacity report data for export
 */
export interface ExportCapacityData {
  totalCapacity: number;
  utilizedCapacity: number;
  availableCapacity: number;
  byRole: ExportRoleCapacity[];
}

export interface ExportRoleCapacity {
  role: string;
  capacity: number;
  utilized: number;
  gap_fte?: number;
}

/**
 * Utilization report data for export
 */
export interface ExportUtilizationData {
  peopleUtilization: ExportPersonUtilization[];
  averageUtilization: number;
}

export interface ExportPersonUtilization {
  id: string;
  name: string;
  role: string;
  utilization: number;
}

/**
 * Demand report data for export
 */
export interface ExportDemandData {
  totalDemand: number;
  byProjectType: ExportProjectTypeDemand[];
}

export interface ExportProjectTypeDemand {
  type: string;
  demand: number;
}

/**
 * Gaps report data for export
 */
export interface ExportGapsData {
  totalGap: number;
  gapsByRole: ExportRoleGap[];
}

export interface ExportRoleGap {
  roleId: string;
  roleName: string;
  demand: number;
  capacity: number;
  gap: number;
}
