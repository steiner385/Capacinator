import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';

// Types for recommendation system
interface RecommendationAction {
  type: 'add' | 'remove' | 'modify';
  assignment_id?: string;
  person_id: string;
  person_name: string;
  project_id: string;
  project_name: string;
  role_id: string;
  role_name: string;
  current_allocation?: number;
  new_allocation: number;
  start_date: string;
  end_date: string;
  rationale: string;
}

interface Recommendation {
  id: string;
  type: 'simple' | 'complex';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact_summary: string;
  confidence_score: number;
  actions: RecommendationAction[];
  current_state: {
    utilization_issues: number;
    capacity_gaps: number;
    overallocated_people: number;
    underutilized_people: number;
  };
  projected_state: {
    utilization_issues: number;
    capacity_gaps: number;
    overallocated_people: number;
    underutilized_people: number;
  };
  benefits: string[];
  risks: string[];
  effort_estimate: 'low' | 'medium' | 'high';
  timeline_impact: string;
}

export class RecommendationsController extends BaseController {
  async getRecommendations(req: Request, res: Response) {
    const { startDate, endDate, focus, maxRecommendations = 10 } = req.query;

    const result = await this.executeQuery(async () => {
      console.log('🤖 Generating assignment recommendations...');
      console.log('🔍 Request params:', { startDate, endDate, focus, maxRecommendations });
      
      // Get current state data
      const currentState = await this.getCurrentSystemState(startDate as string, endDate as string);
      console.log('📊 Current state summary:', currentState.summary);
      
      // Generate different types of recommendations
      const recommendations: Recommendation[] = [];
      
      // 1. Simple recommendations (single actions)
      console.log('🔄 Calling generateSimpleRecommendations...');
      const simpleRecs = await this.generateSimpleRecommendations(currentState, startDate as string, endDate as string);
      console.log(`📋 Simple recommendations generated: ${simpleRecs.length}`);
      recommendations.push(...simpleRecs);
      
      // 2. Complex recommendations (multi-action)
      console.log('🔄 Calling generateComplexRecommendations...');
      const complexRecs = await this.generateComplexRecommendations(currentState, startDate as string, endDate as string);
      console.log(`📋 Complex recommendations generated: ${complexRecs.length}`);
      recommendations.push(...complexRecs);
      
      // Sort by priority and confidence score
      recommendations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.confidence_score - a.confidence_score;
      });
      
      // Apply focus filter if specified
      const filteredRecs = focus ? this.filterByFocus(recommendations, focus as string) : recommendations;
      
      // Limit results
      const limitedRecs = filteredRecs.slice(0, Number(maxRecommendations));
      
      console.log(`🤖 Generated ${limitedRecs.length} recommendations`);
      
      return {
        recommendations: limitedRecs,
        current_state: currentState,
        metadata: {
          total_generated: recommendations.length,
          filtered_count: filteredRecs.length,
          returned_count: limitedRecs.length,
          focus_applied: focus || null,
          date_range: { startDate, endDate }
        }
      };
    }, res, 'Failed to generate recommendations');

    if (result) {
      res.json(result);
    }
  }

  async executeRecommendation(req: Request, res: Response) {
    const { recommendationId } = req.params;
    const { actions } = req.body;

    const result = await this.executeQuery(async () => {
      console.log(`🚀 Executing recommendation ${recommendationId}...`);
      
      // Start a transaction for atomic execution
      const executionResults = await this.db.transaction(async (trx) => {
        const results = [];
        
        // Execute each action in the recommendation
        for (const action of actions) {
          try {
            const actionResult = await this.executeRecommendationAction(action, trx);
            results.push({
              action_id: action.id || `${action.type}_${action.person_id}_${action.project_id}`,
              status: 'success',
              result: actionResult
            });
          } catch (error) {
            // If any action fails, the transaction will rollback
            results.push({
              action_id: action.id || `${action.type}_${action.person_id}_${action.project_id}`,
              status: 'failed',
              error: error instanceof Error ? error.message : String(error)
            });
            throw error; // This will trigger rollback
          }
        }
        
        return results;
      });
      
      console.log(`✅ Successfully executed recommendation ${recommendationId}`);
      
      return {
        recommendation_id: recommendationId,
        execution_status: 'completed',
        actions_executed: executionResults.length,
        results: executionResults,
        executed_at: new Date().toISOString()
      };
      
    }, res, 'Failed to execute recommendation');

    if (result) {
      res.json(result);
    }
  }

  private async getCurrentSystemState(startDate?: string, endDate?: string) {
    // If no date range provided, use forward-looking 3-month period like utilization reports
    const currentDate = new Date();
    const defaultStartDate = currentDate.toISOString().split('T')[0];
    const defaultEndDate = new Date(currentDate.getTime() + (3 * 30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]; // 3 months ahead
    
    const effectiveStartDate = startDate || defaultStartDate;
    const effectiveEndDate = endDate || defaultEndDate;
    
    // Get utilization data - only include assignments that overlap with the specified time period
    const utilizationData = await this.db.raw(`
      SELECT 
        p.id as person_id,
        p.name as person_name,
        COALESCE(SUM(pa.allocation_percentage), 0) as total_allocation,
        p.default_availability_percentage as capacity,
        COUNT(pa.id) as assignment_count,
        pr.role_id as primary_role_id,
        r.name as primary_role_name
      FROM people p
      LEFT JOIN project_assignments pa ON p.id = pa.person_id 
        AND pa.start_date <= '${effectiveEndDate}' 
        AND pa.end_date >= '${effectiveStartDate}'
      LEFT JOIN person_roles pr ON p.primary_person_role_id = pr.id
      LEFT JOIN roles r ON pr.role_id = r.id
      WHERE p.is_active = 1
      GROUP BY p.id, p.name, p.default_availability_percentage, pr.role_id, r.name
    `);

    // Get capacity gaps
    const capacityGaps = await this.db('capacity_gaps_view').select('*');

    // Get unassigned projects - projects with no assignments in the current time period
    const unassignedProjects = await this.db.raw(`
      SELECT DISTINCT p.*, pt.name as project_type_name
      FROM projects p
      LEFT JOIN project_types pt ON p.project_type_id = pt.id
      LEFT JOIN project_assignments pa ON p.id = pa.project_id 
        AND pa.start_date <= '${effectiveEndDate}' 
        AND pa.end_date >= '${effectiveStartDate}'
      WHERE pa.id IS NULL AND p.include_in_demand = 1
      AND (p.aspiration_start IS NULL OR p.aspiration_start <= '${effectiveEndDate}')
      AND (p.aspiration_finish IS NULL OR p.aspiration_finish >= '${effectiveStartDate}')
    `);

    const overallocated = utilizationData.filter((p: any) => p.total_allocation > (p.capacity || 100));
    const underutilized = utilizationData.filter((p: any) => p.total_allocation < 70);
    const available = utilizationData.filter((p: any) => p.total_allocation === 0);

    return {
      people: utilizationData,
      capacity_gaps: capacityGaps,
      unassigned_projects: unassignedProjects,
      summary: {
        total_people: utilizationData.length,
        overallocated_people: overallocated.length,
        underutilized_people: underutilized.length,
        available_people: available.length,
        capacity_gaps: capacityGaps.filter(gap => gap.status === 'GAP').length,
        unassigned_projects: unassignedProjects.length
      }
    };
  }

  private async generateSimpleRecommendations(currentState: any, startDate: string, endDate: string): Promise<Recommendation[]> {
    console.log('🚀 generateSimpleRecommendations called');
    const recommendations: Recommendation[] = [];

    // Get a default role to use as fallback when both project and person roles are null
    const defaultRole = await this.db('roles').select('id', 'name').first();
    
    // 1. Assign available people to projects
    const availablePeople = currentState.people.filter((p: any) => p.total_allocation === 0);
    const unassignedProjects = currentState.unassigned_projects;

    console.log(`🔍 Generating simple recommendations: ${availablePeople.length} available people, ${unassignedProjects.length} unassigned projects`);
    
    if (availablePeople.length === 0) {
      console.log('⚠️  No available people found');
    }
    if (unassignedProjects.length === 0) {
      console.log('⚠️  No unassigned projects found');
    }

    for (const person of availablePeople.slice(0, 3)) { // Limit to top 3
      for (const project of unassignedProjects.slice(0, 2)) { // Limit to top 2 projects per person
        const matchScore = await this.calculatePersonProjectMatch(person, project);
        console.log(`   - ${person.person_name} <-> ${project.name}: score = ${matchScore}`);
        
        if (matchScore >= 50) { // Recommend reasonable matches
          const allocation = this.calculateOptimalAllocation(person, project);
          
          recommendations.push({
            id: `assign_${person.person_id}_${project.id}`,
            type: 'simple',
            priority: project.priority === 1 ? 'high' : project.priority === 2 ? 'medium' : 'low',
            title: `Assign ${person.person_name} to ${project.name}`,
            description: `${person.person_name} is currently available and would be a good fit for ${project.name} (${matchScore}% match)`,
            impact_summary: `Utilizes available capacity and advances project progress`,
            confidence_score: matchScore,
            actions: [{
              type: 'add',
              person_id: person.person_id,
              person_name: person.person_name,
              project_id: project.id,
              project_name: project.name,
              role_id: person.primary_role_id || defaultRole.id,
              role_name: person.primary_role_name || defaultRole.name,
              new_allocation: allocation,
              start_date: startDate || project.aspiration_start,
              end_date: endDate || project.aspiration_finish,
              rationale: `Good skill match (${matchScore}%) and available capacity`
            }],
            current_state: {
              utilization_issues: 1,
              capacity_gaps: 0,
              overallocated_people: 0,
              underutilized_people: 1
            },
            projected_state: {
              utilization_issues: 0,
              capacity_gaps: 0,
              overallocated_people: 0,
              underutilized_people: 0
            },
            benefits: [
              `Utilizes ${person.person_name}'s available capacity`,
              `Advances ${project.name} progress`,
              'Improves overall resource utilization'
            ],
            risks: ['New assignment may require onboarding time'],
            effort_estimate: 'low',
            timeline_impact: 'Immediate positive impact on project timeline'
          });
        }
      }
    }

    // 2. Reduce overallocation
    const overallocated = currentState.people.filter((p: any) => p.total_allocation > (p.capacity || 100));
    
    for (const person of overallocated.slice(0, 3)) {
      const assignments = await this.getPersonAssignments(person.person_id, startDate, endDate);
      const excessAllocation = person.total_allocation - (person.capacity || 100);
      
      // Find assignments that could be reduced or removed
      const flexibleAssignments = assignments.filter(a => a.allocation_percentage >= excessAllocation);
      
      if (flexibleAssignments.length > 0) {
        const targetAssignment = flexibleAssignments[0]; // Take the first suitable one
        const newAllocation = Math.max(0, targetAssignment.allocation_percentage - excessAllocation);
        
        recommendations.push({
          id: `reduce_${person.person_id}_${targetAssignment.id}`,
          type: 'simple',
          priority: 'high',
          title: `Reduce ${person.person_name}'s allocation on ${targetAssignment.project_name}`,
          description: `${person.person_name} is overallocated (${person.total_allocation}%). Reducing allocation on ${targetAssignment.project_name}`,
          impact_summary: `Resolves overallocation and prevents burnout`,
          confidence_score: 85,
          actions: [{
            type: newAllocation === 0 ? 'remove' : 'modify',
            assignment_id: targetAssignment.id,
            person_id: person.person_id,
            person_name: person.person_name,
            project_id: targetAssignment.project_id,
            project_name: targetAssignment.project_name,
            role_id: targetAssignment.role_id,
            role_name: targetAssignment.role_name,
            current_allocation: targetAssignment.allocation_percentage,
            new_allocation: newAllocation,
            start_date: targetAssignment.start_date,
            end_date: targetAssignment.end_date,
            rationale: `Reduces overallocation from ${person.total_allocation}% to ${person.total_allocation - excessAllocation}%`
          }],
          current_state: {
            utilization_issues: 1,
            capacity_gaps: 0,
            overallocated_people: 1,
            underutilized_people: 0
          },
          projected_state: {
            utilization_issues: 0,
            capacity_gaps: 0,
            overallocated_people: 0,
            underutilized_people: 0
          },
          benefits: [
            'Prevents burnout and quality issues',
            'Brings allocation within capacity limits',
            'May free up capacity for other projects'
          ],
          risks: ['May delay project timeline', 'Requires finding alternative resources'],
          effort_estimate: 'low',
          timeline_impact: 'May extend project timeline but improves quality'
        });
      }
    }

    return recommendations;
  }

  private async generateComplexRecommendations(currentState: any, startDate: string, endDate: string): Promise<Recommendation[]> {
    console.log('🚀 generateComplexRecommendations called');
    const recommendations: Recommendation[] = [];

    // Get a default role to use as fallback when both project and person roles are null
    const defaultRole = await this.db('roles').select('id', 'name').first();

    // Complex recommendation: Capacity rebalancing
    const overallocated = currentState.people.filter((p: any) => p.total_allocation > (p.capacity || 100));
    const underutilized = currentState.people.filter((p: any) => p.total_allocation < 70 && p.total_allocation > 0);

    if (overallocated.length > 0 && underutilized.length > 0) {
      // Find opportunities to move work from overallocated to underutilized people
      const rebalanceActions: RecommendationAction[] = [];
      let totalCapacityFreed = 0;
      let totalCapacityUsed = 0;

      for (const overPerson of overallocated.slice(0, 2)) {
        const assignments = await this.getPersonAssignments(overPerson.person_id, startDate, endDate);
        const excessAllocation = overPerson.total_allocation - (overPerson.capacity || 100);

        for (const assignment of assignments) {
          if (assignment.allocation_percentage >= excessAllocation) {
            // Find underutilized person with matching skills
            const suitablePerson = underutilized.find(p => {
              const availableCapacity = (p.capacity || 100) - p.total_allocation;
              return availableCapacity >= assignment.allocation_percentage && 
                     p.primary_role_id === assignment.role_id;
            });

            if (suitablePerson) {
              // Remove from overallocated person
              rebalanceActions.push({
                type: 'remove',
                assignment_id: assignment.id,
                person_id: overPerson.person_id,
                person_name: overPerson.person_name,
                project_id: assignment.project_id,
                project_name: assignment.project_name,
                role_id: assignment.role_id,
                role_name: assignment.role_name,
                current_allocation: assignment.allocation_percentage,
                new_allocation: 0,
                start_date: assignment.start_date,
                end_date: assignment.end_date,
                rationale: `Remove from overallocated ${overPerson.person_name} (${overPerson.total_allocation}%)`
              });

              // Add to underutilized person
              rebalanceActions.push({
                type: 'add',
                person_id: suitablePerson.person_id,
                person_name: suitablePerson.person_name,
                project_id: assignment.project_id,
                project_name: assignment.project_name,
                role_id: assignment.role_id,
                role_name: assignment.role_name,
                new_allocation: assignment.allocation_percentage,
                start_date: assignment.start_date,
                end_date: assignment.end_date,
                rationale: `Assign to underutilized ${suitablePerson.person_name} (${suitablePerson.total_allocation}%)`
              });

              totalCapacityFreed += assignment.allocation_percentage;
              totalCapacityUsed += assignment.allocation_percentage;
              break; // One assignment per overallocated person for this recommendation
            }
          }
        }
      }

      if (rebalanceActions.length > 0) {
        recommendations.push({
          id: `rebalance_${Date.now()}`,
          type: 'complex',
          priority: 'high',
          title: 'Rebalance team workload',
          description: `Move assignments from overallocated team members to underutilized ones`,
          impact_summary: `Rebalances ${rebalanceActions.length / 2} assignments to optimize team utilization`,
          confidence_score: 75,
          actions: rebalanceActions,
          current_state: {
            utilization_issues: overallocated.length + underutilized.length,
            capacity_gaps: 0,
            overallocated_people: overallocated.length,
            underutilized_people: underutilized.length
          },
          projected_state: {
            utilization_issues: Math.max(0, overallocated.length + underutilized.length - rebalanceActions.length / 2),
            capacity_gaps: 0,
            overallocated_people: Math.max(0, overallocated.length - rebalanceActions.filter(a => a.type === 'remove').length),
            underutilized_people: Math.max(0, underutilized.length - rebalanceActions.filter(a => a.type === 'add').length)
          },
          benefits: [
            'Optimizes team utilization',
            'Prevents burnout of overallocated team members',
            'Better utilizes underutilized capacity',
            'Maintains project continuity'
          ],
          risks: [
            'Transition period may temporarily impact productivity',
            'Knowledge transfer required',
            'Team members may need time to adapt'
          ],
          effort_estimate: 'medium',
          timeline_impact: 'Short-term transition period, long-term improvement'
        });
      }
    }

    return recommendations;
  }

  private async calculatePersonProjectMatch(person: any, project: any): Promise<number> {
    let score = 40; // Base score

    // Note: Projects don't have assigned roles, so we skip role matching for now

    // Priority boost (1=High, 2=Medium, 3=Low)
    if (project.priority === 1) score += 20;
    else if (project.priority === 2) score += 10;

    // Location match (if available)
    if (person.location_id && project.location_id && person.location_id === project.location_id) {
      score += 15;
    }

    // Project type preference (simplified)
    score += Math.random() * 10; // Randomized for demo

    return Math.min(100, score);
  }

  private calculateOptimalAllocation(person: any, project: any): number {
    const availableCapacity = (person.capacity || 100) - person.total_allocation;
    
    // Conservative allocation based on project priority (1=High, 2=Medium, 3=Low)
    if (project.priority === 1) {
      return Math.min(availableCapacity, 40);
    } else if (project.priority === 2) {
      return Math.min(availableCapacity, 30);
    } else {
      return Math.min(availableCapacity, 20);
    }
  }

  private async getPersonAssignments(personId: string, startDate?: string, endDate?: string) {
    // Use forward-looking 3-month period if no date range provided
    const currentDate = new Date();
    const defaultStartDate = currentDate.toISOString().split('T')[0];
    const defaultEndDate = new Date(currentDate.getTime() + (3 * 30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]; // 3 months ahead
    
    const effectiveStartDate = startDate || defaultStartDate;
    const effectiveEndDate = endDate || defaultEndDate;
    
    const query = this.db('project_assignments')
      .join('projects', 'project_assignments.project_id', 'projects.id')
      .join('roles', 'project_assignments.role_id', 'roles.id')
      .select(
        'project_assignments.*',
        'projects.name as project_name',
        'projects.priority',
        'roles.name as role_name'
      )
      .where('project_assignments.person_id', personId)
      .where('project_assignments.start_date', '<=', effectiveEndDate)
      .where('project_assignments.end_date', '>=', effectiveStartDate);

    return await query;
  }

  private async executeRecommendationAction(action: RecommendationAction, trx: any) {
    console.log(`🔄 Executing ${action.type} action for ${action.person_name} on ${action.project_name}`);

    switch (action.type) {
      case 'add':
        const [newAssignment] = await trx('project_assignments').insert({
          person_id: action.person_id,
          project_id: action.project_id,
          role_id: action.role_id,
          allocation_percentage: action.new_allocation,
          start_date: action.start_date,
          end_date: action.end_date,
          assignment_date_mode: 'fixed',
          notes: `Created via recommendation: ${action.rationale}`,
          created_at: new Date(),
          updated_at: new Date()
        }).returning('*');
        return { action: 'created', assignment: newAssignment };

      case 'remove':
        await trx('project_assignments').where('id', action.assignment_id).del();
        return { action: 'removed', assignment_id: action.assignment_id };

      case 'modify':
        const [updatedAssignment] = await trx('project_assignments')
          .where('id', action.assignment_id)
          .update({
            allocation_percentage: action.new_allocation,
            notes: `Modified via recommendation: ${action.rationale}`,
            updated_at: new Date()
          }).returning('*');
        return { action: 'modified', assignment: updatedAssignment };

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private filterByFocus(recommendations: Recommendation[], focus: string): Recommendation[] {
    switch (focus) {
      case 'overallocation':
        return recommendations.filter(r => 
          r.current_state.overallocated_people > r.projected_state.overallocated_people
        );
      case 'underutilization':
        return recommendations.filter(r => 
          r.current_state.underutilized_people > r.projected_state.underutilized_people
        );
      case 'capacity_gaps':
        return recommendations.filter(r => 
          r.current_state.capacity_gaps > r.projected_state.capacity_gaps
        );
      case 'project_assignment':
        return recommendations.filter(r => 
          r.actions.some(a => a.type === 'add')
        );
      default:
        return recommendations;
    }
  }
}