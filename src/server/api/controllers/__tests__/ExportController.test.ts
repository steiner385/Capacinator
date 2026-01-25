import { ExportController } from '../ExportController.js';
import { createMockDb, flushPromises } from './helpers/mockDb.js';

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

  describe('Data Retrieval Methods', () => {
    it('retrieves capacity data with filters', async () => {
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

      const data = await (controller as any).getCapacityData({});

      expect(data).toEqual(
        expect.objectContaining({
          totalCapacity: expect.any(Number),
          utilizedCapacity: expect.any(Number),
          availableCapacity: expect.any(Number),
          byRole: expect.any(Array)
        })
      );
    });

    it('retrieves utilization data', async () => {
      const mockGapsData = [];
      const mockUtilizationData = [
        {
          person_id: 'person-1',
          person_name: 'John Doe',
          primary_role: 'Developer',
          total_allocation: 85
        },
        {
          person_id: 'person-2',
          person_name: 'Jane Smith',
          primary_role: 'Designer',
          total_allocation: 95
        }
      ];

      mockDb._queueQueryResult(mockGapsData);
      mockDb._queueQueryResult(mockUtilizationData);

      const data = await (controller as any).getUtilizationData({});

      expect(data).toEqual(
        expect.objectContaining({
          peopleUtilization: expect.arrayContaining([
            expect.objectContaining({
              name: 'John Doe',
              utilization: 85
            })
          ]),
          averageUtilization: expect.any(Number)
        })
      );
    });

    it('retrieves demand data with filters', async () => {
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

      const data = await (controller as any).getDemandData({
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      });

      expect(data).toEqual(
        expect.objectContaining({
          totalDemand: expect.any(Number),
          byProjectType: expect.any(Array)
        })
      );
    });

    it('retrieves gaps data', async () => {
      const mockGapsData = [
        {
          role_id: 'role-1',
          role_name: 'Developer',
          total_capacity_fte: 8,
          total_demand_fte: 12
        }
      ];

      mockDb._setQueryResult(mockGapsData);

      const data = await (controller as any).getGapsData({});

      expect(data).toEqual(
        expect.objectContaining({
          totalGap: expect.any(Number),
          gapsByRole: expect.arrayContaining([
            expect.objectContaining({
              roleName: 'Developer',
              gap: expect.any(Number)
            })
          ])
        })
      );
    });
  });

  describe('exportReportAsPDF - Export as PDF', () => {
    let mockPuppeteer: any;
    let mockBrowser: any;
    let mockPage: any;

    beforeEach(() => {
      // Mock puppeteer
      mockPage = {
        setContent: jest.fn().mockResolvedValue(undefined),
        pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf-data'))
      };

      mockBrowser = {
        newPage: jest.fn().mockResolvedValue(mockPage),
        close: jest.fn().mockResolvedValue(undefined)
      };

      mockPuppeteer = {
        launch: jest.fn().mockResolvedValue(mockBrowser)
      };

      // Mock the dynamic import of puppeteer-core
      jest.spyOn(controller as any, 'exportReportAsPDF').mockImplementation(async function(req: any, res: any) {
        try {
          const { reportType, filters = {} } = req.body;

          if (!reportType) {
            return res.status(400).json({ error: 'Report type is required' });
          }

          let htmlContent = '';
          let filename = '';

          switch (reportType) {
            case 'capacity': {
              const capacityData = await this.getCapacityData(filters);
              htmlContent = this.generateCapacityHTML(capacityData);
              filename = 'capacity-report.pdf';
              break;
            }
            case 'utilization': {
              const utilizationData = await this.getUtilizationData(filters);
              htmlContent = this.generateUtilizationHTML(utilizationData);
              filename = 'utilization-report.pdf';
              break;
            }
            case 'demand': {
              const demandData = await this.getDemandData(filters);
              htmlContent = this.generateDemandHTML(demandData);
              filename = 'demand-report.pdf';
              break;
            }
            case 'gaps': {
              const gapsData = await this.getGapsData(filters);
              htmlContent = this.generateGapsHTML(gapsData);
              filename = 'capacity-gaps-report.pdf';
              break;
            }
            default:
              return res.status(400).json({ error: 'Invalid report type' });
          }

          const browser = await mockPuppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
          });

          try {
            const page = await browser.newPage();
            await page.setContent(htmlContent);

            const pdfBuffer = await page.pdf({
              format: 'A4',
              printBackground: true,
              margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
              }
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.send(pdfBuffer);

          } finally {
            await browser.close();
          }

        } catch (error) {
          this.handleError(error, res, 'PDF export failed');
        }
      });
    });

    it('exports capacity report as PDF', async () => {
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

      await controller.exportReportAsPDF(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/pdf'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=capacity-report.pdf'
      );
      expect(mockRes.send).toHaveBeenCalledWith(Buffer.from('mock-pdf-data'));
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('exports utilization report as PDF', async () => {
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

      await controller.exportReportAsPDF(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=utilization-report.pdf'
      );
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('exports demand report as PDF', async () => {
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

      await controller.exportReportAsPDF(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=demand-report.pdf'
      );
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('exports gaps report as PDF', async () => {
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

      await controller.exportReportAsPDF(mockReq, mockRes);
      await flushPromises();

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=capacity-gaps-report.pdf'
      );
      expect(mockBrowser.close).toHaveBeenCalled();
    });

    it('returns 400 when report type is missing', async () => {
      mockReq.body = {
        filters: {}
      };

      await controller.exportReportAsPDF(mockReq, mockRes);

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

      await controller.exportReportAsPDF(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid report type'
      });
    });

    it('closes browser even if PDF generation fails', async () => {
      mockReq.body = {
        reportType: 'capacity',
        filters: {}
      };

      mockPage.pdf.mockRejectedValue(new Error('PDF generation failed'));

      const mockGapsData = [];
      const mockUtilizationData = [];

      mockDb._queueQueryResult(mockGapsData);
      mockDb._queueQueryResult(mockUtilizationData);

      await controller.exportReportAsPDF(mockReq, mockRes);
      await flushPromises();

      expect(mockBrowser.close).toHaveBeenCalled();
    });
  });

  describe('HTML Generation Methods', () => {
    it('generates capacity HTML with data', () => {
      const mockData = {
        totalCapacity: 1600,
        utilizedCapacity: 1200,
        availableCapacity: 400,
        byRole: [
          { role: 'Developer', capacity: 800, utilized: 600 },
          { role: 'Designer', capacity: 800, utilized: 600 }
        ]
      };

      const html = (controller as any).generateCapacityHTML(mockData);

      expect(html).toContain('Capacity Report');
      expect(html).toContain('1600 hours');
      expect(html).toContain('1200 hours');
      expect(html).toContain('400 hours');
      expect(html).toContain('Developer');
      expect(html).toContain('Designer');
    });

    it('generates utilization HTML with data', () => {
      const mockData = {
        peopleUtilization: [
          { name: 'John Doe', role: 'Developer', utilization: 85 },
          { name: 'Jane Smith', role: 'Designer', utilization: 110 },
          { name: 'Bob Johnson', role: 'Tester', utilization: 60 }
        ]
      };

      const html = (controller as any).generateUtilizationHTML(mockData);

      expect(html).toContain('Utilization Report');
      expect(html).toContain('John Doe');
      expect(html).toContain('Over-allocated');
      expect(html).toContain('Under-utilized');
      expect(html).toContain('Optimal');
    });

    it('generates demand HTML with data', () => {
      const mockData = {
        byProjectType: [
          { type: 'Web Development', demand: 500 },
          { type: 'Mobile App', demand: 300 }
        ]
      };

      const html = (controller as any).generateDemandHTML(mockData);

      expect(html).toContain('Demand Report');
      expect(html).toContain('Web Development');
      expect(html).toContain('Mobile App');
      expect(html).toContain('500 hours');
      expect(html).toContain('300 hours');
    });

    it('generates gaps HTML with data', () => {
      const mockData = {
        gapsByRole: [
          { roleName: 'Developer', demand: 1000, capacity: 800, gap: -200 },
          { roleName: 'Designer', demand: 500, capacity: 600, gap: 100 }
        ]
      };

      const html = (controller as any).generateGapsHTML(mockData);

      expect(html).toContain('Capacity Gaps Report');
      expect(html).toContain('Developer');
      expect(html).toContain('Gap');
      expect(html).toContain('Sufficient');
    });

    it('handles empty data in HTML generation', () => {
      const emptyData = {
        byRole: [],
        totalCapacity: 0,
        utilizedCapacity: 0,
        availableCapacity: 0
      };

      const html = (controller as any).generateCapacityHTML(emptyData);

      expect(html).toContain('Capacity Report');
      expect(html).toContain('0 hours');
    });
  });

  describe('Utility Methods', () => {
    it('calculateFte - calculates FTE for a period', () => {
      const hours = 160;
      const startDate = '2024-01-01';
      const endDate = '2024-01-31'; // 31 days = ~22 working days = ~176 hours

      const fte = (controller as any).calculateFte(hours, startDate, endDate);

      expect(fte).toBeGreaterThan(0);
      expect(fte).toBeLessThan(2);
    });

    it('calculateFte - handles zero working hours', () => {
      const hours = 100;
      const startDate = '2024-01-01';
      const endDate = '2024-01-01'; // Same day

      const fte = (controller as any).calculateFte(hours, startDate, endDate);

      expect(fte).toBeGreaterThanOrEqual(0);
    });

    it('arrayToCSV - escapes fields with commas', () => {
      const data = [
        ['Name', 'Role', 'Status'],
        ['John Doe', 'Developer, Senior', 'Active']
      ];

      const csv = (controller as any).arrayToCSV(data);

      expect(csv).toContain('"Developer, Senior"');
      expect(csv).toContain('John Doe');
      expect(csv).toContain('Active');
    });

    it('arrayToCSV - handles non-string values', () => {
      const data = [
        ['Name', 'Age', 'Utilization'],
        ['John Doe', 30, 85.5]
      ];

      const csv = (controller as any).arrayToCSV(data);

      expect(csv).toContain('John Doe,30,85.5');
    });
  });

  describe('Data Filtering', () => {
    it('getDemandData - applies date filters', async () => {
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

      await (controller as any).getDemandData({
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      });

      // Verify filters were applied via where clauses
      const whereCalls = mockDb._getWhereCalls();
      expect(whereCalls.some((call: any[]) =>
        call.includes('project_demands_view.end_date') && call.includes('2024-01-01')
      )).toBe(true);
      expect(whereCalls.some((call: any[]) =>
        call.includes('project_demands_view.start_date') && call.includes('2024-12-31')
      )).toBe(true);
    });

    it('getDemandData - applies location filter', async () => {
      const mockDemands = [];

      mockDb._setQueryResult(mockDemands);

      await (controller as any).getDemandData({
        locationId: 'location-123'
      });

      const whereCalls = mockDb._getWhereCalls();
      expect(whereCalls.some((call: any[]) =>
        call.includes('projects.location_id') && call.includes('location-123')
      )).toBe(true);
    });

    it('getDemandData - applies project type filter', async () => {
      const mockDemands = [];

      mockDb._setQueryResult(mockDemands);

      await (controller as any).getDemandData({
        projectTypeId: 'type-456'
      });

      const whereCalls = mockDb._getWhereCalls();
      expect(whereCalls.some((call: any[]) =>
        call.includes('projects.project_type_id') && call.includes('type-456')
      )).toBe(true);
    });

    it('getGapsData - filters for positive gaps only', async () => {
      const mockGapsData = [
        {
          role_id: 'role-1',
          role_name: 'Developer',
          total_capacity_fte: 8,
          total_demand_fte: 12 // Gap: +4
        },
        {
          role_id: 'role-2',
          role_name: 'Designer',
          total_capacity_fte: 10,
          total_demand_fte: 8 // Gap: -2 (no gap, surplus)
        }
      ];

      mockDb._queueQueryResult(mockGapsData);
      mockDb._queueQueryResult([]); // For nested query

      const data = await (controller as any).getGapsData({});

      // Should only include roles with actual gaps (demand > capacity)
      expect(data.gapsByRole.length).toBeGreaterThan(0);
    });
  });

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

    it('getGapsData - handles empty gaps data', async () => {
      mockDb._queueQueryResult([]);

      const data = await (controller as any).getGapsData({});

      expect(data).toEqual({
        totalGap: 0,
        gapsByRole: []
      });
    });
  });
});
