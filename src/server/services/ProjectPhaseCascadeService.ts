import { Knex } from 'knex';
import { DependencyType, ProjectPhaseTimeline, ProjectPhaseDependency } from '../types/project-phases.js';

export interface CascadeCalculation {
  phase_timeline_id: string;
  phase_name: string;
  current_start_date: string;
  current_end_date: string;
  new_start_date: string;
  new_end_date: string;
  dependency_type: DependencyType;
  lag_days: number;
  affects_count: number; // How many phases this change affects
}

export interface CascadeResult {
  affected_phases: CascadeCalculation[];
  cascade_count: number;
  circular_dependencies: string[]; // Any circular dependency issues found
}

export class ProjectPhaseCascadeService {
  constructor(private db: Knex) {}

  /**
   * Format a Date object to YYYY-MM-DD string in a timezone-safe way
   * This ensures business dates remain consistent regardless of server timezone
   */
  private formatDateSafe(date: Date): string {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      throw new Error('Invalid date object');
    }
    
    // Use local date components to avoid timezone shifts
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  /**
   * Parse a YYYY-MM-DD date string as a timezone-independent business date
   */
  private parseDateSafe(dateString: string): Date {
    if (!dateString) throw new Error('Date string is required');
    
    const [year, month, day] = dateString.split('-').map(Number);
    if (!year || !month || !day) throw new Error('Invalid date format, expected YYYY-MM-DD');
    
    // Create date in local timezone to represent the business date
    return new Date(year, month - 1, day);
  }

  /**
   * Add days to a date string in a timezone-safe way
   */
  private addDaysSafe(dateString: string, days: number): string {
    const date = this.parseDateSafe(dateString);
    date.setDate(date.getDate() + days);
    return this.formatDateSafe(date);
  }

  /**
   * Calculate cascade effects for a phase date change
   */
  async calculateCascade(
    projectId: string,
    changedPhaseId: string,
    newStartDate: Date,
    newEndDate: Date
  ): Promise<CascadeResult> {
    // Build dependency graph for the project
    const dependencyGraph = await this.buildDependencyGraph(projectId);
    
    // Find all phases affected by this change
    const affectedPhases = await this.findAffectedPhases(
      dependencyGraph,
      changedPhaseId,
      newStartDate,
      newEndDate
    );

    // Check for circular dependencies
    const circularDependencies = this.detectCircularDependencies(dependencyGraph);

    return {
      affected_phases: affectedPhases,
      cascade_count: affectedPhases.length,
      circular_dependencies: circularDependencies
    };
  }

