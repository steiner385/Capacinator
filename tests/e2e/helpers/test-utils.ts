import { Page, expect } from '@playwright/test';

export class TestUtils {
  constructor(private page: Page) {}

  /**
   * Wait for API request to complete and validate response
   */
  async waitForAPIResponse(url: string, expectedStatus: number = 200) {
    const response = await this.page.waitForResponse(response => 
      response.url().includes(url) && response.status() === expectedStatus
    );
    return response;
  }

  /**
   * Fill form fields with validation
   */
  async fillFormField(selector: string, value: string, validate: boolean = true) {
    await this.page.fill(selector, value);
    if (validate) {
      await expect(this.page.locator(selector)).toHaveValue(value);
    }
  }

  /**
   * Select option from dropdown with validation
   */
  async selectOption(selector: string, value: string, validate: boolean = true) {
    await this.page.selectOption(selector, value);
    if (validate) {
      await expect(this.page.locator(selector)).toHaveValue(value);
    }
  }

  /**
   * Navigate to page and wait for load
   */
  async navigateAndWait(path: string, waitForSelector?: string) {
    await this.page.goto(path);
    if (waitForSelector) {
      await this.page.waitForSelector(waitForSelector);
    }
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check for error messages and handle them
   */
  async checkForErrors() {
    const errorMessages = this.page.locator('.error-message, .alert-error, .toast-error');
    const count = await errorMessages.count();
    
    if (count > 0) {
      const errorText = await errorMessages.first().textContent();
      throw new Error(`Application error detected: ${errorText}`);
    }
  }

  /**
   * Wait for loading states to complete
   */
  async waitForLoadingToComplete() {
    await this.page.waitForSelector('.loading', { state: 'detached' });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Verify chart is rendered correctly
   */
  async verifyChartRendered(chartSelector: string) {
    const chart = this.page.locator(chartSelector);
    await expect(chart).toBeVisible();
    
    // Check for common chart elements
    await expect(chart.locator('.recharts-wrapper')).toBeVisible();
    await expect(chart.locator('.recharts-surface')).toBeVisible();
    
    // Verify chart has data
    const dataPoints = chart.locator('.recharts-line-dot, .recharts-bar-rectangle, .recharts-area-area');
    await expect(dataPoints.first()).toBeVisible();
  }

  /**
   * Verify table data is loaded
   */
  async verifyTableData(tableSelector: string, expectedMinRows: number = 1) {
    const table = this.page.locator(tableSelector);
    await expect(table).toBeVisible();
    
    const rows = table.locator('tr, .table-row');
    await expect(rows).toHaveCount(expectedMinRows, { timeout: 10000 });
  }

  /**
   * Create a new assignment with validation
   */
  async createAssignment(assignment: {
    personId: string;
    projectId: string;
    roleId: string;
    startDate: string;
    endDate: string;
    allocationPercentage: number;
  }) {
    await this.page.click('button:has-text("New Assignment")');
    
    await this.selectOption('select[name="person_id"]', assignment.personId);
    await this.selectOption('select[name="project_id"]', assignment.projectId);
    await this.selectOption('select[name="role_id"]', assignment.roleId);
    await this.fillFormField('input[name="start_date"]', assignment.startDate);
    await this.fillFormField('input[name="end_date"]', assignment.endDate);
    await this.fillFormField('input[name="allocation_percentage"]', assignment.allocationPercentage.toString());
    
    await this.page.click('button:has-text("Create Assignment")');
    await this.waitForLoadingToComplete();
    await this.checkForErrors();
  }

  /**
   * Create a new project with validation
   */
  async createProject(project: {
    name: string;
    projectTypeId: string;
    locationId: string;
    priority: number;
    description: string;
    includeInDemand: boolean;
    aspirationStart: string;
    aspirationFinish: string;
    ownerId: string;
  }) {
    await this.page.click('button:has-text("New Project")');
    
    await this.fillFormField('input[name="name"]', project.name);
    await this.selectOption('select[name="project_type_id"]', project.projectTypeId);
    await this.selectOption('select[name="location_id"]', project.locationId);
    await this.selectOption('select[name="priority"]', project.priority.toString());
    await this.fillFormField('textarea[name="description"]', project.description);
    
    if (project.includeInDemand) {
      await this.page.check('input[name="include_in_demand"]');
    }
    
    await this.fillFormField('input[name="aspiration_start"]', project.aspirationStart);
    await this.fillFormField('input[name="aspiration_finish"]', project.aspirationFinish);
    await this.selectOption('select[name="owner_id"]', project.ownerId);
    
    await this.page.click('button:has-text("Create Project")');
    await this.waitForLoadingToComplete();
    await this.checkForErrors();
  }

  /**
   * Add availability override
   */
  async addAvailabilityOverride(override: {
    personId: string;
    startDate: string;
    endDate: string;
    availabilityPercentage: number;
    overrideType: string;
    reason: string;
  }) {
    await this.page.click(`a[href="/people/${override.personId}"]`);
    await this.page.click('button:has-text("Edit")');
    await this.page.click('button:has-text("Add Time Off")');
    
    await this.fillFormField('input[name="start_date"]', override.startDate);
    await this.fillFormField('input[name="end_date"]', override.endDate);
    await this.fillFormField('input[name="availability_percentage"]', override.availabilityPercentage.toString());
    await this.selectOption('select[name="override_type"]', override.overrideType);
    await this.fillFormField('textarea[name="reason"]', override.reason);
    
    await this.page.click('button:has-text("Save Override")');
    await this.waitForLoadingToComplete();
    await this.checkForErrors();
  }

  /**
   * Verify assignment conflicts
   */
  async verifyAssignmentConflicts(expectedConflicts: number) {
    await this.navigateAndWait('/assignments');
    
    const conflictWarnings = this.page.locator('.conflict-warning, .over-allocated');
    await expect(conflictWarnings).toHaveCount(expectedConflicts);
    
    if (expectedConflicts > 0) {
      await expect(conflictWarnings.first()).toContainText('over-allocated');
    }
  }

  /**
   * Verify capacity report data
   */
  async verifyCapacityReport(expectedLocations: number, expectedRoles: number) {
    await this.navigateAndWait('/reports');
    await this.page.click('button:has-text("Generate Capacity Report")');
    await this.waitForLoadingToComplete();
    
    const locationCapacity = this.page.locator('.location-capacity');
    await expect(locationCapacity).toHaveCount(expectedLocations);
    
    const roleCapacity = this.page.locator('.role-capacity');
    await expect(roleCapacity).toHaveCount(expectedRoles);
  }

  /**
   * Verify demand vs capacity reconciliation
   */
  async verifyDemandVsCapacity() {
    await this.navigateAndWait('/reports');
    await this.page.click('button:has-text("Demand vs Capacity")');
    await this.waitForLoadingToComplete();
    
    await this.verifyChartRendered('.demand-chart');
    await this.verifyChartRendered('.capacity-chart');
    
    // Check for capacity gaps
    const capacityGaps = this.page.locator('.capacity-gap');
    const gapCount = await capacityGaps.count();
    
    if (gapCount > 0) {
      await expect(capacityGaps.first().locator('.gap-details')).toBeVisible();
    }
  }

  /**
   * Verify person allocation chart
   */
  async verifyPersonAllocationChart(personId: string) {
    await this.navigateAndWait(`/people/${personId}`);
    
    const allocationSection = this.page.locator('.allocation-chart-section');
    await expect(allocationSection).toBeVisible();
    
    await this.verifyChartRendered('.allocation-chart');
    
    // Verify chart shows utilization data
    const utilizationTrend = this.page.locator('.utilization-trend');
    await expect(utilizationTrend).toBeVisible();
  }

  /**
   * Verify project demand chart
   */
  async verifyProjectDemandChart(projectId: string) {
    await this.navigateAndWait(`/projects/${projectId}`);
    
    const demandSection = this.page.locator('.demand-curve-section');
    await expect(demandSection).toBeVisible();
    
    await this.verifyChartRendered('.demand-chart');
    
    // Verify chart shows demand over time
    const demandLine = this.page.locator('.recharts-line');
    await expect(demandLine).toBeVisible();
  }

  /**
   * Simulate bulk operations
   */
  async performBulkAssignment(assignments: Array<{
    personId: string;
    projectId: string;
    roleId: string;
    allocationPercentage: number;
  }>) {
    await this.navigateAndWait('/assignments');
    await this.page.click('button:has-text("Bulk Assign")');
    
    for (const assignment of assignments) {
      await this.selectOption('select[name="person_id"]', assignment.personId);
      await this.selectOption('select[name="project_id"]', assignment.projectId);
      await this.selectOption('select[name="role_id"]', assignment.roleId);
      await this.fillFormField('input[name="allocation_percentage"]', assignment.allocationPercentage.toString());
      
      await this.page.click('button:has-text("Add to Batch")');
    }
    
    await this.page.click('button:has-text("Process Batch")');
    await this.waitForLoadingToComplete();
    await this.checkForErrors();
  }

  /**
   * Verify executive dashboard metrics
   */
  async verifyExecutiveDashboard() {
    await this.navigateAndWait('/reports');
    await this.page.click('button:has-text("Executive Dashboard")');
    await this.waitForLoadingToComplete();
    
    // Verify key dashboard components
    await expect(this.page.locator('.executive-summary')).toBeVisible();
    await expect(this.page.locator('.portfolio-health')).toBeVisible();
    await expect(this.page.locator('.resource-utilization')).toBeVisible();
    await expect(this.page.locator('.risk-indicators')).toBeVisible();
    
    // Verify health metrics
    const healthMetrics = this.page.locator('.health-metric');
    await expect(healthMetrics).toHaveCount(4, { timeout: 10000 }); // One per location
    
    // Verify utilization charts
    await this.verifyChartRendered('.utilization-chart');
  }

  /**
   * Test data cleanup verification
   */
  async verifyCleanup() {
    // Verify test data was properly cleaned up
    await this.navigateAndWait('/people');
    const testPeople = this.page.locator('.person-card:has-text("Test_")');
    await expect(testPeople).toHaveCount(0);
    
    await this.navigateAndWait('/projects');
    const testProjects = this.page.locator('.project-card:has-text("Test_")');
    await expect(testProjects).toHaveCount(0);
  }
}