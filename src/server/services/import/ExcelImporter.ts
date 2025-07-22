import ExcelJS from 'exceljs';
import { db } from '../../database/index.js';

export interface ImportResult {
  success: boolean;
  imported: {
    locations: number;
    projectTypes: number;
    phases: number;
    roles: number;
    people: number;
    projects: number;
    standardAllocations: number;
    assignments: number;
  };
  errors: string[];
  warnings: string[];
}

export class ExcelImporter {
  private async clearExistingData() {
    // Clear in reverse dependency order
    const tables = [
      'project_assignments',
      'demand_overrides',
      'person_availability_overrides',
      'supervisor_delegations',
      'standard_allocations',
      'project_phases_timeline',
      'role_planners',
      'project_planners',
      'person_roles',
      'projects',
      'people',
      'roles',
      'project_phases',
      'project_types',
      'locations'
    ];

    for (const table of tables) {
      await db(table).del();
    }
  }

  private async findOrCreateLocation(name: string): Promise<string> {
    let location = await db('locations').where('name', name).first();
    
    if (!location) {
      const [newLocation] = await db('locations')
        .insert({
          name,
          description: `Imported location: ${name}`,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');
      location = newLocation;
    }
    
    return location.id;
  }

  private async findOrCreateProjectType(name: string): Promise<string> {
    let projectType = await db('project_types').where('name', name).first();
    
    if (!projectType) {
      const [newType] = await db('project_types')
        .insert({
          name,
          description: `Imported project type: ${name}`,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');
      projectType = newType;
    }
    
    return projectType.id;
  }

  private async findOrCreateRole(name: string): Promise<string> {
    let role = await db('roles').where('name', name).first();
    
    if (!role) {
      const [newRole] = await db('roles')
        .insert({
          name,
          description: `Imported role: ${name}`,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');
      role = newRole;
    }
    
    return role.id;
  }

  private async findOrCreatePhase(name: string, orderIndex: number): Promise<string> {
    let phase = await db('project_phases').where('name', name).first();
    
    if (!phase) {
      const [newPhase] = await db('project_phases')
        .insert({
          name,
          description: `Imported phase: ${name}`,
          order_index: orderIndex,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');
      phase = newPhase;
    }
    
    return phase.id;
  }

  private async importProjects(worksheet: ExcelJS.Worksheet): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    if (!worksheet) {
      errors.push('Projects worksheet not found');
      return { count, errors };
    }

    const headerRow = worksheet.getRow(1);
    const headers = headerRow.values as string[];
    
    // Expected columns based on original Excel structure
    const expectedColumns = {
      name: this.findColumnIndex(headers, ['Project Name', 'Name']),
      projectType: this.findColumnIndex(headers, ['Project Type', 'Type']),
      location: this.findColumnIndex(headers, ['Location', 'Site']),
      priority: this.findColumnIndex(headers, ['Priority']),
      description: this.findColumnIndex(headers, ['Description', 'Notes']),
      aspirationStart: this.findColumnIndex(headers, ['Start Date', 'Aspiration Start']),
      aspirationFinish: this.findColumnIndex(headers, ['End Date', 'Aspiration Finish', 'Finish Date']),
      owner: this.findColumnIndex(headers, ['Owner', 'Project Manager', 'PM'])
    };

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      try {
        const row = worksheet.getRow(rowNumber);
        const values = row.values as any[];

        if (!values[expectedColumns.name]) continue; // Skip empty rows

        const projectName = values[expectedColumns.name]?.toString();
        const projectTypeName = values[expectedColumns.projectType]?.toString();
        const locationName = values[expectedColumns.location]?.toString();

        if (!projectName || !projectTypeName || !locationName) {
          errors.push(`Row ${rowNumber}: Missing required fields (Name, Type, Location)`);
          continue;
        }

        // Find or create referenced entities
        const locationId = await this.findOrCreateLocation(locationName);
        const projectTypeId = await this.findOrCreateProjectType(projectTypeName);

        // Find owner (if specified)
        let ownerId = null;
        const ownerName = values[expectedColumns.owner]?.toString();
        if (ownerName) {
          const owner = await db('people').where('name', 'like', `%${ownerName}%`).first();
          if (owner) {
            ownerId = owner.id;
          }
        }

        const projectData = {
          name: projectName,
          project_type_id: projectTypeId,
          location_id: locationId,
          priority: parseInt(values[expectedColumns.priority]?.toString()) || 3,
          description: values[expectedColumns.description]?.toString() || '',
          include_in_demand: 1,
          aspiration_start: this.parseDate(values[expectedColumns.aspirationStart]),
          aspiration_finish: this.parseDate(values[expectedColumns.aspirationFinish]),
          owner_id: ownerId,
          created_at: new Date(),
          updated_at: new Date()
        };

        await db('projects').insert(projectData);
        count++;

      } catch (error) {
        errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { count, errors };
  }

  private async importPeople(worksheet: ExcelJS.Worksheet): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    if (!worksheet) {
      errors.push('People/Rosters worksheet not found');
      return { count, errors };
    }

    const headerRow = worksheet.getRow(1);
    const headers = headerRow.values as string[];
    
    const expectedColumns = {
      name: this.findColumnIndex(headers, ['Name', 'Full Name', 'Employee Name']),
      email: this.findColumnIndex(headers, ['Email', 'Email Address']),
      primaryRole: this.findColumnIndex(headers, ['Primary Role', 'Role', 'Job Title']),
      workerType: this.findColumnIndex(headers, ['Worker Type', 'Type', 'Employment Type']),
      supervisor: this.findColumnIndex(headers, ['Supervisor', 'Manager', 'Reports To']),
      availability: this.findColumnIndex(headers, ['Availability', 'Availability %', 'Capacity']),
      hoursPerDay: this.findColumnIndex(headers, ['Hours Per Day', 'Daily Hours', 'Hours/Day'])
    };

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      try {
        const row = worksheet.getRow(rowNumber);
        const values = row.values as any[];

        if (!values[expectedColumns.name]) continue;

        const personName = values[expectedColumns.name]?.toString();
        const primaryRoleName = values[expectedColumns.primaryRole]?.toString();

        if (!personName) {
          errors.push(`Row ${rowNumber}: Missing person name`);
          continue;
        }

        // Find or create primary role
        let primaryRoleId = null;
        if (primaryRoleName) {
          primaryRoleId = await this.findOrCreateRole(primaryRoleName);
        }

        const personData = {
          name: personName,
          email: values[expectedColumns.email]?.toString() || null,
          primary_role_id: primaryRoleId,
          worker_type: values[expectedColumns.workerType]?.toString() || 'FTE',
          default_availability_percentage: parseFloat(values[expectedColumns.availability]?.toString()) || 100,
          default_hours_per_day: parseFloat(values[expectedColumns.hoursPerDay]?.toString()) || 8,
          created_at: new Date(),
          updated_at: new Date()
        };

        const [insertedPerson] = await db('people').insert(personData).returning('*');

        // Handle supervisor relationship (will be processed in a second pass)
        const supervisorName = values[expectedColumns.supervisor]?.toString();
        if (supervisorName) {
          // Store for second pass processing
          await db('temp_supervisor_mapping').insert({
            person_id: insertedPerson.id,
            supervisor_name: supervisorName
          }).onConflict(['person_id']).merge();
        }

        count++;

      } catch (error) {
        errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { count, errors };
  }

  private async importStandardAllocations(worksheet: ExcelJS.Worksheet): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    if (!worksheet) {
      errors.push('Standard Allocations worksheet not found');
      return { count, errors };
    }

    const headerRow = worksheet.getRow(1);
    const headers = headerRow.values as string[];
    
    const expectedColumns = {
      projectType: this.findColumnIndex(headers, ['Project Type', 'Type']),
      phase: this.findColumnIndex(headers, ['Phase', 'Project Phase']),
      role: this.findColumnIndex(headers, ['Role', 'Role Name']),
      allocation: this.findColumnIndex(headers, ['Allocation %', 'Allocation', 'Percentage'])
    };

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      try {
        const row = worksheet.getRow(rowNumber);
        const values = row.values as any[];

        if (!values[expectedColumns.projectType]) continue;

        const projectTypeName = values[expectedColumns.projectType]?.toString();
        const phaseName = values[expectedColumns.phase]?.toString();
        const roleName = values[expectedColumns.role]?.toString();
        const allocationPercentage = parseFloat(values[expectedColumns.allocation]?.toString());

        if (!projectTypeName || !phaseName || !roleName || isNaN(allocationPercentage)) {
          errors.push(`Row ${rowNumber}: Missing required fields or invalid allocation percentage`);
          continue;
        }

        const projectTypeId = await this.findOrCreateProjectType(projectTypeName);
        const phaseId = await this.findOrCreatePhase(phaseName, count); // Use count as order index
        const roleId = await this.findOrCreateRole(roleName);

        const allocationData = {
          project_type_id: projectTypeId,
          phase_id: phaseId,
          role_id: roleId,
          allocation_percentage: allocationPercentage,
          created_at: new Date(),
          updated_at: new Date()
        };

        await db('standard_allocations').insert(allocationData);
        count++;

      } catch (error) {
        errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { count, errors };
  }

  private findColumnIndex(headers: string[], possibleNames: string[]): number {
    for (const name of possibleNames) {
      const index = headers.findIndex(header => 
        header && header.toString().toLowerCase().includes(name.toLowerCase())
      );
      if (index !== -1) return index;
    }
    return -1;
  }

  private parseDate(value: any): string | null {
    if (!value) return null;
    
    try {
      if (value instanceof Date) {
        return value.toISOString().split('T')[0];
      }
      
      if (typeof value === 'string') {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
      
      // Handle Excel date numbers
      if (typeof value === 'number') {
        const date = new Date((value - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
      }
    } catch (error) {
      console.warn('Failed to parse date:', value);
    }
    
    return null;
  }

  async importFromFile(filePath: string, clearExisting = false): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      imported: {
        locations: 0,
        projectTypes: 0,
        phases: 0,
        roles: 0,
        people: 0,
        projects: 0,
        standardAllocations: 0,
        assignments: 0
      },
      errors: [],
      warnings: []
    };

    try {
      // Create temporary table for supervisor mapping
      await db.schema.createTable('temp_supervisor_mapping', (table) => {
        table.uuid('person_id').primary();
        table.string('supervisor_name');
      }).catch(() => {}); // Ignore if table already exists

      if (clearExisting) {
        await this.clearExistingData();
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      // Import in dependency order
      const peopleWorksheet = workbook.getWorksheet('Rosters') || workbook.getWorksheet('People');
      const peopleResult = peopleWorksheet ? await this.importPeople(peopleWorksheet) : { count: 0, errors: ['People worksheet not found'] };
      result.imported.people = peopleResult.count;
      result.errors.push(...peopleResult.errors);

      const projectsWorksheet = workbook.getWorksheet('Projects');
      const projectsResult = projectsWorksheet ? await this.importProjects(projectsWorksheet) : { count: 0, errors: ['Projects worksheet not found'] };
      result.imported.projects = projectsResult.count;
      result.errors.push(...projectsResult.errors);

      const allocationsWorksheet = workbook.getWorksheet('Standard Allocations') || workbook.getWorksheet('Allocations');
      const allocationsResult = allocationsWorksheet ? await this.importStandardAllocations(allocationsWorksheet) : { count: 0, errors: ['Allocations worksheet not found'] };
      result.imported.standardAllocations = allocationsResult.count;
      result.errors.push(...allocationsResult.errors);

      // Second pass: Update supervisor relationships
      const supervisorMappings = await db('temp_supervisor_mapping').select('*');
      for (const mapping of supervisorMappings) {
        const supervisor = await db('people')
          .where('name', 'like', `%${mapping.supervisor_name}%`)
          .first();
        
        if (supervisor) {
          await db('people')
            .where('id', mapping.person_id)
            .update({ supervisor_id: supervisor.id });
        } else {
          result.warnings.push(`Could not find supervisor: ${mapping.supervisor_name}`);
        }
      }

      // Clean up temp table
      await db.schema.dropTable('temp_supervisor_mapping').catch(() => {});

      // Count imported entities
      result.imported.locations = await db('locations').count('* as count').first().then(r => Number(r?.count) || 0);
      result.imported.projectTypes = await db('project_types').count('* as count').first().then(r => Number(r?.count) || 0);
      result.imported.phases = await db('project_phases').count('* as count').first().then(r => Number(r?.count) || 0);
      result.imported.roles = await db('roles').count('* as count').first().then(r => Number(r?.count) || 0);

      result.success = result.errors.length === 0;

    } catch (error) {
      result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }
}