  /**
   * Apply cascade changes to the database
   */
  async applyCascade(projectId: string, cascadeResult: CascadeResult): Promise<void> {
    const trx = await this.db.transaction();
    
    try {
      for (const change of cascadeResult.affected_phases) {
        await trx('project_phases_timeline')
          .where('id', change.phase_timeline_id)
          .update({
            start_date: change.new_start_date,
            end_date: change.new_end_date,
            updated_at: new Date().toISOString()
          });
      }
      
      await trx.commit();
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }

  /**
   * Build a dependency graph for the project
   */
  private async buildDependencyGraph(projectId: string): Promise<Map<string, DependencyNode>> {
    // Get all phases for the project
    const phases = await this.db('project_phases_timeline as ppt')
      .join('project_phases as pp', 'ppt.phase_id', 'pp.id')
      .where('ppt.project_id', projectId)
      .select(
        'ppt.id',
        'ppt.start_date',
        'ppt.end_date',
        'pp.name as phase_name'
      );

    // Get all dependencies for the project
    const dependencies = await this.db('project_phase_dependencies')
      .where('project_id', projectId)
      .select('*');

    // Build the graph
    const graph = new Map<string, DependencyNode>();

    // Initialize nodes
    phases.forEach(phase => {
      graph.set(phase.id, {
        id: phase.id,
        phase_name: phase.phase_name,
        start_date: phase.start_date,
        end_date: phase.end_date,
        dependencies: [], // Phases this one depends on
        dependents: []    // Phases that depend on this one
      });
    });

    // Add dependency relationships
    dependencies.forEach(dep => {
      const predecessor = graph.get(dep.predecessor_phase_timeline_id);
      const successor = graph.get(dep.successor_phase_timeline_id);

      if (predecessor && successor) {
        // Add dependency info
        successor.dependencies.push({
          predecessor_id: dep.predecessor_phase_timeline_id,
          dependency_type: dep.dependency_type,
          lag_days: dep.lag_days || 0
        });

        predecessor.dependents.push({
          successor_id: dep.successor_phase_timeline_id,
          dependency_type: dep.dependency_type,
          lag_days: dep.lag_days || 0
        });
      }
    });

    return graph;
  }

  /**
   * Find all phases affected by a change to a specific phase
   */
  private async findAffectedPhases(
    graph: Map<string, DependencyNode>,
    changedPhaseId: string,
    newStartDate: Date,
    newEndDate: Date
  ): Promise<CascadeCalculation[]> {
    const affectedPhases: CascadeCalculation[] = [];
    const visited = new Set<string>();
    const queue = [{ phaseId: changedPhaseId, triggerStartDate: newStartDate, triggerEndDate: newEndDate }];

    while (queue.length > 0) {
      const { phaseId, triggerStartDate, triggerEndDate } = queue.shift()!;
      
      if (visited.has(phaseId)) continue;
      visited.add(phaseId);

      const phase = graph.get(phaseId);
      if (!phase) continue;

      // Process all dependents (phases that depend on this one)
      for (const dependent of phase.dependents) {
        const dependentPhase = graph.get(dependent.successor_id);
        if (!dependentPhase || visited.has(dependent.successor_id)) continue;

        // Calculate new dates based on dependency type
        const newDates = this.calculateDependentDates(
          triggerStartDate,
          triggerEndDate,
          dependentPhase,
          dependent.dependency_type,
          dependent.lag_days
        );

        // Only add if dates actually change (timezone-safe comparison)
        const currentStartStr = dependentPhase.start_date;
        const currentEndStr = dependentPhase.end_date;
        const newStartStr = this.formatDateSafe(newDates.start);
        const newEndStr = this.formatDateSafe(newDates.end);
        
        if (currentStartStr !== newStartStr || currentEndStr !== newEndStr) {
          
          affectedPhases.push({
            phase_timeline_id: dependent.successor_id,
            phase_name: dependentPhase.phase_name,
            current_start_date: dependentPhase.start_date,
            current_end_date: dependentPhase.end_date,
            new_start_date: this.formatDateSafe(newDates.start),
            new_end_date: this.formatDateSafe(newDates.end),
            dependency_type: dependent.dependency_type,
            lag_days: dependent.lag_days,
            affects_count: dependentPhase.dependents.length
          });

          // Add to queue to process its dependents
          queue.push({
            phaseId: dependent.successor_id,
            triggerStartDate: newDates.start,
            triggerEndDate: newDates.end
          });
        }
      }
    }

    return affectedPhases;
  }

  /**
   * Calculate new dates for a dependent phase based on dependency type
   */
  private calculateDependentDates(
    predecessorStartDate: Date,
    predecessorEndDate: Date,
    dependentPhase: DependencyNode,
    dependencyType: DependencyType,
    lagDays: number
  ): { start: Date; end: Date } {
    // Calculate duration in days (timezone-safe)
    const currentStartDate = this.parseDateSafe(dependentPhase.start_date);
    const currentEndDate = this.parseDateSafe(dependentPhase.end_date);
    const durationDays = Math.max(1, Math.round((currentEndDate.getTime() - currentStartDate.getTime()) / (1000 * 60 * 60 * 24)));

    let newStart: Date;
    const predecessorEndStr = this.formatDateSafe(predecessorEndDate);

    switch (dependencyType) {
      case 'FS': // Finish-to-Start: successor starts on or after predecessor finishes (allow same-day)
        const newStartStr = this.addDaysSafe(predecessorEndStr, lagDays);
        newStart = this.parseDateSafe(newStartStr);
        break;
      
      case 'SS': // Start-to-Start: successor starts when predecessor starts
        const predecessorStartStr = this.formatDateSafe(predecessorStartDate);
        const newStartStrSS = this.addDaysSafe(predecessorStartStr, lagDays);
        newStart = this.parseDateSafe(newStartStrSS);
        break;
      
      case 'FF': // Finish-to-Finish: successor finishes when predecessor finishes
        const newEndStrFF = this.addDaysSafe(predecessorEndStr, lagDays);
        const newEndFF = this.parseDateSafe(newEndStrFF);
        const newStartStrFF = this.addDaysSafe(newEndStrFF, -durationDays);
        newStart = this.parseDateSafe(newStartStrFF);
        return { start: newStart, end: newEndFF };
      
      case 'SF': // Start-to-Finish: successor finishes when predecessor starts
        const predecessorStartStrSF = this.formatDateSafe(predecessorStartDate);
        const newEndStrSF = this.addDaysSafe(predecessorStartStrSF, lagDays);
        const newEndSF = this.parseDateSafe(newEndStrSF);
        const newStartStrSF = this.addDaysSafe(newEndStrSF, -durationDays);
        newStart = this.parseDateSafe(newStartStrSF);
        return { start: newStart, end: newEndSF };
      
      default:
        newStart = this.parseDateSafe(dependentPhase.start_date);
    }

    // Calculate end date based on duration
    const newEndStr = this.addDaysSafe(this.formatDateSafe(newStart), durationDays);
    const newEnd = this.parseDateSafe(newEndStr);

    return { start: newStart, end: newEnd };
  }

  /**
   * Detect circular dependencies in the graph
   */
  private detectCircularDependencies(graph: Map<string, DependencyNode>): string[] {
    const circular: string[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string, path: string[]): void => {
      if (recursionStack.has(nodeId)) {
        circular.push(`Circular dependency detected: ${path.join(' -> ')} -> ${nodeId}`);
        return;
      }
      
      if (visited.has(nodeId)) return;

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const node = graph.get(nodeId);
      if (node) {
        for (const dependent of node.dependents) {
          dfs(dependent.successor_id, [...path, nodeId]);
        }
      }

      recursionStack.delete(nodeId);
    };

    // Check all nodes
    for (const nodeId of graph.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    }

    return circular;
  }
}

interface DependencyNode {
  id: string;
  phase_name: string;
  start_date: string;
  end_date: string;
  dependencies: Array<{
    predecessor_id: string;
    dependency_type: DependencyType;
    lag_days: number;
  }>;
  dependents: Array<{
    successor_id: string;
    dependency_type: DependencyType;
    lag_days: number;
  }>;
}