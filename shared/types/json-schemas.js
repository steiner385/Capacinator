"use strict";
/**
 * JSON schema definitions for Git repository data exports
 * Feature: 001-git-sync-integration
 *
 * Uses Zod for runtime validation of imported JSON data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectTypeJSONSchema = exports.LocationJSONSchema = exports.RoleJSONSchema = exports.ProjectPhaseJSONSchema = exports.AssignmentJSONSchema = exports.PersonJSONSchema = exports.ProjectJSONSchema = exports.SCHEMA_VERSION = void 0;
exports.validateJSON = validateJSON;
exports.isCompatibleVersion = isCompatibleVersion;
exports.getSchemaForEntity = getSchemaForEntity;
const zod_1 = require("zod");
/**
 * Schema version 1.0.0 - Initial release
 */
exports.SCHEMA_VERSION = '1.0.0';
/**
 * Base schema for all exported JSON files
 */
const BaseExportSchema = zod_1.z.object({
    schemaVersion: zod_1.z.literal('1.0.0'),
    exportedAt: zod_1.z.string().datetime(),
    exportedBy: zod_1.z.string().email().optional(),
    scenarioId: zod_1.z.string(),
});
/**
 * Project JSON schema (v1.0.0)
 */
exports.ProjectJSONSchema = BaseExportSchema.extend({
    data: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string().uuid(),
        name: zod_1.z.string().min(1).max(255),
        projectTypeId: zod_1.z.string().uuid().nullable(),
        projectSubTypeId: zod_1.z.string().uuid().nullable(),
        locationId: zod_1.z.string().uuid().nullable(),
        priority: zod_1.z.number().int().min(1).max(5).nullable(),
        includeInDemand: zod_1.z.boolean().default(true),
        startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
        endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
        createdAt: zod_1.z.string().datetime(),
        updatedAt: zod_1.z.string().datetime(),
    })),
});
/**
 * Person JSON schema (v1.0.0)
 */
exports.PersonJSONSchema = BaseExportSchema.extend({
    data: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string().uuid(),
        firstName: zod_1.z.string().min(1).max(100),
        lastName: zod_1.z.string().min(1).max(100),
        email: zod_1.z.string().email().max(255).nullable(),
        roleId: zod_1.z.string().uuid().nullable(),
        locationId: zod_1.z.string().uuid().nullable(),
        seniorityLevel: zod_1.z.enum(['junior', 'mid', 'senior', 'lead', 'principal']).nullable(),
        capacity: zod_1.z.number().int().min(0).max(100).default(100),
        startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
        endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
        isActive: zod_1.z.boolean().default(true),
        createdAt: zod_1.z.string().datetime(),
        updatedAt: zod_1.z.string().datetime(),
    })),
});
/**
 * Assignment JSON schema (v1.0.0)
 */
exports.AssignmentJSONSchema = BaseExportSchema.extend({
    data: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string().uuid(),
        projectId: zod_1.z.string().uuid(),
        personId: zod_1.z.string().uuid(),
        roleId: zod_1.z.string().uuid().nullable(),
        allocationPercentage: zod_1.z.number().int().min(0).max(200), // Allow over-allocation in data
        startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        notes: zod_1.z.string().max(1000).nullable(),
        createdAt: zod_1.z.string().datetime(),
        updatedAt: zod_1.z.string().datetime(),
    })),
});
/**
 * Project Phase JSON schema (v1.0.0)
 */
exports.ProjectPhaseJSONSchema = BaseExportSchema.extend({
    data: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string().uuid(),
        projectId: zod_1.z.string().uuid(),
        name: zod_1.z.string().min(1).max(255),
        startDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        status: zod_1.z.enum(['planned', 'active', 'completed', 'cancelled']).default('planned'),
        createdAt: zod_1.z.string().datetime(),
        updatedAt: zod_1.z.string().datetime(),
    })),
});
/**
 * Master data schemas (roles, locations, project types)
 */
exports.RoleJSONSchema = zod_1.z.object({
    schemaVersion: zod_1.z.literal('1.0.0'),
    data: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string().uuid(),
        name: zod_1.z.string().min(1).max(255),
        description: zod_1.z.string().max(1000).nullable(),
        isActive: zod_1.z.boolean().default(true),
        createdAt: zod_1.z.string().datetime(),
        updatedAt: zod_1.z.string().datetime(),
    })),
});
exports.LocationJSONSchema = zod_1.z.object({
    schemaVersion: zod_1.z.literal('1.0.0'),
    data: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string().uuid(),
        name: zod_1.z.string().min(1).max(255),
        country: zod_1.z.string().max(100).nullable(),
        timezone: zod_1.z.string().max(100).nullable(),
        isActive: zod_1.z.boolean().default(true),
        createdAt: zod_1.z.string().datetime(),
        updatedAt: zod_1.z.string().datetime(),
    })),
});
exports.ProjectTypeJSONSchema = zod_1.z.object({
    schemaVersion: zod_1.z.literal('1.0.0'),
    data: zod_1.z.array(zod_1.z.object({
        id: zod_1.z.string().uuid(),
        name: zod_1.z.string().min(1).max(255),
        description: zod_1.z.string().max(1000).nullable(),
        isActive: zod_1.z.boolean().default(true),
        createdAt: zod_1.z.string().datetime(),
        updatedAt: zod_1.z.string().datetime(),
    })),
});
/**
 * Schema validation helper
 *
 * @param data - JSON data to validate
 * @param schema - Zod schema to validate against
 * @returns Validation result
 */
function validateJSON(data, schema) {
    try {
        const validated = schema.parse(data);
        return { success: true, data: validated };
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return {
                success: false,
                error: `Schema validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
            };
        }
        return { success: false, error: 'Unknown validation error' };
    }
}
function isCompatibleVersion(version) {
    // Currently only support 1.0.0
    // Future: Add logic to support migrations from older versions
    return version === '1.0.0';
}
function getSchemaForEntity(entityType) {
    switch (entityType) {
        case 'project':
            return exports.ProjectJSONSchema;
        case 'person':
            return exports.PersonJSONSchema;
        case 'assignment':
            return exports.AssignmentJSONSchema;
        case 'project_phase':
            return exports.ProjectPhaseJSONSchema;
        case 'role':
            return exports.RoleJSONSchema;
        case 'location':
            return exports.LocationJSONSchema;
        case 'project_type':
            return exports.ProjectTypeJSONSchema;
        default:
            throw new Error(`Unknown entity type: ${entityType}`);
    }
}
