import { PersonRolesController } from '../PersonRolesController';
import { createMockDb, flushPromises } from './helpers/mockDb';

describe('PersonRolesController', () => {
  let controller: PersonRolesController;
  let mockReq: any;
  let mockRes: any;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PersonRolesController();

    mockReq = {
      query: {},
      params: {},
      body: {},
      headers: {}
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };

    mockDb = createMockDb();
    (controller as any).db = mockDb;
    mockDb._reset();
  });

  describe('getPersonRoles', () => {
    it('should get all roles for a person', async () => {
      mockReq.params.personId = 'person-1';

      const mockPersonRoles = [
        {
          id: 'pr-1',
          person_id: 'person-1',
          role_id: 'role-1',
          proficiency_level: 4,
          is_primary: true,
          role_name: 'Developer',
          role_description: 'Software Developer',
          person_name: 'John Doe'
        },
        {
          id: 'pr-2',
          person_id: 'person-1',
          role_id: 'role-2',
          proficiency_level: 3,
          is_primary: false,
          role_name: 'Designer',
          role_description: 'UI/UX Designer',
          person_name: 'John Doe'
        }
      ];

      mockDb._setQueryResult(mockPersonRoles);

      await controller.getPersonRoles(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        data: mockPersonRoles
      });
      expect(mockDb.where).toHaveBeenCalledWith('pr.person_id', 'person-1');
      expect(mockDb.orderBy).toHaveBeenCalledWith('pr.is_primary', 'desc');
    });

    it('should handle errors gracefully', async () => {
      mockReq.params.personId = 'person-1';
      mockDb.where = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await controller.getPersonRoles(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to fetch person roles'
      });
    });
  });

  describe('addPersonRole', () => {
    beforeEach(() => {
      mockReq.params.personId = 'person-1';
      mockReq.body = {
        role_id: 'role-1',
        proficiency_level: 4,
        is_primary: false
      };
    });

    it('should add a role to a person successfully', async () => {
      const mockPerson = { id: 'person-1', name: 'John Doe' };
      const mockRole = { id: 'role-1', name: 'Developer' };
      const mockInsertedPersonRole = {
        id: 'pr-1',
        person_id: 'person-1',
        role_id: 'role-1',
        proficiency_level: 4,
        is_primary: false
      };
      const mockResult = {
        ...mockInsertedPersonRole,
        role_name: 'Developer',
        role_description: 'Software Developer'
      };

      // Mock person exists check
      mockDb._queueFirstResult(mockPerson);
      // Mock role exists check
      mockDb._queueFirstResult(mockRole);
      // Mock existing person role check
      mockDb._queueFirstResult(null);
      // Mock insert
      mockDb._queueInsertResult([mockInsertedPersonRole]);
      // Mock final result fetch
      mockDb._queueFirstResult(mockResult);

      await controller.addPersonRole(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.insert).toHaveBeenCalledWith({
        person_id: 'person-1',
        role_id: 'role-1',
        proficiency_level: 4,
        is_primary: false
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: mockResult
      });
    });

    it('should update primary role when is_primary is true', async () => {
      mockReq.body.is_primary = true;

      const mockPerson = { id: 'person-1', name: 'John Doe' };
      const mockRole = { id: 'role-1', name: 'Developer' };
      const mockInsertedPersonRole = {
        id: 'pr-1',
        person_id: 'person-1',
        role_id: 'role-1',
        proficiency_level: 4,
        is_primary: true
      };
      const mockResult = {
        ...mockInsertedPersonRole,
        role_name: 'Developer',
        role_description: 'Software Developer'
      };

      mockDb._queueFirstResult(mockPerson);
      mockDb._queueFirstResult(mockRole);
      mockDb._queueFirstResult(null); // no existing person role
      mockDb._queueInsertResult([mockInsertedPersonRole]);
      mockDb._queueFirstResult(mockResult);

      await controller.addPersonRole(mockReq, mockRes);
      await flushPromises();

      // Should remove primary from other roles and update person's primary_person_role_id
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 for invalid proficiency level (too low)', async () => {
      mockReq.body.proficiency_level = 0;

      await controller.addPersonRole(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Proficiency level must be between 1 (novice) and 5 (expert)'
      });
    });

    it('should return 400 for invalid proficiency level (too high)', async () => {
      mockReq.body.proficiency_level = 6;

      await controller.addPersonRole(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Proficiency level must be between 1 (novice) and 5 (expert)'
      });
    });

    it('should return 404 when person not found', async () => {
      mockDb._setFirstResult(null); // person not found

      await controller.addPersonRole(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Person not found'
      });
    });

    it('should return 404 when role not found', async () => {
      const mockPerson = { id: 'person-1', name: 'John Doe' };
      mockDb._queueFirstResult(mockPerson);
      mockDb._setFirstResult(null); // role not found

      await controller.addPersonRole(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Role not found'
      });
    });

    it('should return 409 when person already has the role', async () => {
      const mockPerson = { id: 'person-1', name: 'John Doe' };
      const mockRole = { id: 'role-1', name: 'Developer' };
      const mockExistingPersonRole = {
        id: 'pr-1',
        person_id: 'person-1',
        role_id: 'role-1'
      };

      mockDb._queueFirstResult(mockPerson);
      mockDb._queueFirstResult(mockRole);
      mockDb._setFirstResult(mockExistingPersonRole); // person already has role

      await controller.addPersonRole(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Person already has this role. Use PUT to update expertise level.'
      });
    });

    it('should handle errors gracefully', async () => {
      mockDb._queueFirstResult({ id: 'person-1' });
      mockDb.where = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await controller.addPersonRole(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to add person role'
      });
    });
  });

  describe('updatePersonRole', () => {
    beforeEach(() => {
      mockReq.params = {
        personId: 'person-1',
        roleId: 'role-1'
      };
      mockReq.body = {
        proficiency_level: 5,
        is_primary: false
      };
    });

    it('should update person role successfully', async () => {
      const mockExistingPersonRole = {
        id: 'pr-1',
        person_id: 'person-1',
        role_id: 'role-1',
        proficiency_level: 4,
        is_primary: false
      };
      const mockResult = {
        ...mockExistingPersonRole,
        proficiency_level: 5,
        role_name: 'Developer',
        role_description: 'Software Developer'
      };

      mockDb._queueFirstResult(mockExistingPersonRole);
      mockDb._setFirstResult(mockResult);

      await controller.updatePersonRole(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.update).toHaveBeenCalledWith({
        proficiency_level: 5,
        is_primary: false
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        data: mockResult
      });
    });

    it('should update to primary role', async () => {
      mockReq.body.is_primary = true;

      const mockExistingPersonRole = {
        id: 'pr-1',
        person_id: 'person-1',
        role_id: 'role-1',
        proficiency_level: 4,
        is_primary: false
      };
      const mockResult = {
        ...mockExistingPersonRole,
        proficiency_level: 5,
        is_primary: true,
        role_name: 'Developer',
        role_description: 'Software Developer'
      };

      mockDb._queueFirstResult(mockExistingPersonRole);
      mockDb._setFirstResult(mockResult);

      await controller.updatePersonRole(mockReq, mockRes);
      await flushPromises();

      // Should remove primary from other roles
      expect(mockDb.update).toHaveBeenCalledWith({ is_primary: false });
      // Should update person's primary_person_role_id
      expect(mockDb.update).toHaveBeenCalledWith({ primary_person_role_id: 'pr-1' });
      expect(mockRes.json).toHaveBeenCalledWith({
        data: mockResult
      });
    });

    it('should return 400 for invalid proficiency level', async () => {
      mockReq.body.proficiency_level = 0;

      await controller.updatePersonRole(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Proficiency level must be between 1 (novice) and 5 (expert)'
      });
    });

    it('should return 404 when person role not found', async () => {
      mockDb._setFirstResult(null);

      await controller.updatePersonRole(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Person role not found'
      });
    });

    it('should handle errors gracefully', async () => {
      mockDb.where = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await controller.updatePersonRole(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to update person role'
      });
    });
  });

  describe('removePersonRole', () => {
    beforeEach(() => {
      mockReq.params = {
        personId: 'person-1',
        roleId: 'role-1'
      };
    });

    it('should remove a non-primary role successfully', async () => {
      const mockExistingPersonRole = {
        id: 'pr-1',
        person_id: 'person-1',
        role_id: 'role-1',
        proficiency_level: 4,
        is_primary: false
      };

      mockDb._setFirstResult(mockExistingPersonRole);

      await controller.removePersonRole(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.del).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('should reassign primary when removing primary role with other roles', async () => {
      const mockExistingPersonRole = {
        id: 'pr-1',
        person_id: 'person-1',
        role_id: 'role-1',
        proficiency_level: 4,
        is_primary: true
      };
      const mockOtherRoles = [
        {
          id: 'pr-2',
          person_id: 'person-1',
          role_id: 'role-2',
          proficiency_level: 5,
          is_primary: false
        }
      ];

      mockDb._queueFirstResult(mockExistingPersonRole);
      mockDb._setQueryResult(mockOtherRoles);

      await controller.removePersonRole(mockReq, mockRes);
      await flushPromises();

      // Should set next highest role as primary
      expect(mockDb.update).toHaveBeenCalledWith({ is_primary: true });
      // Should update person's primary_person_role_id
      expect(mockDb.update).toHaveBeenCalledWith({ primary_person_role_id: 'pr-2' });
      expect(mockDb.del).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(204);
    });

    it('should clear primary when removing last role', async () => {
      const mockExistingPersonRole = {
        id: 'pr-1',
        person_id: 'person-1',
        role_id: 'role-1',
        proficiency_level: 4,
        is_primary: true
      };

      mockDb._queueFirstResult(mockExistingPersonRole);
      mockDb._setQueryResult([]); // no other roles

      await controller.removePersonRole(mockReq, mockRes);
      await flushPromises();

      // Should clear primary_person_role_id
      expect(mockDb.update).toHaveBeenCalledWith({ primary_person_role_id: null });
      expect(mockDb.del).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(204);
    });

    it('should return 404 when person role not found', async () => {
      mockDb._setFirstResult(null);

      await controller.removePersonRole(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Person role not found'
      });
      expect(mockDb.del).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockDb.where = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await controller.removePersonRole(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Failed to remove person role'
      });
    });
  });

  describe('getExpertiseLevels', () => {
    it('should return expertise level definitions', async () => {
      await controller.getExpertiseLevels(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        data: [
          { level: 1, name: 'Novice', description: 'Learning the fundamentals, requires supervision' },
          { level: 2, name: 'Beginner', description: 'Some experience, occasional guidance needed' },
          { level: 3, name: 'Intermediate', description: 'Solid competency, works independently' },
          { level: 4, name: 'Advanced', description: 'Highly skilled, mentors others' },
          { level: 5, name: 'Expert', description: 'Domain expert, thought leader' }
        ]
      });
    });
  });
});
