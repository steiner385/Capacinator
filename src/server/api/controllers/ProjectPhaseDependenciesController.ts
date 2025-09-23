import { Request, Response } from 'express';
import { db } from '../../database/index.js';

export class ProjectPhaseDependenciesController {
  static async getAll(req: Request, res: Response) {
    try {
      const dependencies = await db('project_phase_dependencies')
        .select('*')
        .orderBy('created_at', 'desc');
      
      res.json(dependencies);
    } catch (error) {
      console.error('Error fetching project phase dependencies:', error);
      res.status(500).json({ error: 'Failed to fetch dependencies' });
    }
  }

  static async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const dependency = await db('project_phase_dependencies')
        .where({ id })
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
      const [dependency] = await db('project_phase_dependencies')
        .insert(req.body)
        .returning('*');
      
      res.status(201).json(dependency);
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