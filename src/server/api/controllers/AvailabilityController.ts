import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { v4 as uuidv4 } from 'uuid';

export class AvailabilityController extends BaseController {
  async getAll(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const filters = {
      person_id: req.query.person_id,
      override_type: req.query.override_type,
      is_approved: req.query.is_approved
    };

    // Generate a UUID for the person availability overrides


    const resultId = uuidv4();



    // Insert with generated ID


    await this.db('person_availability_overrides')


      .insert({


        id: resultId,


        ...{
          ...overrideData,
          is_approved: isApproved,
          approved_by: approvedBy,
          approved_at: isApproved ? new Date(


      });



    // Fetch the created record


    // Generate a UUID for the person availability overrides



    const resultId = uuidv4();




    // Insert with generated ID



    await this.db('person_availability_overrides')



      .insert({



        id: resultId,



        ...{


        id: resultId,


        ...{
                person_id: person.id,
                start_date: override.start_date,
                end_date: override.end_date,
                availability_percentage: override.availability_percentage,
                override_type: override.override_type,
                reason: override.reason,
                hours_per_day: override.hours_per_day,
                is_approved: true, // Bulk creates are pre-approved
                approved_by: req.body.created_by || 'system',
                approved_at: new Date(


      }



      });




    // Fetch the created record



    // Update the record




    await this.db('person_availability_overrides')




      .where({ id: resultId })




      .update({
          ...updateData,
          updated_at: new Date();





    // Fetch the updated record




    const [result] = await this.db('person_availability_overrides')




      .where({ id: resultId })




      .select('*');

      return updated;
    }, res, 'Failed to update availability override');

    if (result) {
      res.json(result);
    }
  }

  async delete(req: Request, res: Response) {
    const { id } = req.params;

    const result = await this.executeQuery(async () => {
      const override = await this.db('person_availability_overrides')
        .where('id', id)
        .first();

      if (!override) {
        this.handleNotFound(res, 'Availability override');
        return null;
      }

      await this.db('person_availability_overrides')
        .where('id', id)
        .delete();

      return { message: 'Availability override deleted successfully', deleted: override };
    }, res, 'Failed to delete availability override');

    if (result) {
      res.json(result);
    }
  }

  async getCalendar(req: Request, res: Response) {
    const { start_date, end_date, team_id, location_id } = req.query;

    const result = await this.executeQuery(async () => {
      // Get people based on filters
      let peopleQuery = this.db('people');
      
      if (team_id) {
        // TODO: Add team filtering when team table exists
      }
      
      const people = await peopleQuery.select('id', 'name', 'default_availability_percentage');

      // Get availability overrides for date range
      let overridesQuery = this.db('person_availability_overrides')
        .whereIn('person_id', people.map(p => p.id))
        .where('is_approved', true);

      if (start_date) {
        overridesQuery = overridesQuery.where('end_date', '>=', start_date);
      }
      if (end_date) {
        overridesQuery = overridesQuery.where('start_date', '<=', end_date);
      }

      const overrides = await overridesQuery.select('*');

      // Build calendar data
      const calendar = people.map(person => {
        const personOverrides = overrides.filter(o => o.person_id === person.id);
        
        return {
          person_id: person.id,
          person_name: person.name,
          default_availability: person.default_availability_percentage,
          overrides: personOverrides.map(o => ({
            id: o.id,
            start_date: o.start_date,
            end_date: o.end_date,
            availability_percentage: o.availability_percentage,
            override_type: o.override_type,
            reason: o.reason
          }))
        };
      });

      // Calculate team availability summary
      const summary = this.calculateTeamAvailabilitySummary(calendar, start_date as string, end_date as string);

      return {
        calendar,
        summary,
        filters: {
          start_date,
          end_date,
          team_id,
          location_id,
          people_count: people.length
        }
      };
    }, res, 'Failed to fetch availability calendar');

    if (result) {
      res.json(result);
    }
  }

  async getForecast(req: Request, res: Response) {
    const { weeks = 12 } = req.query;

    const result = await this.executeQuery(async () => {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + (Number(weeks) * 7));

      // Get all people (assuming all are active if no is_active column)
      const people = await this.db('people')
        .select('id', 'name', 'default_availability_percentage');

      // Get future overrides
      const overrides = await this.db('person_availability_overrides')
        .where('start_date', '>=', startDate)
        .where('start_date', '<=', endDate)
        .where('is_approved', true)
        .select('*');

      // Calculate weekly forecast
      const forecast = [];
      
      for (let week = 0; week < Number(weeks); week++) {
        const weekStart = new Date(startDate);
        weekStart.setDate(weekStart.getDate() + (week * 7));
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        const weekData = {
          week_number: week + 1,
          start_date: weekStart.toISOString().split('T')[0],
          end_date: weekEnd.toISOString().split('T')[0],
          total_capacity: 0,
          people_on_leave: 0,
          people_reduced_capacity: 0,
          capacity_by_role: {} as Record<string, number>
        };

        // Calculate capacity for this week
        for (const person of people) {
          const personOverrides = overrides.filter(o => 
            o.person_id === person.id &&
            o.start_date <= weekEnd.toISOString().split('T')[0] &&
            o.end_date >= weekStart.toISOString().split('T')[0]
          );

          let availability = person.default_availability_percentage;
          
          if (personOverrides.length > 0) {
            // Use the most restrictive override
            availability = Math.min(...personOverrides.map(o => o.availability_percentage));
            
            if (availability === 0) {
              weekData.people_on_leave++;
            } else if (availability < person.default_availability_percentage) {
              weekData.people_reduced_capacity++;
            }
          }

          weekData.total_capacity += availability / 100;
        }

        forecast.push(weekData);
      }

      return {
        forecast,
        summary: {
          weeks: Number(weeks),
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          total_people: people.length,
          average_weekly_capacity: forecast.reduce((sum, w) => sum + w.total_capacity, 0) / forecast.length
        }
      };
    }, res, 'Failed to generate availability forecast');

    if (result) {
      res.json(result);
    }
  }

  private async checkAvailabilityConflicts(
    person_id: string,
    start_date: string,
    end_date: string,
    exclude_id?: string
  ) {
    let query = this.db('person_availability_overrides')
      .where('person_id', person_id)
      .where('start_date', '<=', end_date)
      .where('end_date', '>=', start_date);

    if (exclude_id) {
      query = query.where('id', '!=', exclude_id);
    }

    return await query.select('*');
  }

  private calculateTeamAvailabilitySummary(
    calendar: any[],
    start_date: string,
    end_date: string
  ) {
    const summary = {
      total_people: calendar.length,
      people_available: 0,
      people_on_leave: 0,
      people_reduced_capacity: 0,
      average_availability: 0,
      dates_with_low_capacity: [] as string[]
    };

    // For simplicity, just check current date
    // In production, would check each day in range
    const today = new Date().toISOString().split('T')[0];
    
    calendar.forEach(person => {
      const currentOverride = person.overrides.find((o: any) => 
        o.start_date <= today && o.end_date >= today
      );

      const availability = currentOverride?.availability_percentage ?? person.default_availability;
      
      if (availability === 0) {
        summary.people_on_leave++;
      } else if (availability < 100) {
        summary.people_reduced_capacity++;
      } else {
        summary.people_available++;
      }

      summary.average_availability += availability;
    });

    summary.average_availability = summary.average_availability / calendar.length;

    return summary;
  }
}