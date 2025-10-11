#!/usr/bin/env node

/**
 * Retroactive Phase Inheritance Script
 * 
 * This script identifies projects that are missing phases from their project type
 * and applies the corrected phase inheritance logic to populate missing phases.
 */

import knex from 'knex';
import path from 'path';

// Database connection
const db = knex({
  client: 'better-sqlite3',
  connection: {
    filename: process.env.DATABASE_PATH || path.join(process.cwd(), 'data/capacinator.db')
  },
  useNullAsDefault: true
});

interface Project {
  id: string;
  name: string;
  project_type_id: string;
  aspiration_start?: string;
  aspiration_finish?: string;
}

interface ProjectTypePhase {
  order_index: number;
  id: string;
  name: string;
  phase_order_index: number;
}

class RetroactivePhaseInheritance {

  async run() {
    try {
      console.log('🔍 Starting retroactive phase inheritance analysis...');

      // Get all projects with their current phase counts
      const projectsWithPhaseCounts = await this.getProjectsWithPhaseCounts();
      
      // Get expected phase counts for each project type
      const projectTypePhases = await this.getProjectTypePhases();

      // Identify projects missing phases
      const projectsMissingPhases = this.identifyProjectsMissingPhases(
        projectsWithPhaseCounts,
        projectTypePhases
      );

      console.log(`\n📊 Analysis Results:`);
      console.log(`   • Total projects analyzed: ${projectsWithPhaseCounts.length}`);
      console.log(`   • Projects missing phases: ${projectsMissingPhases.length}`);

      if (projectsMissingPhases.length === 0) {
        console.log('✅ All projects already have complete phase timelines!');
        return;
      }

      // Display projects that need phase inheritance
      console.log('\n🔧 Projects that will receive missing phases:');
      for (const project of projectsMissingPhases) {
        const expected = projectTypePhases[project.project_type_id]?.length || 0;
        console.log(`   • ${project.name}: ${project.current_phases}/${expected} phases`);
      }

      // Apply missing phases
      console.log('\n⚙️  Applying missing phases...');
      let successCount = 0;
      let errorCount = 0;

      for (const project of projectsMissingPhases) {
        try {
          await this.applyMissingPhases(project, projectTypePhases[project.project_type_id] || []);
          successCount++;
          console.log(`   ✅ Applied phases to: ${project.name}`);
        } catch (error) {
          errorCount++;
          console.error(`   ❌ Failed to apply phases to ${project.name}:`, error);
        }
      }

      console.log(`\n🎉 Retroactive phase inheritance completed!`);
      console.log(`   • Projects updated: ${successCount}`);
      console.log(`   • Errors: ${errorCount}`);

    } catch (error) {
      console.error('❌ Script failed:', error);
      process.exit(1);
    } finally {
      await db.destroy();
    }
  }

  private async getProjectsWithPhaseCounts() {
    const query = `
      SELECT 
        p.id,
        p.name,
        p.project_type_id,
        p.aspiration_start,
        p.aspiration_finish,
        COUNT(pt.id) as current_phases
      FROM projects p
      LEFT JOIN project_phases_timeline pt ON p.id = pt.project_id
      WHERE p.project_type_id IS NOT NULL
      GROUP BY p.id, p.name, p.project_type_id, p.aspiration_start, p.aspiration_finish
      ORDER BY p.name
    `;

    return await db.raw(query).then(result => result);
  }

  private async getProjectTypePhases() {
    const query = `
      SELECT 
        ptp.project_type_id,
        ptp.order_index,
        pp.id,
        pp.name,
        pp.order_index as phase_order_index
      FROM project_type_phases ptp
      LEFT JOIN project_phases pp ON ptp.phase_id = pp.id
      ORDER BY ptp.project_type_id, ptp.order_index
    `;

    const phases = await db.raw(query).then(result => result);
    
    // Group phases by project type
    const projectTypePhases: { [key: string]: ProjectTypePhase[] } = {};
    for (const phase of phases) {
      if (!projectTypePhases[phase.project_type_id]) {
        projectTypePhases[phase.project_type_id] = [];
      }
      projectTypePhases[phase.project_type_id].push(phase);
    }

    return projectTypePhases;
  }

  private identifyProjectsMissingPhases(
    projectsWithPhaseCounts: any[],
    projectTypePhases: { [key: string]: ProjectTypePhase[] }
  ) {
    return projectsWithPhaseCounts.filter(project => {
      const expectedPhases = projectTypePhases[project.project_type_id]?.length || 0;
      return project.current_phases < expectedPhases;
    });
  }

  private async applyMissingPhases(project: any, expectedPhases: ProjectTypePhase[]) {
    if (expectedPhases.length === 0) {
      return;
    }

    // Get existing phases for this project
    const existingPhases = await db('project_phases_timeline')
      .select('phase_id')
      .where('project_id', project.id);

    const existingPhaseIds = new Set(existingPhases.map(p => p.phase_id));

    // Filter to only missing phases
    const missingPhases = expectedPhases.filter(phase => !existingPhaseIds.has(phase.id));

    if (missingPhases.length === 0) {
      return;
    }

    // Calculate default phase dates
    const now = new Date();
    const projectStart = project.aspiration_start ? new Date(project.aspiration_start) : now;
    const projectEnd = project.aspiration_finish ? new Date(project.aspiration_finish) : 
      new Date(projectStart.getTime() + (365 * 24 * 60 * 60 * 1000)); // Default to 1 year

    const totalDuration = projectEnd.getTime() - projectStart.getTime();
    const phaseDuration = totalDuration / expectedPhases.length;

    // Create timeline entries for missing phases
    const timelineEntries = missingPhases.map((phase, index) => {
      // Calculate position based on phase order within all expected phases
      const phasePosition = expectedPhases.findIndex(p => p.id === phase.id);
      const phaseStart = new Date(projectStart.getTime() + (phasePosition * phaseDuration));
      const phaseEnd = new Date(projectStart.getTime() + ((phasePosition + 1) * phaseDuration));

      return {
        id: `phase-timeline-${project.id}-${phase.id}-${Date.now()}-${index}`,
        project_id: project.id,
        phase_id: phase.id,
        start_date: phaseStart.getTime(),
        end_date: phaseEnd.getTime(),
        created_at: new Date(),
        updated_at: new Date()
      };
    });

    // Insert missing phase timeline entries
    if (timelineEntries.length > 0) {
      await db('project_phases_timeline').insert(timelineEntries);
    }
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const script = new RetroactivePhaseInheritance();
  script.run().catch(console.error);
}

export { RetroactivePhaseInheritance };