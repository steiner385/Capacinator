import { AvailabilityController } from '../AvailabilityController';
import { createMockDb, flushPromises } from './helpers/mockDb';

describe('AvailabilityController', () => {
  let controller: AvailabilityController;
  let mockReq: any;
  let mockRes: any;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new AvailabilityController();

    // Create mock request
    mockReq = {
      query: {},
      params: {},
      body: {},
      headers: {},
      logAuditEvent: jest.fn().mockResolvedValue(undefined)
    };

    // Create mock response
    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    // Create mock database
    mockDb = createMockDb();
    (controller as any).db = mockDb;
    (controller as any)._auditedDb = mockDb;

    // Mock getDb to return our mockDb (needed for executeAuditedQuery)
    (controller as any).getDb = jest.fn().mockReturnValue(mockDb);

    mockDb._reset();
  });

  describe('getAll - List Availability Overrides', () => {
    it('returns paginated list of availability overrides', async () => {
      const mockOverrides = [
        {
          id: 'override-1',
          person_id: 'person-1',
          person_name: 'John Doe',
          person_email: 'john@example.com',
          start_date: '2025-01-01',
          end_date: '2025-01-07',
          availability_percentage: 50,
          override_type: 'vacation',
          is_approved: true,
          approver_name: 'Jane Smith'
        }
      ];

      mockDb._setCountResult(1);
      mockDb._setQueryResult(mockOverrides);

      await controller.getAll(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        data: mockOverrides,
        pagination: {
          page: 1,
          limit: 50,
          total: 1,
          totalPages: 1
        }
      });
    });

    it('handles pagination parameters', async () => {
      mockReq.query = { page: '2', limit: '10' };

      mockDb._setCountResult(25);
      mockDb._setQueryResult([]);

      await controller.getAll(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.limit).toHaveBeenCalledWith(10);
      expect(mockDb.offset).toHaveBeenCalledWith(10);
    });

    it('filters by person_id', async () => {
      mockReq.query = { person_id: 'person-123' };

      mockDb._setCountResult(0);
      mockDb._setQueryResult([]);

      await controller.getAll(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.where).toHaveBeenCalled();
    });

    it('filters by start_date', async () => {
      mockReq.query = { start_date: '2025-01-01' };

      mockDb._setCountResult(0);
      mockDb._setQueryResult([]);

      await controller.getAll(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.where).toHaveBeenCalledWith('person_availability_overrides.end_date', '>=', '2025-01-01');
    });

    it('filters by end_date', async () => {
      mockReq.query = { end_date: '2025-12-31' };

      mockDb._setCountResult(0);
      mockDb._setQueryResult([]);

      await controller.getAll(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.where).toHaveBeenCalledWith('person_availability_overrides.start_date', '<=', '2025-12-31');
    });

    it('filters for pending approvals only', async () => {
      mockReq.query = { pending_only: 'true' };

      mockDb._setCountResult(0);
      mockDb._setQueryResult([]);

      await controller.getAll(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.where).toHaveBeenCalledWith('person_availability_overrides.is_approved', false);
    });

    it('orders by start_date descending', async () => {
      mockDb._setCountResult(0);
      mockDb._setQueryResult([]);

      await controller.getAll(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.orderBy).toHaveBeenCalledWith('person_availability_overrides.start_date', 'desc');
    });
  });

  describe('create - Create Availability Override', () => {
    beforeEach(() => {
      mockReq.body = {
        person_id: 'person-1',
        start_date: '2025-01-01',
        end_date: '2025-01-07',
        availability_percentage: 50,
        override_type: 'vacation',
        reason: 'Annual leave',
        created_by: 'creator-1'
      };
    });

    it('creates availability override successfully', async () => {
      // Mock checkAvailabilityConflicts (no conflicts)
      mockDb._queueQueryResult([]);

      // Mock person lookup
      mockDb._queueFirstResult({
        id: 'person-1',
        name: 'John Doe',
        supervisor_id: 'supervisor-1'
      });

      // Mock insert
      mockDb._queueInsertResult([{ id: 'override-1' }]);

      // Mock fetch created override
      mockDb._queueFirstResult({
        id: 'override-1',
        ...mockReq.body,
        is_approved: false,
        approved_by: null
      });

      await controller.create(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('auto-approves when creator is the person', async () => {
      mockReq.body.created_by = 'person-1'; // Same as person_id

      // Mock checkAvailabilityConflicts
      mockDb._queueQueryResult([]);

      // Mock person lookup
      mockDb._queueFirstResult({
        id: 'person-1',
        name: 'John Doe',
        supervisor_id: 'supervisor-1'
      });

      // Mock insert
      mockDb._queueInsertResult([{ id: 'override-1' }]);

      // Mock fetch created override
      mockDb._queueFirstResult({
        id: 'override-1',
        ...mockReq.body,
        is_approved: true,
        approved_by: 'person-1'
      });

      await controller.create(mockReq, mockRes);
      await flushPromises();

      const insertCall = mockDb.insert.mock.calls[0][0];
      expect(insertCall.is_approved).toBe(true);
      expect(insertCall.approved_by).toBe('person-1');
      expect(insertCall.approved_at).toBeInstanceOf(Date);
    });

    it('auto-approves when creator is the supervisor', async () => {
      mockReq.body.created_by = 'supervisor-1';

      // Mock checkAvailabilityConflicts
      mockDb._queueQueryResult([]);

      // Mock person lookup
      mockDb._queueFirstResult({
        id: 'person-1',
        name: 'John Doe',
        supervisor_id: 'supervisor-1'
      });

      // Mock insert
      mockDb._queueInsertResult([{ id: 'override-1' }]);

      // Mock fetch created override
      mockDb._queueFirstResult({
        id: 'override-1',
        ...mockReq.body,
        is_approved: true,
        approved_by: 'supervisor-1'
      });

      await controller.create(mockReq, mockRes);
      await flushPromises();

      const insertCall = mockDb.insert.mock.calls[0][0];
      expect(insertCall.is_approved).toBe(true);
    });

    it('returns 400 when conflicts exist', async () => {
      // Mock checkAvailabilityConflicts (has conflicts)
      mockDb._queueQueryResult([
        {
          id: 'existing-override',
          start_date: '2025-01-03',
          end_date: '2025-01-05'
        }
      ]);

      await controller.create(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Availability override conflicts with existing overrides',
        conflicts: expect.any(Array),
        message: 'Please resolve conflicts before creating override'
      });
    });
  });

  describe('bulkCreate - Bulk Create Overrides', () => {
    beforeEach(() => {
      mockReq.body = {
        overrides: [
          {
            start_date: '2025-01-01',
            end_date: '2025-01-07',
            availability_percentage: 50,
            override_type: 'vacation',
            reason: 'Company holiday'
          }
        ],
        apply_to_all: false,
        created_by: 'admin-1'
      };
    });

    it('creates overrides for specific people', async () => {
      mockReq.body.overrides[0].person_ids = ['person-1', 'person-2'];

      // Mock checkAvailabilityConflicts for person-1 (no conflicts)
      mockDb._queueQueryResult([]);

      // Mock insert for person-1
      mockDb._queueInsertResult([{ id: 'override-1', person_id: 'person-1' }]);

      // Mock checkAvailabilityConflicts for person-2 (no conflicts)
      mockDb._queueQueryResult([]);

      // Mock insert for person-2
      mockDb._queueInsertResult([{ id: 'override-2', person_id: 'person-2' }]);

      await controller.bulkCreate(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.insert).toHaveBeenCalledTimes(2);
      expect(mockRes.json).toHaveBeenCalledWith({
        summary: {
          total_attempted: 2,
          successful: 2,
          failed: 0,
          conflicts: 0
        },
        results: expect.objectContaining({
          successful: expect.arrayContaining([
            expect.objectContaining({ id: 'override-1' }),
            expect.objectContaining({ id: 'override-2' })
          ])
        })
      });
    });

    it('applies to all people when apply_to_all is true', async () => {
      mockReq.body.apply_to_all = true;

      // Mock people query
      mockDb._queueQueryResult([
        { id: 'person-1' },
        { id: 'person-2' }
      ]);

      // Mock checkAvailabilityConflicts for person-1
      mockDb._queueQueryResult([]);

      // Mock insert for person-1
      mockDb._queueInsertResult([{ id: 'override-1', person_id: 'person-1' }]);

      // Mock checkAvailabilityConflicts for person-2
      mockDb._queueQueryResult([]);

      // Mock insert for person-2
      mockDb._queueInsertResult([{ id: 'override-2', person_id: 'person-2' }]);

      await controller.bulkCreate(mockReq, mockRes);
      await flushPromises();

      expect(mockDb).toHaveBeenCalledWith('people');
      expect(mockDb.insert).toHaveBeenCalledTimes(2);
    });

    it('reports conflicts during bulk creation', async () => {
      mockReq.body.overrides[0].person_ids = ['person-1'];

      // Mock checkAvailabilityConflicts (has conflicts)
      mockDb._queueQueryResult([
        { id: 'existing-override', start_date: '2025-01-03', end_date: '2025-01-05' }
      ]);

      await controller.bulkCreate(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        summary: {
          total_attempted: 1,
          successful: 0,
          failed: 0,
          conflicts: 1
        },
        results: expect.objectContaining({
          conflicts: expect.arrayContaining([
            expect.objectContaining({
              person_id: 'person-1'
            })
          ])
        })
      });
    });

    it('continues on individual failures', async () => {
      mockReq.body.overrides[0].person_ids = ['person-1', 'person-2'];

      // Mock checkAvailabilityConflicts for person-1 (no conflicts)
      mockDb._queueQueryResult([]);

      // Mock insert for person-1 (fails)
      mockDb.insert.mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      // Mock checkAvailabilityConflicts for person-2 (no conflicts)
      mockDb._queueQueryResult([]);

      // Mock insert for person-2 (succeeds)
      mockDb._queueInsertResult([{ id: 'override-2', person_id: 'person-2' }]);

      await controller.bulkCreate(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          summary: expect.objectContaining({
            successful: 1,
            failed: 1,
            conflicts: 0
          })
        })
      );
    });

    it('logs audit events for bulk creation', async () => {
      mockReq.body.overrides[0].person_ids = ['person-1'];

      // Mock checkAvailabilityConflicts
      mockDb._queueQueryResult([]);

      // Mock insert
      mockDb._queueInsertResult([{ id: 'override-1', person_id: 'person-1' }]);

      await controller.bulkCreate(mockReq, mockRes);
      await flushPromises();

      expect(mockReq.logAuditEvent).toHaveBeenCalledWith(
        'availability',
        'override-1',
        'CREATE',
        null,
        expect.anything(),
        'Availability override created (bulk)'
      );
    });
  });

  describe('approve - Approve/Reject Override', () => {
    beforeEach(() => {
      mockReq.params = { id: 'override-1' };
      mockReq.body = {
        approved: true,
        approver_id: 'approver-1',
        approver_notes: 'Approved for vacation'
      };
    });

    it('approves availability override', async () => {
      const mockOverride = {
        id: 'override-1',
        person_id: 'person-1',
        is_approved: false,
        approved_by: null
      };

      // Mock fetch override
      mockDb._queueFirstResult(mockOverride);

      // Mock update
      mockDb._queueUpdateResult([{
        ...mockOverride,
        is_approved: true,
        approved_by: 'approver-1',
        approved_at: expect.any(Date),
        approver_notes: 'Approved for vacation'
      }]);

      await controller.approve(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_approved: true,
          approved_by: 'approver-1',
          approver_notes: 'Approved for vacation'
        })
      );
      expect(mockReq.logAuditEvent).toHaveBeenCalledWith(
        'availability',
        'override-1',
        'UPDATE',
        mockOverride,
        expect.anything(),
        'Availability override approved'
      );
    });

    it('rejects availability override', async () => {
      mockReq.body.approved = false;

      const mockOverride = {
        id: 'override-1',
        is_approved: false
      };

      // Mock fetch override
      mockDb._queueFirstResult(mockOverride);

      // Mock update
      mockDb._queueUpdateResult([{
        ...mockOverride,
        is_approved: false
      }]);

      await controller.approve(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          is_approved: false
        })
      );
      expect(mockReq.logAuditEvent).toHaveBeenCalledWith(
        'availability',
        'override-1',
        'UPDATE',
        mockOverride,
        expect.anything(),
        'Availability override rejected'
      );
    });

    it('returns 404 when override not found', async () => {
      // Mock fetch override (not found)
      mockDb._setFirstResult(null);

      await controller.approve(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('returns 400 when override already approved', async () => {
      const mockOverride = {
        id: 'override-1',
        is_approved: true,
        approved_by: 'other-approver',
        approved_at: new Date('2025-01-01')
      };

      // Mock fetch override
      mockDb._setFirstResult(mockOverride);

      await controller.approve(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Override already approved',
        approved_by: 'other-approver',
        approved_at: expect.any(Date)
      });
    });
  });

  describe('update - Update Override', () => {
    beforeEach(() => {
      mockReq.params = { id: 'override-1' };
      mockReq.body = {
        availability_percentage: 75,
        reason: 'Updated reason'
      };
    });

    it('updates availability override', async () => {
      const mockOverride = {
        id: 'override-1',
        person_id: 'person-1',
        start_date: '2025-01-01',
        end_date: '2025-01-07',
        availability_percentage: 50
      };

      // Mock fetch override
      mockDb._queueFirstResult(mockOverride);

      // Mock update
      mockDb._queueUpdateResult([{
        ...mockOverride,
        availability_percentage: 75,
        reason: 'Updated reason'
      }]);

      await controller.update(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockReq.logAuditEvent).toHaveBeenCalledWith(
        'availability',
        'override-1',
        'UPDATE',
        mockOverride,
        expect.anything(),
        'Availability override updated'
      );
      expect(mockRes.json).toHaveBeenCalled();
    });

    it('returns 404 when override not found', async () => {
      // Mock fetch override (not found)
      mockDb._setFirstResult(null);

      await controller.update(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('checks for conflicts when dates are changed', async () => {
      mockReq.body = {
        start_date: '2025-02-01',
        end_date: '2025-02-07'
      };

      const mockOverride = {
        id: 'override-1',
        person_id: 'person-1',
        start_date: '2025-01-01',
        end_date: '2025-01-07'
      };

      // Mock fetch override
      mockDb._queueFirstResult(mockOverride);

      // Mock checkAvailabilityConflicts (no conflicts)
      mockDb._queueQueryResult([]);

      // Mock update
      mockDb._queueUpdateResult([{
        ...mockOverride,
        ...mockReq.body
      }]);

      await controller.update(mockReq, mockRes);
      await flushPromises();

      expect(mockDb).toHaveBeenCalledWith('person_availability_overrides');
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('returns 400 when update causes conflicts', async () => {
      mockReq.body = {
        start_date: '2025-02-01',
        end_date: '2025-02-07'
      };

      const mockOverride = {
        id: 'override-1',
        person_id: 'person-1',
        start_date: '2025-01-01',
        end_date: '2025-01-07'
      };

      // Mock fetch override
      mockDb._queueFirstResult(mockOverride);

      // Mock checkAvailabilityConflicts (has conflicts)
      mockDb._queueQueryResult([
        { id: 'other-override', start_date: '2025-02-03', end_date: '2025-02-05' }
      ]);

      await controller.update(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Availability override conflicts with existing overrides',
        conflicts: expect.any(Array),
        message: 'Please resolve conflicts before updating override'
      });
    });
  });

  describe('delete - Delete Override', () => {
    beforeEach(() => {
      mockReq.params = { id: 'override-1' };
    });

    it('deletes availability override', async () => {
      const mockOverride = {
        id: 'override-1',
        person_id: 'person-1',
        start_date: '2025-01-01',
        end_date: '2025-01-07'
      };

      // Mock fetch override
      mockDb._queueFirstResult(mockOverride);

      // Mock delete (use queue for sequential operations)
      mockDb._queueUpdateResult([1]); // delete returns count

      await controller.delete(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Availability override deleted successfully',
        deleted: mockOverride
      });
    });

    it('returns 404 when override not found', async () => {
      // Mock fetch override (not found)
      mockDb._queueFirstResult(null);

      await controller.delete(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockDb.delete).not.toHaveBeenCalled();
    });
  });

  describe('getCalendar - Availability Calendar', () => {
    beforeEach(() => {
      mockReq.query = {
        start_date: '2025-01-01',
        end_date: '2025-01-31'
      };
    });

    it('returns availability calendar for team', async () => {
      const mockPeople = [
        { id: 'person-1', name: 'John Doe', default_availability_percentage: 100 },
        { id: 'person-2', name: 'Jane Smith', default_availability_percentage: 100 }
      ];

      const mockOverrides = [
        {
          id: 'override-1',
          person_id: 'person-1',
          start_date: '2025-01-10',
          end_date: '2025-01-15',
          availability_percentage: 50,
          override_type: 'vacation',
          reason: 'Personal leave'
        }
      ];

      // Mock people query
      mockDb._queueQueryResult(mockPeople);

      // Mock overrides query
      mockDb._queueQueryResult(mockOverrides);

      await controller.getCalendar(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          calendar: expect.arrayContaining([
            expect.objectContaining({
              person_id: 'person-1',
              person_name: 'John Doe',
              default_availability: 100,
              overrides: expect.arrayContaining([
                expect.objectContaining({
                  id: 'override-1',
                  availability_percentage: 50
                })
              ])
            }),
            expect.objectContaining({
              person_id: 'person-2',
              person_name: 'Jane Smith',
              overrides: []
            })
          ]),
          summary: expect.objectContaining({
            total_people: 2
          }),
          filters: expect.objectContaining({
            start_date: '2025-01-01',
            end_date: '2025-01-31',
            people_count: 2
          })
        })
      );
    });

    it('filters overrides by approved status', async () => {
      const mockPeople = [
        { id: 'person-1', name: 'John Doe', default_availability_percentage: 100 }
      ];

      // Mock people query
      mockDb._queueQueryResult(mockPeople);

      // Mock overrides query
      mockDb._queueQueryResult([]);

      await controller.getCalendar(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.where).toHaveBeenCalledWith('is_approved', true);
    });

    it('filters overrides by date range', async () => {
      const mockPeople = [
        { id: 'person-1', name: 'John Doe', default_availability_percentage: 100 }
      ];

      // Mock people query
      mockDb._queueQueryResult(mockPeople);

      // Mock overrides query
      mockDb._queueQueryResult([]);

      await controller.getCalendar(mockReq, mockRes);
      await flushPromises();

      expect(mockDb.where).toHaveBeenCalledWith('end_date', '>=', '2025-01-01');
      expect(mockDb.where).toHaveBeenCalledWith('start_date', '<=', '2025-01-31');
    });

    it('calculates team summary with people on leave and reduced capacity', async () => {
      const today = new Date().toISOString().split('T')[0];

      const mockPeople = [
        { id: 'person-1', name: 'John Doe', default_availability_percentage: 100 },
        { id: 'person-2', name: 'Jane Smith', default_availability_percentage: 100 },
        { id: 'person-3', name: 'Bob Wilson', default_availability_percentage: 100 }
      ];

      const mockOverrides = [
        {
          id: 'override-1',
          person_id: 'person-1',
          start_date: today, // Active today
          end_date: today,
          availability_percentage: 0, // On leave
          override_type: 'vacation',
          reason: 'Personal leave'
        },
        {
          id: 'override-2',
          person_id: 'person-2',
          start_date: today, // Active today
          end_date: today,
          availability_percentage: 50, // Reduced capacity
          override_type: 'part-time',
          reason: 'Part-time schedule'
        }
      ];

      // Mock people query
      mockDb._queueQueryResult(mockPeople);

      // Mock overrides query
      mockDb._queueQueryResult(mockOverrides);

      await controller.getCalendar(mockReq, mockRes);
      await flushPromises();

      const response = mockRes.json.mock.calls[0][0];
      expect(response.summary.people_on_leave).toBe(1); // person-1 at 0%
      expect(response.summary.people_reduced_capacity).toBe(1); // person-2 at 50%
      expect(response.summary.people_available).toBe(1); // person-3 at 100%
    });
  });

  describe('getForecast - Availability Forecast', () => {
    it('generates weekly availability forecast', async () => {
      mockReq.query = { weeks: '4' };

      const mockPeople = [
        { id: 'person-1', name: 'John Doe', default_availability_percentage: 100 },
        { id: 'person-2', name: 'Jane Smith', default_availability_percentage: 100 }
      ];

      const mockOverrides = [
        {
          id: 'override-1',
          person_id: 'person-1',
          start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Next week
          end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          availability_percentage: 0 // On leave
        }
      ];

      // Mock people query
      mockDb._queueQueryResult(mockPeople);

      // Mock overrides query
      mockDb._queueQueryResult(mockOverrides);

      await controller.getForecast(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          forecast: expect.arrayContaining([
            expect.objectContaining({
              week_number: 1,
              start_date: expect.any(String),
              end_date: expect.any(String),
              total_capacity: expect.any(Number),
              people_on_leave: expect.any(Number),
              people_reduced_capacity: expect.any(Number)
            })
          ]),
          summary: expect.objectContaining({
            weeks: 4,
            start_date: expect.any(String),
            end_date: expect.any(String),
            total_people: 2,
            average_weekly_capacity: expect.any(Number)
          })
        })
      );
    });

    it('uses default 12 weeks when not specified', async () => {
      const mockPeople = [
        { id: 'person-1', name: 'John Doe', default_availability_percentage: 100 }
      ];

      // Mock people query
      mockDb._queueQueryResult(mockPeople);

      // Mock overrides query
      mockDb._queueQueryResult([]);

      await controller.getForecast(mockReq, mockRes);
      await flushPromises();

      const response = mockRes.json.mock.calls[0][0];
      expect(response.forecast).toHaveLength(12);
      expect(response.summary.weeks).toBe(12);
    });

    it('identifies people on leave', async () => {
      mockReq.query = { weeks: '2' };

      const mockPeople = [
        { id: 'person-1', name: 'John Doe', default_availability_percentage: 100 }
      ];

      const mockOverrides = [
        {
          id: 'override-1',
          person_id: 'person-1',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          availability_percentage: 0 // On leave
        }
      ];

      // Mock people query
      mockDb._queueQueryResult(mockPeople);

      // Mock overrides query
      mockDb._queueQueryResult(mockOverrides);

      await controller.getForecast(mockReq, mockRes);
      await flushPromises();

      const response = mockRes.json.mock.calls[0][0];
      expect(response.forecast[0].people_on_leave).toBeGreaterThan(0);
    });

    it('identifies people with reduced capacity', async () => {
      mockReq.query = { weeks: '2' };

      const mockPeople = [
        { id: 'person-1', name: 'John Doe', default_availability_percentage: 100 }
      ];

      const mockOverrides = [
        {
          id: 'override-1',
          person_id: 'person-1',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          availability_percentage: 50 // Reduced capacity
        }
      ];

      // Mock people query
      mockDb._queueQueryResult(mockPeople);

      // Mock overrides query
      mockDb._queueQueryResult(mockOverrides);

      await controller.getForecast(mockReq, mockRes);
      await flushPromises();

      const response = mockRes.json.mock.calls[0][0];
      expect(response.forecast[0].people_reduced_capacity).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('handles database errors in getAll', async () => {
      mockDb.join = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await controller.getAll(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('handles database errors in create', async () => {
      mockReq.body = {
        person_id: 'person-1',
        start_date: '2025-01-01',
        end_date: '2025-01-07',
        availability_percentage: 50
      };

      mockDb.where = jest.fn().mockImplementation(() => {
        throw new Error('Database error');
      });

      await controller.create(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});
