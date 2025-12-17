import { ImportHistoryService, ImportHistoryRecord, ImportHistoryQuery } from '../import/ImportHistoryService';

describe('ImportHistoryService', () => {
  let service: ImportHistoryService;
  let mockDb: any;

  const SAMPLE_RECORD: ImportHistoryRecord = {
    file_name: 'test.xlsx',
    file_size: '1024',
    file_mime_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    import_type: 'v1',
    clear_existing: false,
    validate_duplicates: true,
    auto_create_missing_roles: false,
    auto_create_missing_locations: false,
    default_project_priority: 2,
    date_format: 'MM/DD/YYYY',
    status: 'success',
    imported_by: 'test@example.com',
    started_at: new Date(),
    completed_at: new Date(),
    duration_ms: 5000,
    imported_counts: { projects: 10, people: 5 }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockDb = {
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      count: jest.fn().mockReturnThis(),
      clone: jest.fn().mockReturnThis(),
      first: jest.fn(),
      returning: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      del: jest.fn()
    };

    service = new ImportHistoryService(mockDb);
  });

  describe('createImportRecord', () => {
    it('should create new import history record', async () => {
      mockDb.insert.mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 'record-1' }])
      });

      const result = await service.createImportRecord(SAMPLE_RECORD);

      expect(mockDb.insert).toHaveBeenCalledWith(SAMPLE_RECORD);
      expect(result).toBe('record-1');
    });

    it('should handle insert returning array of IDs', async () => {
      mockDb.insert.mockReturnValue({
        returning: jest.fn().mockResolvedValue([{ id: 'record-1' }])
      });

      const result = await service.createImportRecord(SAMPLE_RECORD);

      expect(result).toBeDefined();
    });

    it('should handle insert returning simple ID', async () => {
      mockDb.insert.mockReturnValue({
        returning: jest.fn().mockResolvedValue(['record-1'])
      });

      const result = await service.createImportRecord(SAMPLE_RECORD);

      expect(result).toBeDefined();
    });

    it('should throw on insert error', async () => {
      mockDb.insert.mockReturnValue({
        returning: jest.fn().mockRejectedValue(new Error('Insert failed'))
      });

      await expect(service.createImportRecord(SAMPLE_RECORD)).rejects.toThrow();
    });
  });

  describe('updateImportRecord', () => {
    it('should update existing record', async () => {
      mockDb.update.mockResolvedValue(1);

      await service.updateImportRecord('record-1', { status: 'success', duration_ms: 5000 });

      expect(mockDb.where).toHaveBeenCalledWith('id', 'record-1');
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should convert objects to JSON strings', async () => {
      mockDb.update.mockResolvedValue(1);

      const updates = {
        imported_counts: { projects: 10, people: 5 },
        errors: ['Error 1', 'Error 2']
      };

      await service.updateImportRecord('record-1', updates);

      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({
          imported_counts: expect.stringContaining('projects'),
          errors: expect.stringContaining('Error')
        })
      );
    });

    it('should exclude undefined values from update', async () => {
      mockDb.update.mockResolvedValue(1);

      const updates: any = {
        status: 'success',
        errors: undefined,
        warnings: undefined
      };

      await service.updateImportRecord('record-1', updates);

      const updateCall = mockDb.update.mock.calls[0][0];
      expect(updateCall.errors).toBeUndefined();
      expect(updateCall.warnings).toBeUndefined();
    });

    it('should throw on update error', async () => {
      mockDb.update.mockRejectedValue(new Error('Update failed'));

      await expect(service.updateImportRecord('record-1', { status: 'success' })).rejects.toThrow();
    });
  });

  describe('getImportHistory', () => {
    it('should fetch import history with pagination', async () => {
      const mockRecords = [
        { ...SAMPLE_RECORD, id: 'record-1' },
        { ...SAMPLE_RECORD, id: 'record-2' }
      ];

      mockDb.clone.mockReturnValue({
        count: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ count: 10 })
      });

      mockDb.select.mockReturnValue({
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockRecords)
      });

      const result = await service.getImportHistory({ page: 1, limit: 2 });

      expect(result.imports).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.totalCount).toBe(10);
    });

    it('should calculate pagination correctly', async () => {
      mockDb.clone.mockReturnValue({
        count: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ count: 25 })
      });

      mockDb.select.mockReturnValue({
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue([])
      });

      const result = await service.getImportHistory({ page: 2, limit: 10 });

      expect(result.pagination.totalPages).toBe(3);
      expect(result.pagination.hasNextPage).toBe(true);
      expect(result.pagination.hasPrevPage).toBe(true);
    });

    it('should filter by status', async () => {
      mockDb.clone.mockReturnValue({
        count: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ count: 5 })
      });

      mockDb.select.mockReturnValue({
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue([])
      });

      const query: ImportHistoryQuery = { page: 1, limit: 10, status: 'success' };

      await service.getImportHistory(query);

      expect(mockDb.where).toHaveBeenCalledWith('status', 'success');
    });

    it('should filter by date range', async () => {
      mockDb.clone.mockReturnValue({
        count: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ count: 5 })
      });

      mockDb.select.mockReturnValue({
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue([])
      });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      const query: ImportHistoryQuery = { page: 1, limit: 10, startDate, endDate };

      await service.getImportHistory(query);

      expect(mockDb.where).toHaveBeenCalledWith('started_at', '>=', startDate);
      expect(mockDb.where).toHaveBeenCalledWith('started_at', '<=', endDate);
    });

    it('should parse JSON fields', async () => {
      const recordWithJson = {
        ...SAMPLE_RECORD,
        imported_counts: JSON.stringify({ projects: 10, people: 5 }),
        errors: JSON.stringify(['Error 1', 'Error 2'])
      };

      mockDb.clone.mockReturnValue({
        count: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ count: 1 })
      });

      mockDb.select.mockReturnValue({
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue([recordWithJson])
      });

      const result = await service.getImportHistory({ page: 1, limit: 10 });

      expect(result.imports[0].imported_counts).toEqual({ projects: 10, people: 5 });
      expect(result.imports[0].errors).toEqual(['Error 1', 'Error 2']);
    });

    it('should throw on query error', async () => {
      mockDb.clone.mockReturnValue({
        count: jest.fn().mockReturnThis(),
        first: jest.fn().mockRejectedValue(new Error('Query failed'))
      });

      await expect(service.getImportHistory({ page: 1, limit: 10 })).rejects.toThrow();
    });
  });

  describe('getImportRecordById', () => {
    it('should fetch record by ID', async () => {
      mockDb.first.mockResolvedValue(SAMPLE_RECORD);

      const result = await service.getImportRecordById('record-1');

      expect(result).toEqual(SAMPLE_RECORD);
      expect(mockDb.where).toHaveBeenCalledWith('id', 'record-1');
    });

    it('should return null when record not found', async () => {
      mockDb.first.mockResolvedValue(null);

      const result = await service.getImportRecordById('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw on query error', async () => {
      mockDb.first.mockRejectedValue(new Error('Query failed'));

      await expect(service.getImportRecordById('record-1')).rejects.toThrow();
    });
  });

  describe('getImportStatistics', () => {
    it('should calculate import statistics', async () => {
      const mockRecords = [
        { ...SAMPLE_RECORD, status: 'success', duration_ms: 5000 },
        { ...SAMPLE_RECORD, status: 'success', duration_ms: 6000 },
        { ...SAMPLE_RECORD, status: 'failed', duration_ms: 3000 },
        { ...SAMPLE_RECORD, status: 'processing' }
      ];

      mockDb.select.mockResolvedValue(mockRecords);

      const result = await service.getImportStatistics();

      expect(result.totalImports).toBe(4);
      expect(result.successfulImports).toBe(2);
      expect(result.failedImports).toBe(1);
      expect(result.processingImports).toBe(1);
      expect(result.successRate).toBeGreaterThan(0);
    });

    it('should calculate success rate', async () => {
      const mockRecords = [
        { ...SAMPLE_RECORD, status: 'success' },
        { ...SAMPLE_RECORD, status: 'success' },
        { ...SAMPLE_RECORD, status: 'failed' }
      ];

      mockDb.select.mockResolvedValue(mockRecords);

      const result = await service.getImportStatistics();

      // 2 successes out of 3 completed = 66.67%
      expect(result.successRate).toBeLessThanOrEqual(67);
      expect(result.successRate).toBeGreaterThanOrEqual(66);
    });

    it('should calculate average duration', async () => {
      const mockRecords = [
        { ...SAMPLE_RECORD, status: 'success', duration_ms: 5000 },
        { ...SAMPLE_RECORD, status: 'success', duration_ms: 7000 },
        { ...SAMPLE_RECORD, status: 'failed', duration_ms: 3000 }
      ];

      mockDb.select.mockResolvedValue(mockRecords);

      const result = await service.getImportStatistics();

      expect(result.averageDurationMs).toBeGreaterThan(0);
    });

    it('should sum total records imported', async () => {
      const mockRecords = [
        { ...SAMPLE_RECORD, imported_counts: JSON.stringify({ projects: 10, people: 5 }) },
        { ...SAMPLE_RECORD, imported_counts: JSON.stringify({ projects: 8, people: 3 }) }
      ];

      mockDb.select.mockResolvedValue(mockRecords);

      const result = await service.getImportStatistics();

      expect(result.totalRecordsImported).toBe(26); // 10+5+8+3
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      mockDb.select.mockResolvedValue([SAMPLE_RECORD]);

      await service.getImportStatistics(startDate, endDate);

      expect(mockDb.where).toHaveBeenCalledWith('started_at', '>=', startDate);
      expect(mockDb.where).toHaveBeenCalledWith('started_at', '<=', endDate);
    });

    it('should handle zero success rate', async () => {
      const mockRecords = [{ ...SAMPLE_RECORD, status: 'processing' }];

      mockDb.select.mockResolvedValue(mockRecords);

      const result = await service.getImportStatistics();

      expect(result.successRate).toBe(0);
    });

    it('should throw on query error', async () => {
      mockDb.select.mockRejectedValue(new Error('Query failed'));

      await expect(service.getImportStatistics()).rejects.toThrow();
    });
  });

  describe('cleanupOldRecords', () => {
    it('should delete records older than specified days', async () => {
      mockDb.del.mockResolvedValue(5);

      const result = await service.cleanupOldRecords(90);

      expect(result).toBe(5);
      expect(mockDb.del).toHaveBeenCalled();
    });

    it('should use default 90 days when not specified', async () => {
      mockDb.del.mockResolvedValue(0);

      await service.cleanupOldRecords();

      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.del).toHaveBeenCalled();
    });

    it('should throw on delete error', async () => {
      mockDb.del.mockRejectedValue(new Error('Delete failed'));

      await expect(service.cleanupOldRecords(90)).rejects.toThrow();
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle malformed JSON in imported_counts', async () => {
      const recordWithBadJson = {
        ...SAMPLE_RECORD,
        imported_counts: 'not valid json'
      };

      mockDb.first.mockResolvedValue(recordWithBadJson);

      const result = await service.getImportRecordById('record-1');

      // Should not throw, uses fallback
      expect(result).toBeDefined();
    });

    it('should handle null JSON fields gracefully', async () => {
      mockDb.clone.mockReturnValue({
        count: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ count: 1 })
      });

      mockDb.select.mockReturnValue({
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue([{
          ...SAMPLE_RECORD,
          imported_counts: null,
          errors: null
        }])
      });

      const result = await service.getImportHistory({ page: 1, limit: 10 });

      expect(result.imports[0].imported_counts).toBeNull();
      expect(result.imports[0].errors).toEqual([]);
    });

    it('should handle pagination edge cases', async () => {
      mockDb.clone.mockReturnValue({
        count: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({ count: 0 })
      });

      mockDb.select.mockReturnValue({
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue([])
      });

      const result = await service.getImportHistory({ page: 1, limit: 10 });

      expect(result.pagination.totalPages).toBe(0);
      expect(result.pagination.hasNextPage).toBe(false);
    });
  });
});
