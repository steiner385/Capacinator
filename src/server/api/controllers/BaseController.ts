import { Request, Response, NextFunction } from 'express';
import { db } from '../../database/index.js';
import { Knex } from 'knex';

export abstract class BaseController {
  protected db: Knex;

  constructor(database?: Knex) {
    this.db = database || db;
  }

  protected handleError(error: any, res: Response, message = 'Internal server error') {
    console.error('Controller error:', error);
    res.status(500).json({
      error: message,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }

  protected handleNotFound(res: Response, resource = 'Resource') {
    res.status(404).json({
      error: `${resource} not found`
    });
  }

  protected handleValidationError(res: Response, errors: any) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  protected async executeQuery<T>(
    queryFn: () => Promise<T>,
    res: Response,
    errorMessage?: string
  ): Promise<T | undefined> {
    try {
      return await queryFn();
    } catch (error) {
      this.handleError(error, res, errorMessage);
      return undefined;
    }
  }

  protected paginate(query: any, page: number = 1, limit: number = 50) {
    const offset = (page - 1) * limit;
    return query.limit(limit).offset(offset);
  }

  protected buildFilters(query: any, filters: Record<string, any>) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'string' && value.includes('%')) {
          query.where(key, 'like', value);
        } else {
          query.where(key, value);
        }
      }
    });
    return query;
  }
}