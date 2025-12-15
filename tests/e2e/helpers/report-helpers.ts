import { Page } from '@playwright/test';
import { StandardTestHelpers } from './standard-test-helpers';

/**
 * Domain-specific helpers for report-related operations
 */
export class ReportHelpers {
  private helpers: StandardTestHelpers;

  constructor(private page: Page) {
    this.helpers = new StandardTestHelpers(page);
  }

  /**
   * Navigate to reports section
   */
  async navigateToReports(reportType?: 'utilization' | 'capacity' | 'forecast'): Promise<void> {
    await this.page.goto('/reports');
    await this.helpers.waitForPageReady();

    if (reportType) {
      const tabButton = this.page.locator(`button:has-text("${reportType}"), [data-testid="${reportType}-tab"]`);
      await tabButton.click();
      await this.helpers.waitForLoadingToComplete();
    }
  }

  /**
   * Configure report parameters
   */
  async configureReport(config: {
    startDate?: string;
    endDate?: string;
    locations?: string[];
    departments?: string[];
    projectTypes?: string[];
    includeContractors?: boolean;
    groupBy?: 'person' | 'project' | 'department' | 'location';
  }): Promise<void> {
    // Date range
    if (config.startDate) {
      await this.helpers.fillForm({ 'input[name="startDate"]': config.startDate });
    }

    if (config.endDate) {
      await this.helpers.fillForm({ 'input[name="endDate"]': config.endDate });
    }

    // Multi-select filters
    if (config.locations && config.locations.length > 0) {
      await this.selectMultipleOptions('locations', config.locations);
    }

    if (config.departments && config.departments.length > 0) {
      await this.selectMultipleOptions('departments', config.departments);
    }

    if (config.projectTypes && config.projectTypes.length > 0) {
      await this.selectMultipleOptions('projectTypes', config.projectTypes);
    }

    // Checkboxes
    if (config.includeContractors !== undefined) {
      const checkbox = this.page.locator('input[name="includeContractors"]');
      if (config.includeContractors) {
        await checkbox.check();
      } else {
        await checkbox.uncheck();
      }
    }

    // Group by
    if (config.groupBy) {
      await this.helpers.selectOption('select[name="groupBy"]', config.groupBy);
    }

    // Run report
    await this.page.click('button:has-text("Run Report"), button:has-text("Generate")');
    await this.helpers.waitForLoadingToComplete();
  }

  /**
   * Select multiple options in a multi-select
   */
  private async selectMultipleOptions(fieldName: string, options: string[]): Promise<void> {
    const multiSelect = this.page.locator(`[data-testid="${fieldName}-select"], [name="${fieldName}"]`);
    
    // Click to open dropdown
    await multiSelect.click();
    
    // Select each option
    for (const option of options) {
      const optionElement = this.page.locator(`[role="option"]:has-text("${option}")`);
      await optionElement.click();
    }
    
    // Click outside to close
    await this.page.keyboard.press('Escape');
  }

  /**
   * Get utilization report data
   */
  async getUtilizationReportData(): Promise<{
    summary: {
      averageUtilization: string;
      overutilized: number;
      optimal: number;
      underutilized: number;
    };
    details: Array<{
      name: string;
      utilization: string;
      allocated: string;
      available: string;
      variance: string;
    }>;
  }> {
    // Get summary stats
    const summary = {
      averageUtilization: await this.getStatValue('Average Utilization'),
      overutilized: parseInt(await this.getStatValue('Overutilized', 10)),
      optimal: parseInt(await this.getStatValue('Optimal', 10)),
      underutilized: parseInt(await this.getStatValue('Underutilized', 10))
    };

    // Get detail rows
    const details = await this.helpers.getTableDataWithHeaders();

    return { summary, details };
  }

  /**
   * Get capacity planning report data
   */
  async getCapacityReportData(): Promise<{
    currentCapacity: string;
    projectedDemand: string;
    capacityGap: string;
    recommendations: string[];
  }> {
    const data = {
      currentCapacity: await this.getStatValue('Current Capacity'),
      projectedDemand: await this.getStatValue('Projected Demand'),
      capacityGap: await this.getStatValue('Capacity Gap'),
      recommendations: []
    };

    // Get recommendations
    const recommendationsList = await this.page.locator('.recommendations li, [data-testid="recommendations"] li').all();
    for (const item of recommendationsList) {
      const text = await item.textContent();
      if (text) data.recommendations.push(text);
    }

    return data;
  }

