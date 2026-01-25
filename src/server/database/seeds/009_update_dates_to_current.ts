import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  console.log('🔄 Updating project and phase dates to be relative to current date...');

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDate = today.getDate();

  // Helper to adjust a date by a certain number of months from today
  const getRelativeDate = (monthsOffset: number, dayOfMonth?: number): string => {
    const date = new Date(currentYear, currentMonth + monthsOffset, dayOfMonth || currentDate);
    return date.toISOString().split('T')[0];
  };


  // Update project dates to be relative to current date
  const projects = await knex('projects').select('*');
  
  console.log(`📅 Updating dates for ${projects.length} projects...`);

  for (const project of projects) {
    let newStartDate: string;
    let newEndDate: string;
    
    // Determine new dates based on project name/type patterns
    if (project.name.includes('2023') || project.name.includes('Phase 1')) {
      // Completed projects (6-12 months ago)
      newStartDate = getRelativeDate(-12);
      newEndDate = getRelativeDate(-6);
    } else if (project.name.includes('2024') || project.name.includes('Phase 2')) {
      // Recently completed or in-progress projects (3 months ago to 3 months future)
      newStartDate = getRelativeDate(-3);
      newEndDate = getRelativeDate(3);
    } else if (project.name.includes('2025') || project.name.includes('v3')) {
      // Current/Active projects (now to 6 months)
      newStartDate = getRelativeDate(-1);
      newEndDate = getRelativeDate(6);
    } else if (project.name.includes('2026') || project.name.includes('2027')) {
      // Future projects (3-12 months out)
      newStartDate = getRelativeDate(3);
      newEndDate = getRelativeDate(12);
    } else {
      // Default: active projects (1 month ago to 5 months future)
      newStartDate = getRelativeDate(-1);
      newEndDate = getRelativeDate(5);
    }

    // Special handling for specific project types
    if (project.name.toLowerCase().includes('migration')) {
      // Migration projects tend to be longer
      newEndDate = getRelativeDate(8);
    } else if (project.name.toLowerCase().includes('poc') || project.name.toLowerCase().includes('pilot')) {
      // POC/Pilot projects are shorter
      const tempEndDate = new Date(newStartDate);
      tempEndDate.setMonth(tempEndDate.getMonth() + 3);
      newEndDate = tempEndDate.toISOString().split('T')[0];
    }

    await knex('projects')
      .where('id', project.id)
      .update({
        aspiration_start: newStartDate,
        aspiration_finish: newEndDate,
        updated_at: new Date()
      });
  }

  // Update project phase timelines to align with project dates
  const projectPhaseTimelines = await knex('project_phases_timeline')
    .join('projects', 'project_phases_timeline.project_id', 'projects.id')
    .join('project_phases', 'project_phases_timeline.phase_id', 'project_phases.id')
    .select(
      'project_phases_timeline.*',
      'projects.aspiration_start as project_start',
      'projects.aspiration_finish as project_end',
      'project_phases.name as phase_name',
      'project_phases.order_index'
    );

  console.log(`📅 Updating ${projectPhaseTimelines.length} phase timelines...`);

  // Group by project to ensure phases don't overlap
  const projectGroups = projectPhaseTimelines.reduce((acc, pt) => {
    if (!acc[pt.project_id]) acc[pt.project_id] = [];
    acc[pt.project_id].push(pt);
    return acc;
  }, {} as Record<string, any[]>);

  for (const projectId of Object.keys(projectGroups)) {
    const phases = projectGroups[projectId].sort((a, b) => a.order_index - b.order_index);
    const projectStart = new Date(phases[0].project_start);
    const projectEnd = new Date(phases[0].project_end);
    const projectDuration = (projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24);
    
    // Distribute phases across project duration
    const phaseDuration = Math.floor(projectDuration / phases.length);
    
    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      const phaseStart = new Date(projectStart);
      phaseStart.setDate(phaseStart.getDate() + (i * phaseDuration));
      
      const phaseEnd = new Date(phaseStart);
      if (i === phases.length - 1) {
        // Last phase ends with project
        phaseEnd.setTime(projectEnd.getTime());
      } else {
        phaseEnd.setDate(phaseEnd.getDate() + phaseDuration - 1);
      }
      
      // Special handling for phase types
      if (phase.phase_name.toLowerCase().includes('planning') || phase.phase_name.toLowerCase().includes('discovery')) {
        // Planning phases are typically shorter
        phaseEnd.setDate(phaseStart.getDate() + Math.min(14, phaseDuration - 1));
      } else if (phase.phase_name.toLowerCase().includes('deployment') || phase.phase_name.toLowerCase().includes('rollout')) {
        // Deployment phases might be shorter too
        phaseEnd.setDate(phaseStart.getDate() + Math.min(21, phaseDuration - 1));
      }
      
      await knex('project_phases_timeline')
        .where('id', phase.id)
        .update({
          start_date: phaseStart.toISOString().split('T')[0],
          end_date: phaseEnd.toISOString().split('T')[0],
          updated_at: new Date()
        });
    }
  }

  // Update assignment dates to match their phase timelines (for phase-aligned assignments)
  const phaseAssignments = await knex('project_assignments')
    .where('assignment_date_mode', 'phase')
    .whereNotNull('phase_id');

  console.log(`📅 Updating ${phaseAssignments.length} phase-aligned assignments...`);

  for (const assignment of phaseAssignments) {
    const phaseTimeline = await knex('project_phases_timeline')
      .where('project_id', assignment.project_id)
      .where('phase_id', assignment.phase_id)
      .first();
    
    if (phaseTimeline) {
      await knex('project_assignments')
        .where('id', assignment.id)
        .update({
          computed_start_date: phaseTimeline.start_date,
          computed_end_date: phaseTimeline.end_date,
          updated_at: new Date()
        });
    }
  }

  // Update fixed assignments to have reasonable dates
  const fixedAssignments = await knex('project_assignments')
    .where('assignment_date_mode', 'fixed')
    .join('projects', 'project_assignments.project_id', 'projects.id')
    .select(
      'project_assignments.*',
      'projects.aspiration_start as project_start',
      'projects.aspiration_finish as project_end'
    );

  console.log(`📅 Updating ${fixedAssignments.length} fixed assignments...`);

  for (const assignment of fixedAssignments) {
    // Keep fixed assignments within their project bounds
    const projectStart = new Date(assignment.project_start);
    const projectEnd = new Date(assignment.project_end);
    
    let assignmentStart = new Date(assignment.start_date);
    let assignmentEnd = new Date(assignment.end_date);
    
    // If assignment dates are outside project bounds, adjust them
    if (assignmentStart < projectStart) assignmentStart = projectStart;
    if (assignmentEnd > projectEnd) assignmentEnd = projectEnd;
    
    // If dates are in 2023, shift them to be relative to project dates
    if (assignmentStart.getFullYear() === 2023) {
      const duration = (assignmentEnd.getTime() - assignmentStart.getTime()) / (1000 * 60 * 60 * 24);
      assignmentStart = new Date(projectStart);
      assignmentStart.setDate(assignmentStart.getDate() + 7); // Start a week into project
      assignmentEnd = new Date(assignmentStart);
      assignmentEnd.setDate(assignmentEnd.getDate() + duration);
      
      // Ensure we don't exceed project bounds
      if (assignmentEnd > projectEnd) {
        assignmentEnd = new Date(projectEnd);
        assignmentEnd.setDate(assignmentEnd.getDate() - 7); // End a week before project ends
        assignmentStart = new Date(assignmentEnd);
        assignmentStart.setDate(assignmentStart.getDate() - duration);
      }
    }
    
    await knex('project_assignments')
      .where('id', assignment.id)
      .update({
        start_date: assignmentStart.toISOString().split('T')[0],
        end_date: assignmentEnd.toISOString().split('T')[0],
        computed_start_date: assignmentStart.toISOString().split('T')[0],
        computed_end_date: assignmentEnd.toISOString().split('T')[0],
        updated_at: new Date()
      });
  }

  // Update availability overrides to be current
  const availabilityOverrides = await knex('person_availability_overrides').select('*');
  
  console.log(`📅 Updating ${availabilityOverrides.length} availability overrides...`);
  
  for (const override of availabilityOverrides) {
    let newStartDate: string;
    let newEndDate: string;
    
    // Adjust based on override type
    switch (override.override_type) {
      case 'vacation':
        // Vacations spread throughout the year
        const vacationMonth = Math.floor(Math.random() * 12);
        newStartDate = getRelativeDate(vacationMonth - currentMonth, 1);
        const vacationDuration = Math.floor(Math.random() * 14) + 7; // 7-21 days
        const tempVacationEndDate = new Date(newStartDate);
        tempVacationEndDate.setDate(tempVacationEndDate.getDate() + vacationDuration);
        newEndDate = tempVacationEndDate.toISOString().split('T')[0];
        break;
        
      case 'training':
        // Training in next 6 months
        const trainingMonth = Math.floor(Math.random() * 6);
        newStartDate = getRelativeDate(trainingMonth, 15);
        const tempTrainingEndDate = new Date(newStartDate);
        tempTrainingEndDate.setDate(tempTrainingEndDate.getDate() + 5); // 5 day training
        newEndDate = tempTrainingEndDate.toISOString().split('T')[0];
        break;
        
      case 'medical':
        // Medical leave could be past or future
        const medicalOffset = Math.floor(Math.random() * 6) - 3; // -3 to +3 months
        newStartDate = getRelativeDate(medicalOffset);
        const medicalDuration = Math.floor(Math.random() * 30) + 10; // 10-40 days
        const tempMedicalEndDate = new Date(newStartDate);
        tempMedicalEndDate.setDate(tempMedicalEndDate.getDate() + medicalDuration);
        newEndDate = tempMedicalEndDate.toISOString().split('T')[0];
        break;
        
      default:
        // Keep relative to original pattern
        newStartDate = getRelativeDate(0);
        newEndDate = getRelativeDate(1);
    }
    
    await knex('person_availability_overrides')
      .where('id', override.id)
      .update({
        start_date: newStartDate,
        end_date: newEndDate,
        updated_at: new Date()
      });
  }

  console.log('✅ Successfully updated all dates to be relative to current date!');
  
  // Show summary of projects
  const totalProjects = await knex('projects').count('* as count').first();
  console.log(`📊 Updated ${totalProjects?.count || 0} projects with date distribution spanning past, present, and future`);
}