import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { db } from './setup.js';
import supertest from 'supertest';
import express from 'express';
import { createProjectsRouter } from './helpers/test-routes.js';
import { v4 as uuidv4 } from 'uuid';

// Create test app with injected test database
const app = express();
app.use(express.json());

// Use the factory function to create routes with test database
const projectsRouter = createProjectsRouter(db);
app.use('/api/projects', projectsRouter);

const request = supertest(app);

describe('Projects API Integration Tests', () => {
  let testProjectId: string;
  
  afterEach(async () => {
    // Clean up any test projects created
    if (testProjectId) {
      await db('projects').where('id', testProjectId).del();
    }
    // Clean up any other test projects
    await db('projects').where('name', 'like', 'Test Project%').del();
  });

  describe('POST /api/projects', () => {
    test('should create a new project', async () => {
      const projectData = {
        name: 'Test Project Integration',
        priority: 1,
        include_in_demand: true,
        description: 'A test project for integration testing'
      };

      const response = await request
        .post('/api/projects')
        .send(projectData)
        .expect(201);

      expect(response.body).toMatchObject({
        name: projectData.name,
        priority: projectData.priority,
        include_in_demand: 1, // SQLite stores boolean as 0/1
        description: projectData.description
      });
      expect(response.body.id).toBeTruthy();
      
      testProjectId = response.body.id;

      // Verify in database
      const project = await db('projects')
        .where('id', testProjectId)
        .first();
      expect(project).toBeTruthy();
      expect(project.name).toBe(projectData.name);
    });

    test('should validate required fields', async () => {
      const incompleteData = {
        // Missing name
        priority: 1
      };

      const response = await request
        .post('/api/projects')
        .send(incompleteData)
        .expect(400);

      expect(response.body.error).toBeTruthy();
    });
  });

  describe('GET /api/projects', () => {
    beforeEach(async () => {
      // Create test projects
      const projects = await db('projects').insert([
        {
          id: uuidv4(),
          name: 'Test Project 1',
          priority: 1,
          include_in_demand: 1,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: uuidv4(),
          name: 'Test Project 2',
          priority: 2,
          include_in_demand: 0,
          created_at: new Date(),
          updated_at: new Date()
        }
      ]).returning('*');
      
      testProjectId = projects[0].id;
    });

    test('should retrieve all projects', async () => {
      const response = await request
        .get('/api/projects')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2);
    });

    test('should support pagination', async () => {
      const response = await request
        .get('/api/projects')
        .query({ page: 1, limit: 1 })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 1,
        totalPages: expect.any(Number)
      });
    });
  });

  describe('GET /api/projects/:id', () => {
    beforeEach(async () => {
      const [project] = await db('projects').insert({
        id: uuidv4(),
        name: 'Test Project Detail',
        priority: 1,
        include_in_demand: 1,
        description: 'Detailed test project',
        created_at: new Date(),
        updated_at: new Date()
      }).returning('*');
      
      testProjectId = project.id;
    });

    test('should retrieve a specific project', async () => {
      const response = await request
        .get(`/api/projects/${testProjectId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testProjectId,
        name: 'Test Project Detail',
        priority: 1,
        description: 'Detailed test project'
      });
    });

    test('should return 404 for non-existent project', async () => {
      const nonExistentId = uuidv4();
      
      await request
        .get(`/api/projects/${nonExistentId}`)
        .expect(404);
    });
  });

  describe('PUT /api/projects/:id', () => {
    beforeEach(async () => {
      const [project] = await db('projects').insert({
        id: uuidv4(),
        name: 'Test Project Update',
        priority: 2,
        include_in_demand: 1,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('*');
      
      testProjectId = project.id;
    });

    test('should update a project', async () => {
      const updateData = {
        name: 'Updated Test Project',
        priority: 1,
        description: 'Updated description'
      };

      const response = await request
        .put(`/api/projects/${testProjectId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testProjectId,
        name: updateData.name,
        priority: updateData.priority,
        description: updateData.description
      });

      // Verify in database
      const project = await db('projects')
        .where('id', testProjectId)
        .first();
      expect(project.name).toBe(updateData.name);
    });
  });

  describe('DELETE /api/projects/:id', () => {
    beforeEach(async () => {
      const [project] = await db('projects').insert({
        id: uuidv4(),
        name: 'Test Project Delete',
        priority: 3,
        include_in_demand: 0,
        created_at: new Date(),
        updated_at: new Date()
      }).returning('*');
      
      testProjectId = project.id;
    });

    test('should delete a project', async () => {
      await request
        .delete(`/api/projects/${testProjectId}`)
        .expect(200);

      // Verify deleted from database
      const project = await db('projects')
        .where('id', testProjectId)
        .first();
      expect(project).toBeFalsy();
      
      // Clear testProjectId since it's already deleted
      testProjectId = '';
    });

    test('should return 404 for non-existent project', async () => {
      const nonExistentId = uuidv4();
      
      await request
        .delete(`/api/projects/${nonExistentId}`)
        .expect(404);
    });
  });
});