  /**
   * Get forecast report data
   */
  async getForecastReportData(): Promise<{
    confidenceLevel: string;
    projectedCompletion: string;
    riskFactors: string[];
    scenarios: Array<{
      name: string;
      probability: string;
      impact: string;
    }>;
  }> {
    const data = {
      confidenceLevel: await this.getStatValue('Confidence Level'),
      projectedCompletion: await this.getStatValue('Projected Completion'),
      riskFactors: [],
      scenarios: []
    };

    // Get risk factors
    const riskList = await this.page.locator('.risk-factors li, [data-testid="risk-factors"] li').all();
    for (const item of riskList) {
      const text = await item.textContent();
      if (text) data.riskFactors.push(text);
    }

    // Get scenario data
    const scenarioRows = await this.page.locator('.scenarios-table tbody tr, [data-testid="scenarios"] tbody tr').all();
    for (const row of scenarioRows) {
      const cells = await row.locator('td').all();
      if (cells.length >= 3) {
        data.scenarios.push({
          name: await cells[0].textContent() || '',
          probability: await cells[1].textContent() || '',
          impact: await cells[2].textContent() || ''
        });
      }
    }

    return data;
  }

  /**
   * Get stat value from summary card
   */
  private async getStatValue(label: string): Promise<string> {
    const card = this.page.locator(`.stat-card:has-text("${label}"), [data-testid="stat-${label.toLowerCase().replace(/\s+/g, '-')}"]`);
    const value = card.locator('.stat-value, .value, [data-testid="value"]');
    return await value.textContent() || '0';
  }

  /**
   * Export report in various formats
   */
  async exportReport(format: 'pdf' | 'excel' | 'csv' | 'powerpoint'): Promise<void> {
    await this.page.click('button:has-text("Export"), [data-testid="export-button"]');
    
    // Select format
    const formatButton = this.page.locator(`button:has-text("${format.toUpperCase()}"), [data-testid="export-${format}"]`);
    await formatButton.click();

    // Handle format-specific options
    if (format === 'pdf' || format === 'powerpoint') {
      // Select template if available
      const templateSelect = this.page.locator('select[name="template"]');
      if (await templateSelect.count() > 0) {
        await this.helpers.selectOption('select[name="template"]', 'Executive Summary');
      }
    }

    // Trigger export
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click('button:has-text("Download"), button:has-text("Export")');
    await downloadPromise;
  }

