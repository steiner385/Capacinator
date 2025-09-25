import { Request, Response } from 'express';
import { db } from '../../database/index.js';

export class ProjectPhaseDependenciesController {
  static async getAll(req: Request, res: Response) {
    try {
      const { project_id, page = 1, limit = 10 } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const offset = (pageNum - 1) * limitNum;

      let query = db('project_phase_dependencies as pd')
        .join('project_phases_timeline as ppt1', 'pd.predecessor_phase_timeline_id', 'ppt1.id')
        .join('project_phases_timeline as ppt2', 'pd.successor_phase_timeline_id', 'ppt2.id')
        .join('project_phases as pp1', 'ppt1.phase_id', 'pp1.id')
        .join('project_phases as pp2', 'ppt2.phase_id', 'pp2.id')
        .select(
          'pd.*',
          'pp1.name as predecessor_phase_name',
          'pp2.name as successor_phase_name'
        );

      if (project_id) {
        query = query.where('pd.project_id', project_id);
      }

      // Get total count
      const [{ total }] = await db('project_phase_dependencies')
        .where(project_id ? { project_id } : {})
        .count('* as total');

      // Get paginated data
      const dependencies = await query
        .orderBy('pd.created_at', 'desc')
        .limit(limitNum)
        .offset(offset);

      res.json({
        data: dependencies,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: parseInt(total as string, 10),
          totalPages: Math.ceil(parseInt(total as string, 10) / limitNum)
        }
      });
    } catch (error) {
      console.error('Error fetching project phase dependencies:', error);
      res.status(500).json({ error: 'Failed to fetch dependencies' });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const dependency = await db('project_phase_dependencies as pd')
        .join('project_phases_timeline as ppt1', 'pd.predecessor_phase_timeline_id', 'ppt1.id')
        .join('project_phases_timeline as ppt2', 'pd.successor_phase_timeline_id', 'ppt2.id')
        .join('project_phases as pp1', 'ppt1.phase_id', 'pp1.id')
        .join('project_phases as pp2', 'ppt2.phase_id', 'pp2.id')
        .where('pd.id', id)
        .select(
          'pd.*',
          'pp1.name as predecessor_phase_name',
          'pp2.name as successor_phase_name'
        )
        .first();
      
      if (!dependency) {
        return res.status(404).json({ error: 'Dependency not found' });
      }
      
      res.json(dependency);
    } catch (error) {
      console.error('Error fetching dependency:', error);
      res.status(500).json({ error: 'Failed to fetch dependency' });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const { predecessor_phase_timeline_id, successor_phase_timeline_id } = req.body;
      
      // Validate no self-dependency
      if (predecessor_phase_timeline_id === successor_phase_timeline_id) {
        return res.status(400).json({ error: 'A phase cannot depend on itself' });
      }
      
      const now = new Date();
      const dependencyData = {
        ...req.body,
        id: req.body.id || `dep-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        created_at: now,
        updated_at: now
      };
      
      const [insertedDep] = await db('project_phase_dependencies')
        .insert(dependencyData)
        .returning('*');
      
      // Fetch with phase names
      const dependency = await db('project_phase_dependencies as pd')
        .join('project_phases_timeline as ppt1', 'pd.predecessor_phase_timeline_id', 'ppt1.id')
        .join('project_phases_timeline as ppt2', 'pd.successor_phase_timeline_id', 'ppt2.id')
        .join('project_phases as pp1', 'ppt1.phase_id', 'pp1.id')
        .join('project_phases as pp2', 'ppt2.phase_id', 'pp2.id')
        .where('pd.id', insertedDep.id)
        .select(
          'pd.*',
          'pp1.name as predecessor_phase_name',
          'pp2.name as successor_phase_name'
        )
        .first();
      
      res.status(201).json({ data: dependency });
    } catch (error) {
      console.error('Error creating dependency:', error);
      res.status(500).json({ error: 'Failed to create dependency' });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const [dependency] = await db('project_phase_dependencies')
        .where({ id })
        .update({ ...req.body, updated_at: new Date() })
        .returning('*');
      
      if (!dependency) {
        return res.status(404).json({ error: 'Dependency not found' });
      }
      
      res.json(dependency);
    } catch (error) {
      console.error('Error updating dependency:', error);
      res.status(500).json({ error: 'Failed to update dependency' });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await db('project_phase_dependencies')
        .where({ id })
        .delete();
      
      if (!result) {
        return res.status(404).json({ error: 'Dependency not found' });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting dependency:', error);
      res.status(500).json({ error: 'Failed to delete dependency' });
    }
  }
}