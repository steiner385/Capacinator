import ExcelJS from 'exceljs';
import { db } from '../../database/index.js';
import { 
  fiscalWeekToDate, 
  extractFiscalWeekColumns, 
  getPhaseFullName,
  parseProjectSite,
  PHASE_ABBREVIATIONS
} from '../../utils/fiscalWeek.js';
import { v4 as uuidv4 } from 'uuid';

export interface ImportResultV2 {
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
    phaseTimelines: number;
    demands: number;
    availabilityOverrides: number;
  };
  errors: string[];
  warnings: string[];
}

export class ExcelImporterV2 {
  private planOwnerMap: Map<string, string> = new Map(); // name -> person_id
  private roleMap: Map<string, string> = new Map(); // name -> role_id
  private projectMap: Map<string, string> = new Map(); // name -> project_id
  private phaseMap: Map<string, string> = new Map(); // abbreviation -> phase_id

  private async clearExistingData() {
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

  private async importProjectTypes(worksheet: ExcelJS.Worksheet): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    if (!worksheet) {
      errors.push('Project Types worksheet not found');
      return { count, errors };
    }

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      try {
        const row = worksheet.getRow(rowNumber);
        const name = row.getCell(1).value?.toString();

        if (!name) continue;

        await db('project_types').insert({
          id: uuidv4(),
          name,
          description: `Imported project type: ${name}`,
          created_at: new Date(),
          updated_at: new Date()
        });
        count++;

      } catch (error) {
        errors.push(`Project Types Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { count, errors };
  }

  private async importProjectPhases(worksheet: ExcelJS.Worksheet): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    // Import standard phases from abbreviations
    let orderIndex = 0;
    for (const [abbrev, fullName] of Object.entries(PHASE_ABBREVIATIONS)) {
      try {
        const phaseId = uuidv4();
        await db('project_phases').insert({
          id: phaseId,
          name: fullName,
          description: `Phase: ${fullName} (${abbrev})`,
          order_index: orderIndex++,
          created_at: new Date(),
          updated_at: new Date()
        });
        this.phaseMap.set(abbrev, phaseId);
        count++;
      } catch (error) {
        errors.push(`Failed to create phase ${fullName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Import custom phases from worksheet if present
    if (worksheet) {
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        try {
          const row = worksheet.getRow(rowNumber);
          const name = row.getCell(1).value?.toString();

          if (!name) continue;

          // Skip if already imported from abbreviations
          const abbrev = Object.keys(PHASE_ABBREVIATIONS).find(k => PHASE_ABBREVIATIONS[k] === name);
          if (abbrev) continue;

          const phaseId = uuidv4();
          await db('project_phases').insert({
            id: phaseId,
            name,
            description: `Imported phase: ${name}`,
            order_index: orderIndex++,
            created_at: new Date(),
            updated_at: new Date()
          });
          count++;

        } catch (error) {
          errors.push(`Project Phases Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    return { count, errors };
  }

  private async importRoles(worksheet: ExcelJS.Worksheet): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    if (!worksheet) {
      errors.push('Roles worksheet not found');
      return { count, errors };
    }

    const headerRow = worksheet.getRow(1);
    const headers = headerRow.values as string[];

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      try {
        const row = worksheet.getRow(rowNumber);
        const roleName = row.getCell(1).value?.toString(); // Role
        const planOwner = row.getCell(2).value?.toString(); // Plan Owner
        const cwOption = row.getCell(3).value?.toString(); // CW Option
        const dataAccess = row.getCell(4).value?.toString(); // Required Data Access

        if (!roleName) continue;

        const roleId = uuidv4();
        await db('roles').insert({
          id: roleId,
          name: roleName,
          description: `Role: ${roleName}${dataAccess ? ` - Requires: ${dataAccess}` : ''}`,
          external_id: null, // Don't use CW Option as external_id since it's not unique
          created_at: new Date(),
          updated_at: new Date()
        });

        this.roleMap.set(roleName, roleId);

        // Handle Plan Owner relationship
        if (planOwner) {
          this.planOwnerMap.set(planOwner, roleId); // Store for later processing
        }

        count++;

      } catch (error) {
        errors.push(`Roles Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { count, errors };
  }

  private async importRoster(worksheet: ExcelJS.Worksheet): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    if (!worksheet) {
      errors.push('Roster worksheet not found');
      return { count, errors };
    }

    const headerRow = worksheet.getRow(1);
    const headers = headerRow.values as any[];
    const fiscalWeeks = extractFiscalWeekColumns(headers);

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      try {
        const row = worksheet.getRow(rowNumber);
        const personName = row.getCell(1).value?.toString(); // Person
        const roleName = row.getCell(2).value?.toString(); // Role

        if (!personName) continue;

        const personId = uuidv4();
        const roleId = roleName ? this.roleMap.get(roleName) : null;

        // Get availability from fiscal week columns
        let defaultAvailability = 100;
        const availabilities: Record<string, number> = {};
        
        headers.forEach((header, index) => {
          if (typeof header === 'string' && fiscalWeeks.includes(header)) {
            const cellValue = row.getCell(index).value;
            if (cellValue !== null && cellValue !== undefined) {
              const availability = parseFloat(cellValue.toString());
              if (!isNaN(availability)) {
                availabilities[header] = availability > 1 ? availability : availability * 100; // Handle both percentage and decimal formats
              }
            }
          }
        });

        // Calculate average availability as default
        const availValues = Object.values(availabilities);
        if (availValues.length > 0) {
          defaultAvailability = availValues.reduce((a, b) => a + b, 0) / availValues.length;
        }

        await db('people').insert({
          id: personId,
          name: personName,
          primary_role_id: roleId,
          worker_type: 'FTE',
          default_availability_percentage: defaultAvailability,
          default_hours_per_day: 8,
          created_at: new Date(),
          updated_at: new Date()
        });

        // Add person-role relationship
        if (roleId) {
          await db('person_roles').insert({
            person_id: personId,
            role_id: roleId,
            proficiency_level: 'Intermediate'
          });
        }

        // Import availability overrides for specific weeks
        for (const [fiscalWeek, availability] of Object.entries(availabilities)) {
          if (availability !== defaultAvailability && availability < 100) {
            const weekDate = fiscalWeekToDate(fiscalWeek);
            if (weekDate) {
              await db('person_availability_overrides').insert({
                id: uuidv4(),
                person_id: personId,
                start_date: weekDate,
                end_date: new Date(weekDate.getTime() + 6 * 24 * 60 * 60 * 1000), // End of week
                availability_percentage: availability, // Already converted to percentage
                override_type: 'OTHER',
                reason: 'Imported from Excel',
                is_approved: true,
                approved_at: new Date(),
                created_at: new Date(),
                updated_at: new Date()
              });
            }
          }
        }

        count++;

      } catch (error) {
        errors.push(`Roster Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { count, errors };
  }

  private async importProjects(worksheet: ExcelJS.Worksheet): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    if (!worksheet) {
      errors.push('Projects worksheet not found');
      return { count, errors };
    }

    // First, ensure we have all locations
    const locations = new Map<string, string>();
    
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      try {
        const row = worksheet.getRow(rowNumber);
        const projectSite = row.getCell(1).value?.toString(); // Project/Site
        const projectType = row.getCell(2).value?.toString(); // Project Type
        const includeInDemand = row.getCell(3).value?.toString(); // Inc. in Demand
        const priority = row.getCell(4).value?.toString(); // Priority

        if (!projectSite) continue;

        const { project: projectName, site: siteName } = parseProjectSite(projectSite);
        
        if (!projectName) {
          errors.push(`Row ${rowNumber}: Invalid project/site format`);
          continue;
        }

        // Find or create location
        let locationId = locations.get(siteName);
        if (!locationId) {
          const existing = await db('locations').where('name', siteName).first();
          if (existing) {
            locationId = existing.id;
          } else {
            locationId = uuidv4();
            await db('locations').insert({
              id: locationId,
              name: siteName,
              description: `Location: ${siteName}`,
              created_at: new Date(),
              updated_at: new Date()
            });
          }
          locations.set(siteName, locationId);
        }

        // Find project type
        const projectTypeRecord = await db('project_types').where('name', projectType).first();
        if (!projectTypeRecord) {
          errors.push(`Row ${rowNumber}: Project type not found: ${projectType}`);
          continue;
        }

        const projectId = uuidv4();
        await db('projects').insert({
          id: projectId,
          name: projectName,
          project_type_id: projectTypeRecord.id,
          location_id: locationId,
          priority: parseInt(priority) || 3,
          include_in_demand: includeInDemand === 'Y' ? 1 : 0,
          created_at: new Date(),
          updated_at: new Date()
        });

        this.projectMap.set(projectName, projectId);
        count++;

      } catch (error) {
        errors.push(`Projects Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { count, errors };
  }

  private async importProjectRoadmap(worksheet: ExcelJS.Worksheet): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    if (!worksheet) {
      errors.push('Project Roadmap worksheet not found');
      return { count, errors };
    }

    const headerRow = worksheet.getRow(1);
    const headers = headerRow.values as any[];
    const fiscalWeeks = extractFiscalWeekColumns(headers);

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      try {
        const row = worksheet.getRow(rowNumber);
        const projectSite = row.getCell(1).value?.toString();

        if (!projectSite) continue;

        const { project: projectName } = parseProjectSite(projectSite);
        const projectId = this.projectMap.get(projectName);

        if (!projectId) {
          errors.push(`Roadmap Row ${rowNumber}: Project not found: ${projectName}`);
          continue;
        }

        // Read phase data from fiscal week columns
        const phaseRanges = new Map<string, { start: string; end: string }>();
        let currentPhase: string | null = null;
        let phaseStart: string | null = null;

        headers.forEach((header, index) => {
          if (typeof header === 'string' && fiscalWeeks.includes(header)) {
            const cellValue = row.getCell(index).value?.toString();
            
            if (cellValue && cellValue !== currentPhase) {
              // New phase started
              if (currentPhase && phaseStart) {
                // Save previous phase
                const existing = phaseRanges.get(currentPhase);
                if (!existing || fiscalWeeks.indexOf(phaseStart) < fiscalWeeks.indexOf(existing.start)) {
                  phaseRanges.set(currentPhase, { 
                    start: phaseStart, 
                    end: headers[index - 1] as string 
                  });
                }
              }
              currentPhase = cellValue;
              phaseStart = header;
            } else if (cellValue === currentPhase && !phaseStart) {
              phaseStart = header;
            }
          }
        });

        // Handle last phase
        if (currentPhase && phaseStart) {
          const lastFiscalWeek = fiscalWeeks[fiscalWeeks.length - 1];
          phaseRanges.set(currentPhase, { start: phaseStart, end: lastFiscalWeek });
        }

        // Create phase timeline entries
        for (const [phaseAbbrev, range] of phaseRanges) {
          const phaseId = this.phaseMap.get(phaseAbbrev);
          if (!phaseId) {
            errors.push(`Roadmap Row ${rowNumber}: Unknown phase: ${phaseAbbrev}`);
            continue;
          }

          const startDate = fiscalWeekToDate(range.start);
          const endDate = fiscalWeekToDate(range.end);

          if (startDate && endDate) {
            await db('project_phases_timeline').insert({
              id: uuidv4(),
              project_id: projectId,
              phase_id: phaseId,
              start_date: startDate,
              end_date: endDate,
              created_at: new Date(),
              updated_at: new Date()
            });
            count++;
          }
        }

      } catch (error) {
        errors.push(`Roadmap Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { count, errors };
  }

  private async importProjectDemand(worksheet: ExcelJS.Worksheet): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    if (!worksheet) {
      errors.push('Project Demand worksheet not found');
      return { count, errors };
    }

    const headerRow = worksheet.getRow(1);
    const headers = headerRow.values as any[];
    const fiscalWeeks = extractFiscalWeekColumns(headers);

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      try {
        const row = worksheet.getRow(rowNumber);
        const projectSite = row.getCell(1).value?.toString();
        const planOwner = row.getCell(2).value?.toString();
        const roleName = row.getCell(3).value?.toString();

        if (!projectSite || !roleName) continue;

        const { project: projectName } = parseProjectSite(projectSite);
        const projectId = this.projectMap.get(projectName);
        const roleId = this.roleMap.get(roleName);

        if (!projectId || !roleId) {
          errors.push(`Demand Row ${rowNumber}: Project or role not found`);
          continue;
        }

        // Read demand values from fiscal week columns
        for (let index = 0; index < headers.length; index++) {
          const header = headers[index];
          if (typeof header === 'string' && fiscalWeeks.includes(header)) {
            const cellValue = row.getCell(index).value;
            if (cellValue !== null && cellValue !== undefined) {
              const demandHours = parseFloat(cellValue.toString());
              if (!isNaN(demandHours) && demandHours > 0) {
                const weekDate = fiscalWeekToDate(header);
                if (weekDate) {
                  await db('demand_overrides').insert({
                    id: uuidv4(),
                    project_id: projectId,
                    role_id: roleId,
                    start_date: weekDate,
                    end_date: new Date(weekDate.getTime() + 6 * 24 * 60 * 60 * 1000),
                    demand_hours: demandHours * 40, // Convert FTE to hours (40 hours/week)
                    reason: 'Imported from Excel',
                    created_at: new Date(),
                    updated_at: new Date()
                  });
                  count++;
                }
              }
            }
          }
        }

      } catch (error) {
        errors.push(`Demand Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { count, errors };
  }

  private async importProjectAssignments(worksheet: ExcelJS.Worksheet): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    if (!worksheet) {
      errors.push('Project Assignments worksheet not found');
      return { count, errors };
    }

    const headerRow = worksheet.getRow(1);
    const headers = headerRow.values as any[];
    const fiscalWeeks = extractFiscalWeekColumns(headers);

    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      try {
        const row = worksheet.getRow(rowNumber);
        const projectSite = row.getCell(1).value?.toString();
        const personName = row.getCell(2).value?.toString();
        const roleName = row.getCell(3).value?.toString();

        if (!projectSite || !personName || !roleName) continue;

        const { project: projectName } = parseProjectSite(projectSite);
        const projectId = this.projectMap.get(projectName);
        const person = await db('people').where('name', personName).first();
        const roleId = this.roleMap.get(roleName);

        if (!projectId || !person || !roleId) {
          errors.push(`Assignment Row ${rowNumber}: Project, person, or role not found`);
          continue;
        }

        // Read allocation percentages from fiscal week columns
        const allocations: { week: string; percentage: number }[] = [];
        
        headers.forEach((header, index) => {
          if (typeof header === 'string' && fiscalWeeks.includes(header)) {
            const cellValue = row.getCell(index).value;
            if (cellValue !== null && cellValue !== undefined) {
              const percentage = parseFloat(cellValue.toString()) * 100; // Convert to percentage
              if (!isNaN(percentage) && percentage > 0) {
                allocations.push({ week: header, percentage });
              }
            }
          }
        });

        // Group consecutive weeks with same allocation
        if (allocations.length > 0) {
          let startWeek = allocations[0].week;
          let currentPercentage = allocations[0].percentage;
          
          for (let i = 1; i <= allocations.length; i++) {
            if (i === allocations.length || allocations[i].percentage !== currentPercentage) {
              // Create assignment for this range
              const startDate = fiscalWeekToDate(startWeek);
              const endDate = fiscalWeekToDate(allocations[i - 1].week);
              
              if (startDate && endDate) {
                await db('project_assignments').insert({
                  id: uuidv4(),
                  project_id: projectId,
                  person_id: person.id,
                  role_id: roleId,
                  allocation_percentage: currentPercentage,
                  start_date: startDate,
                  end_date: new Date(endDate.getTime() + 6 * 24 * 60 * 60 * 1000),
                  created_at: new Date(),
                  updated_at: new Date()
                });
                count++;
              }
              
              if (i < allocations.length) {
                startWeek = allocations[i].week;
                currentPercentage = allocations[i].percentage;
              }
            }
          }
        }

      } catch (error) {
        errors.push(`Assignment Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      try {
        const row = worksheet.getRow(rowNumber);
        const roleName = row.getCell(1).value?.toString();
        const projectTypeName = row.getCell(2).value?.toString();

        if (!roleName || !projectTypeName) continue;

        const roleId = this.roleMap.get(roleName);
        const projectType = await db('project_types').where('name', projectTypeName).first();

        if (!roleId || !projectType) {
          errors.push(`Standard Allocation Row ${rowNumber}: Role or project type not found`);
          continue;
        }

        // Read phase allocations (columns 3 onwards)
        let colIndex = 3;
        for (const phaseAbbrev of Object.keys(PHASE_ABBREVIATIONS)) {
          const cellValue = row.getCell(colIndex).value;
          if (cellValue !== null && cellValue !== undefined) {
            const allocation = parseFloat(cellValue.toString()) * 100;
            if (!isNaN(allocation) && allocation > 0) {
              const phaseId = this.phaseMap.get(phaseAbbrev);
              if (phaseId) {
                await db('standard_allocations').insert({
                  id: uuidv4(),
                  project_type_id: projectType.id,
                  phase_id: phaseId,
                  role_id: roleId,
                  allocation_percentage: allocation,
                  created_at: new Date(),
                  updated_at: new Date()
                });
                count++;
              }
            }
          }
          colIndex++;
        }

      } catch (error) {
        errors.push(`Standard Allocation Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { count, errors };
  }

  private async processRolePlanners(): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    // Process Plan Owner relationships from roles sheet
    for (const [planOwnerName, roleId] of this.planOwnerMap) {
      try {
        const planOwner = await db('people').where('name', planOwnerName).first();
        if (planOwner) {
          await db('role_planners').insert({
            role_id: roleId,
            person_id: planOwner.id,
            is_primary: true,
            can_allocate_resources: true,
            can_approve_assignments: true,
            can_modify_standard_allocations: true
          });
          count++;
        } else {
          errors.push(`Plan owner not found: ${planOwnerName}`);
        }
      } catch (error) {
        errors.push(`Role planner error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { count, errors };
  }

  async importFromFile(filePath: string, clearExisting = false): Promise<ImportResultV2> {
    const result: ImportResultV2 = {
      success: false,
      imported: {
        locations: 0,
        projectTypes: 0,
        phases: 0,
        roles: 0,
        people: 0,
        projects: 0,
        standardAllocations: 0,
        assignments: 0,
        phaseTimelines: 0,
        demands: 0,
        availabilityOverrides: 0
      },
      errors: [],
      warnings: []
    };

    try {
      if (clearExisting) {
        await this.clearExistingData();
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      // Import in dependency order
      
      // 1. Project Types
      const typesResult = await this.importProjectTypes(workbook.getWorksheet('Project Types'));
      result.imported.projectTypes = typesResult.count;
      result.errors.push(...typesResult.errors);

      // 2. Project Phases
      const phasesResult = await this.importProjectPhases(workbook.getWorksheet('Project Phases'));
      result.imported.phases = phasesResult.count;
      result.errors.push(...phasesResult.errors);

      // 3. Roles
      const rolesResult = await this.importRoles(workbook.getWorksheet('Roles'));
      result.imported.roles = rolesResult.count;
      result.errors.push(...rolesResult.errors);

      // 4. Roster (People)
      const rosterResult = await this.importRoster(workbook.getWorksheet('Roster'));
      result.imported.people = rosterResult.count;
      result.errors.push(...rosterResult.errors);

      // 5. Projects
      const projectsResult = await this.importProjects(workbook.getWorksheet('Projects'));
      result.imported.projects = projectsResult.count;
      result.errors.push(...projectsResult.errors);

      // 6. Project Roadmap (Phase Timelines)
      const roadmapResult = await this.importProjectRoadmap(workbook.getWorksheet('Project Roadmap'));
      result.imported.phaseTimelines = roadmapResult.count;
      result.errors.push(...roadmapResult.errors);

      // 7. Standard Allocations
      const allocationsResult = await this.importStandardAllocations(workbook.getWorksheet('Standard Allocations'));
      result.imported.standardAllocations = allocationsResult.count;
      result.errors.push(...allocationsResult.errors);

      // 8. Project Demand
      const demandResult = await this.importProjectDemand(workbook.getWorksheet('Project Demand'));
      result.imported.demands = demandResult.count;
      result.errors.push(...demandResult.errors);

      // 9. Project Assignments
      const assignmentsResult = await this.importProjectAssignments(workbook.getWorksheet('Project Assignments'));
      result.imported.assignments = assignmentsResult.count;
      result.errors.push(...assignmentsResult.errors);

      // 10. Process Role Planners
      const plannersResult = await this.processRolePlanners();
      result.warnings.push(...plannersResult.errors);

      // Count imported locations
      result.imported.locations = await db('locations').count('* as count').first().then(r => parseInt(r?.count || '0'));
      
      // Count availability overrides
      result.imported.availabilityOverrides = await db('person_availability_overrides').count('* as count').first().then(r => parseInt(r?.count || '0'));

      result.success = result.errors.length === 0;

    } catch (error) {
      result.errors.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }
}