  /**
   * Schedule report
   */
  async scheduleReport(schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
    time?: string;
    dayOfWeek?: string;
    dayOfMonth?: number;
  }): Promise<void> {
    await this.page.click('button:has-text("Schedule"), [data-testid="schedule-button"]');
    await this.helpers.waitForModal();

    // Set frequency
    await this.helpers.selectOption('select[name="frequency"]', schedule.frequency);

    // Set timing based on frequency
    if (schedule.time) {
      await this.helpers.fillForm({ 'input[name="time"]': schedule.time });
    }

    if (schedule.frequency === 'weekly' && schedule.dayOfWeek) {
      await this.helpers.selectOption('select[name="dayOfWeek"]', schedule.dayOfWeek);
    }

    if (schedule.frequency === 'monthly' && schedule.dayOfMonth) {
      await this.helpers.fillForm({ 'input[name="dayOfMonth"]': schedule.dayOfMonth.toString() });
    }

    // Add recipients
    const recipientInput = this.page.locator('input[name="recipients"], [data-testid="recipient-input"]');
    for (const recipient of schedule.recipients) {
      await recipientInput.fill(recipient);
      await this.page.keyboard.press('Enter');
    }

    // Save schedule
    await this.page.click('button:has-text("Schedule Report")');
    await this.helpers.waitForText('scheduled');
  }

  /**
   * Save report as template
   */
  async saveAsTemplate(name: string, description?: string): Promise<void> {
    await this.page.click('button:has-text("Save as Template"), [data-testid="save-template"]');
    await this.helpers.waitForModal();

    await this.helpers.fillForm({
      'input[name="templateName"]': name
    });

    if (description) {
      await this.helpers.fillForm({
        'textarea[name="templateDescription"]': description
      });
    }

    await this.page.click('button:has-text("Save Template")');
    await this.helpers.waitForText('saved');
  }

  /**
   * Load report template
   */
  async loadTemplate(templateName: string): Promise<void> {
    await this.page.click('button:has-text("Templates"), [data-testid="templates-button"]');
    
    const templateOption = this.page.locator(`[data-template-name="${templateName}"], button:has-text("${templateName}")`);
    await templateOption.click();
    
    await this.helpers.waitForLoadingToComplete();
  }

  /**
   * Compare periods
   */
  async enablePeriodComparison(previousPeriod: {
    startDate: string;
    endDate: string;
  }): Promise<void> {
    const compareToggle = this.page.locator('input[name="enableComparison"], [data-testid="compare-toggle"]');
    await compareToggle.check();

    // Set comparison period
    await this.helpers.fillForm({
      'input[name="compareStartDate"]': previousPeriod.startDate,
      'input[name="compareEndDate"]': previousPeriod.endDate
    });

    // Refresh report
    await this.page.click('button:has-text("Update"), button:has-text("Refresh")');
    await this.helpers.waitForLoadingToComplete();
  }

  /**
   * Get comparison data
   */
  async getComparisonData(): Promise<{
    metric: string;
    current: string;
    previous: string;
    change: string;
    trend: 'up' | 'down' | 'stable';
  }[]> {
    const comparisonData = [];
    const rows = await this.page.locator('.comparison-table tbody tr, [data-testid="comparison"] tbody tr').all();

    for (const row of rows) {
      const cells = await row.locator('td').all();
      if (cells.length >= 4) {
        const trendIcon = await row.locator('.trend-icon, [data-testid="trend"]').getAttribute('data-trend');
        
        comparisonData.push({
          metric: await cells[0].textContent() || '',
          current: await cells[1].textContent() || '',
          previous: await cells[2].textContent() || '',
          change: await cells[3].textContent() || '',
          trend: (trendIcon as 'up' | 'down' | 'stable') || 'stable'
        });
      }
    }

    return comparisonData;
  }

  /**
   * Drill down into report details
   */
  async drillDown(entityName: string): Promise<void> {
    const drillDownLink = this.page.locator(`a:has-text("${entityName}"), [data-entity="${entityName}"]`);
    await drillDownLink.click();
    await this.helpers.waitForPageReady();
  }

  /**
   * Add report annotation
   */
  async addAnnotation(text: string, dataPoint?: string): Promise<void> {
    if (dataPoint) {
      // Click on specific data point
      const point = this.page.locator(`[data-point="${dataPoint}"]`);
      await point.click({ button: 'right' });
      await this.page.click('button:has-text("Add Note"), [data-testid="add-annotation"]');
    } else {
      // General annotation
      await this.page.click('button:has-text("Add Note"), [data-testid="add-annotation"]');
    }

    await this.helpers.waitForModal();
    await this.helpers.fillForm({
      'textarea[name="annotation"]': text
    });

    await this.page.click('button:has-text("Save Note")');
    await this.helpers.waitForText('added');
  }

  /**
   * Generate executive summary
   */
  async generateExecutiveSummary(): Promise<string> {
    await this.page.click('button:has-text("Executive Summary"), [data-testid="exec-summary"]');
    await this.helpers.waitForModal();

    const summaryText = await this.page.locator('.executive-summary-content, [data-testid="summary-content"]').textContent();
    
    return summaryText || '';
  }

  /**
   * Set report alerts
   */
  async setAlert(alert: {
    metric: string;
    condition: 'above' | 'below' | 'equals';
    threshold: number;
    recipients: string[];
  }): Promise<void> {
    await this.page.click('button:has-text("Set Alert"), [data-testid="set-alert"]');
    await this.helpers.waitForModal();

    await this.helpers.selectOption('select[name="metric"]', alert.metric);
    await this.helpers.selectOption('select[name="condition"]', alert.condition);
    await this.helpers.fillForm({
      'input[name="threshold"]': alert.threshold.toString()
    });

    // Add recipients
    const recipientInput = this.page.locator('input[name="alertRecipients"]');
    for (const recipient of alert.recipients) {
      await recipientInput.fill(recipient);
      await this.page.keyboard.press('Enter');
    }

    await this.page.click('button:has-text("Create Alert")');
    await this.helpers.waitForText('created');
  }
}