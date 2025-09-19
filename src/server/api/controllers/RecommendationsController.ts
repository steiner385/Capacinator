import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { v4 as uuidv4 } from 'uuid';

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

    // Generate a UUID for the capacity gaps view


    const resultId = uuidv4();



    // Insert with generated ID


    await this.db('capacity_gaps_view')


      .insert({


        id: resultId,


        ...{
          person_id: action.person_id,
          project_id: action.project_id,
          role_id: action.role_id,
          allocation_percentage: action.new_allocation,
          start_date: action.start_date,
          end_date: action.end_date,
          assignment_date_mode: 'fixed',
          notes: `Created via recommendation: ${action.rationale}`,
          created_at: new Date(


      });



    // Fetch the created record


    // Update the record



    await this.db('capacity_gaps_view')



      .where({ id: resultId })



      .update({
            allocation_percentage: action.new_allocation,
            notes: `Modified via recommendation: ${action.rationale}`,
            updated_at: new Date();




    // Fetch the updated record



    const [result] = await this.db('capacity_gaps_view')



      .where({ id: resultId })



      .select('*');
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