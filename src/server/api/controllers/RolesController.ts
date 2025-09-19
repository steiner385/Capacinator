import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { v4 as uuidv4 } from 'uuid';

export class RolesController extends BaseController {
  async getAll(req: Request, res: Response) {
    // Generate a UUID for the roles

    const resultId = uuidv4();


    // Insert with generated ID

    await this.db('roles')

      .insert({

        id: resultId,

        ...{
          ...roleData,
          created_at: new Date(

      });


    // Fetch the created record

    const [result] = await this.db('roles')

      .where({ id: resultId })

      .select('*');

      return role;
    }, res, 'Failed to create role');

    if (result) {
      res.status(201).json(result);
    }
  }

  async update(req: Request, res: Response) {
    const { id } = req.params;
    const updateData = req.body;

    // Generate a UUID for the roles


    const resultId = uuidv4();



    // Insert with generated ID


    await this.db('roles')


      .insert({


        id: resultId,


        ...{
          role_id: id,
          ...plannerData,
          assigned_at: new Date(


      });



    // Fetch the created record


    const [result] = await this.db('roles')


      .where({ id: resultId })


      .select('*');

      return rolePlanner;
    }, res, 'Failed to add role planner');

    if (result) {
      res.status(201).json(result);
    }
  }

  async removePlanner(req: Request, res: Response) {
    const { id, plannerId } = req.params;

    const result = await this.executeQuery(async () => {
      const deletedCount = await this.db('role_planners')
        .where('role_id', id)
        .where('person_id', plannerId)
        .del();

      if (deletedCount === 0) {
        this.handleNotFound(res, 'Role planner assignment');
        return null;
      }

      return { message: 'Role planner removed successfully' };
    }, res, 'Failed to remove role planner');

    if (result) {
      res.json(result);
    }
  }

  async getCapacityGaps(req: Request, res: Response) {
    const result = await this.executeQuery(async () => {
      const gaps = await this.db('capacity_gaps_view')
        .select('*')
        .orderBy('gap_fte', 'desc');

      return gaps;
    }, res, 'Failed to fetch capacity gaps');

    if (result) {
      res.json(result);
    }
  }

  async getExpertiseLevels(req: Request, res: Response) {
    try {
      const expertiseLevels = [
        { level: 1, name: 'Novice', description: 'Learning the fundamentals, requires supervision' },
        { level: 2, name: 'Beginner', description: 'Some experience, occasional guidance needed' },
        { level: 3, name: 'Intermediate', description: 'Solid competency, works independently' },
        { level: 4, name: 'Advanced', description: 'Highly skilled, mentors others' },
        { level: 5, name: 'Expert', description: 'Domain expert, thought leader' }
      ];

      res.json({ data: expertiseLevels });
    } catch (error) {
      console.error('Error fetching expertise levels:', error);
      res.status(500).json({ error: 'Failed to fetch expertise levels' });
    }
  }
}