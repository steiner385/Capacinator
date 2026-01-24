/**
 * JSON schema definitions for Git repository data exports
 * Feature: 001-git-sync-integration
 *
 * Uses Zod for runtime validation of imported JSON data
 */

import { z } from 'zod';

/**
 * Schema version 1.0.0 - Initial release
 */
export const SCHEMA_VERSION = '1.0.0';

/**
 * Base schema for all exported JSON files
 */
const BaseExportSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  exportedAt: z.string().datetime(),
  exportedBy: z.string().email().optional(),
  scenarioId: z.string(),
});

/**
 * Project JSON schema (v1.0.0)
 */
export const ProjectJSONSchema = BaseExportSchema.extend({
  data: z.array(z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(255),
    projectTypeId: z.string().uuid().nullable(),
    projectSubTypeId: z.string().uuid().nullable(),
    locationId: z.string().uuid().nullable(),
    priority: z.number().int().min(1).max(5).nullable(),
    includeInDemand: z.boolean().default(true),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })),
});

export type ProjectJSON = z.infer<typeof ProjectJSONSchema>;

/**
 * Person JSON schema (v1.0.0)
 */
export const PersonJSONSchema = BaseExportSchema.extend({
  data: z.array(z.object({
    id: z.string().uuid(),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    email: z.string().email().max(255).nullable(),
    roleId: z.string().uuid().nullable(),
    locationId: z.string().uuid().nullable(),
    seniorityLevel: z.enum(['junior', 'mid', 'senior', 'lead', 'principal']).nullable(),
    capacity: z.number().int().min(0).max(100).default(100),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    isActive: z.boolean().default(true),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })),
});

export type PersonJSON = z.infer<typeof PersonJSONSchema>;

/**
 * Assignment JSON schema (v1.0.0)
 */
export const AssignmentJSONSchema = BaseExportSchema.extend({
  data: z.array(z.object({
    id: z.string().uuid(),
    projectId: z.string().uuid(),
    personId: z.string().uuid(),
    roleId: z.string().uuid().nullable(),
    allocationPercentage: z.number().int().min(0).max(200), // Allow over-allocation in data
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes: z.string().max(1000).nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })),
});

export type AssignmentJSON = z.infer<typeof AssignmentJSONSchema>;

/**
 * Project Phase JSON schema (v1.0.0)
 */
export const ProjectPhaseJSONSchema = BaseExportSchema.extend({
  data: z.array(z.object({
    id: z.string().uuid(),
    projectId: z.string().uuid(),
    name: z.string().min(1).max(255),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    status: z.enum(['planned', 'active', 'completed', 'cancelled']).default('planned'),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })),
});

export type ProjectPhaseJSON = z.infer<typeof ProjectPhaseJSONSchema>;

/**
 * Master data schemas (roles, locations, project types)
 */
export const RoleJSONSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  data: z.array(z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(255),
    description: z.string().max(1000).nullable(),
    isActive: z.boolean().default(true),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })),
});

export type RoleJSON = z.infer<typeof RoleJSONSchema>;

export const LocationJSONSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  data: z.array(z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(255),
    country: z.string().max(100).nullable(),
    timezone: z.string().max(100).nullable(),
    isActive: z.boolean().default(true),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })),
});

export type LocationJSON = z.infer<typeof LocationJSONSchema>;

export const ProjectTypeJSONSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  data: z.array(z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(255),
    description: z.string().max(1000).nullable(),
    isActive: z.boolean().default(true),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })),
});

export type ProjectTypeJSON = z.infer<typeof ProjectTypeJSONSchema>;

/**
 * Schema validation helper
 *
 * @param data - JSON data to validate
 * @param schema - Zod schema to validate against
 * @returns Validation result
 */
export function validateJSON<T>(data: unknown, schema: z.ZodType<T>): { success: boolean; data?: T; error?: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Schema validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
      };
    }
    return { success: false, error: 'Unknown validation error' };
  }
}

/**
 * Schema migration helpers (for future versions)
 */
export type SchemaVersion = '1.0.0' | '1.1.0' | '2.0.0';

export function isCompatibleVersion(version: string): boolean {
  // Currently only support 1.0.0
  // Future: Add logic to support migrations from older versions
  return version === '1.0.0';
}

export function getSchemaForEntity(entityType: 'project' | 'person' | 'assignment' | 'project_phase' | 'role' | 'location' | 'project_type') {
  switch (entityType) {
    case 'project':
      return ProjectJSONSchema;
    case 'person':
      return PersonJSONSchema;
    case 'assignment':
      return AssignmentJSONSchema;
    case 'project_phase':
      return ProjectPhaseJSONSchema;
    case 'role':
      return RoleJSONSchema;
    case 'location':
      return LocationJSONSchema;
    case 'project_type':
      return ProjectTypeJSONSchema;
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}
