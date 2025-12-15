import { ExportController } from '../ExportController';
import { createMockDb, flushPromises } from './helpers/mockDb';

// Mock ExcelJS
jest.mock('exceljs', () => {
  class MockWorkbook {
    creator = '';
    lastModifiedBy = '';
    created: Date | null = null;
    modified: Date | null = null;
    worksheets: any[] = [];
    xlsx: any;

    constructor() {
      this.xlsx = {
        writeBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-excel-data'))
      };
    }

    addWorksheet(name: string) {
      const worksheet = {
        name,
        columns: [],
        rows: [],
        getRow: jest.fn((index) => ({
          font: {},
          fill: {},
          setValues: jest.fn()
        })),
        addRow: jest.fn((data) => {
          worksheet.rows.push(data);
        })
      };
      this.worksheets.push(worksheet);
      return worksheet;
    }
  }

  return {
    __esModule: true,
    default: {
      Workbook: MockWorkbook
    }
  };
});

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

describe('ExportController', () => {
  let controller: ExportController;
  let mockReq: any;
  let mockRes: any;
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ExportController();

    mockReq = {
      query: {},
      params: {},
      body: {},
      headers: {},
      logger: mockLogger
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      setHeader: jest.fn()
    };

    mockDb = createMockDb();
    (controller as any).db = mockDb;
    mockDb._reset();
  });

  describe('exportReportAsExcel - Export as Excel', () => {
    it('exports capacity report as Excel', async () => {
      mockReq.body = {
        reportType: 'capacity',
        filters: {}
      };

      const mockGapsData = [
        {
          role_name: 'Developer',
          total_capacity_fte: 10,
          gap_fte: -2
        }
      ];

      const mockUtilizationData = [
        {
          person_id: 'person-1',
          person_name: 'John Doe',
          primary_role: 'Developer',
          total_allocation: 85
        }
      ];

      mockDb._queueQueryResult(mockGapsData);
      mockDb._queueQueryResult(mockUtilizationData);

      await controller.exportReportAsExcel(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=capacity-report.xlsx'
      );
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('exports utilization report as Excel', async () => {
      mockReq.body = {
        reportType: 'utilization',
        filters: {}
      };

      const mockGapsData = [];
      const mockUtilizationData = [
        {
          person_id: 'person-1',
          person_name: 'Jane Smith',
          primary_role: 'Designer',
          total_allocation: 90
        }
      ];

      mockDb._queueQueryResult(mockGapsData);
      mockDb._queueQueryResult(mockUtilizationData);

      await controller.exportReportAsExcel(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=utilization-report.xlsx'
      );
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('exports demand report as Excel', async () => {
      mockReq.body = {
        reportType: 'demand',
        filters: {}
      };

      const mockDemands = [
        {
          role_id: 'role-1',
          role_name: 'Developer',
          demand_hours: 320,
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          project_id: 'project-1'
        }
      ];

      mockDb._setQueryResult(mockDemands);

      await controller.exportReportAsExcel(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=demand-report.xlsx'
      );
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('exports gaps report as Excel', async () => {
      mockReq.body = {
        reportType: 'gaps',
        filters: {}
      };

      const mockGapsData = [
        {
          role_id: 'role-1',
          role_name: 'Developer',
          total_capacity_fte: 8,
          total_demand_fte: 12
        }
      ];

      mockDb._setQueryResult(mockGapsData);

      await controller.exportReportAsExcel(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=capacity-gaps-report.xlsx'
      );
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('returns 400 when report type is missing', async () => {
      mockReq.body = {
        filters: {}
      };

      await controller.exportReportAsExcel(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Report type is required'
      });
    });

    it('returns 400 for invalid report type', async () => {
      mockReq.body = {
        reportType: 'invalid-type',
        filters: {}
      };

      await controller.exportReportAsExcel(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid report type'
      });
    });
  });

  describe('exportReportAsCSV - Export as CSV', () => {
    it('exports capacity report as CSV', async () => {
      mockReq.body = {
        reportType: 'capacity',
        filters: {}
      };

      const mockGapsData = [
        {
          role_name: 'Developer',
          total_capacity_fte: 10,
          gap_fte: -2
        }
      ];

      const mockUtilizationData = [];

      mockDb._queueQueryResult(mockGapsData);
      mockDb._queueQueryResult(mockUtilizationData);

      await controller.exportReportAsCSV(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'text/csv'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=capacity-report.csv'
      );
      expect(mockRes.send).toHaveBeenCalled();
      expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining('Role'));
    });

    it('exports utilization report as CSV', async () => {
      mockReq.body = {
        reportType: 'utilization',
        filters: {}
      };

      const mockGapsData = [];
      const mockUtilizationData = [
        {
          person_id: 'person-1',
          person_name: 'John Doe',
          primary_role: 'Developer',
          total_allocation: 85
        }
      ];

      mockDb._queueQueryResult(mockGapsData);
      mockDb._queueQueryResult(mockUtilizationData);

      await controller.exportReportAsCSV(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=utilization-report.csv'
      );
      expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining('Name'));
    });

    it('exports demand report as CSV', async () => {
      mockReq.body = {
        reportType: 'demand',
        filters: {}
      };

      const mockDemands = [
        {
          role_id: 'role-1',
          role_name: 'Developer',
          demand_hours: 320,
          start_date: '2024-01-01',
          end_date: '2024-01-31',
          project_id: 'project-1'
        }
      ];

      mockDb._setQueryResult(mockDemands);

      await controller.exportReportAsCSV(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining('Project Type'));
    });

    it('exports gaps report as CSV', async () => {
      mockReq.body = {
        reportType: 'gaps',
        filters: {}
      };

      const mockGapsData = [
        {
          role_id: 'role-1',
          role_name: 'Developer',
          total_capacity_fte: 8,
          total_demand_fte: 12
        }
      ];

      mockDb._setQueryResult(mockGapsData);

      await controller.exportReportAsCSV(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining('Gap (Hours)'));
    });

    it('returns 400 when report type is missing', async () => {
      mockReq.body = {
        filters: {}
      };

      await controller.exportReportAsCSV(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Report type is required'
      });
    });

    it('returns 400 for invalid report type', async () => {
      mockReq.body = {
        reportType: 'unknown',
        filters: {}
      };

      await controller.exportReportAsCSV(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid report type'
      });
    });

    it('handles CSV escaping for fields with commas', async () => {
      mockReq.body = {
        reportType: 'capacity',
        filters: {}
      };

      const mockGapsData = [
        {
          role_name: 'Developer, Senior',
          total_capacity_fte: 10,
          gap_fte: -2
        }
      ];

      const mockUtilizationData = [];

      mockDb._queueQueryResult(mockGapsData);
      mockDb._queueQueryResult(mockUtilizationData);

      await controller.exportReportAsCSV(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.send).toHaveBeenCalledWith(expect.stringContaining('"Developer, Senior"'));
    });
  });

  // Note: PDF export tests removed during controller-service refactoring
  // PDF export functionality is tested via integration tests
  // Business logic (data fetching, HTML generation) is tested in ReportExportService tests

  describe('Error Handling', () => {
    it('exportReportAsExcel - handles database errors', async () => {
      mockReq.body = {
        reportType: 'capacity',
        filters: {}
      };

      mockDb._queueError(new Error('Database connection failed'));

      await controller.exportReportAsExcel(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String)
        })
      );
    });

    it('exportReportAsCSV - handles database errors', async () => {
      mockReq.body = {
        reportType: 'utilization',
        filters: {}
      };

      mockDb._queueError(new Error('Query failed'));

      await controller.exportReportAsCSV(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

  });
});
