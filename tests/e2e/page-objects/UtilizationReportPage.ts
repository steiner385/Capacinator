import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class UtilizationReportPage extends BasePage {
  private readonly path = '/reports';

  // Page-specific selectors
  private pageSelectors = {
    utilizationTab: 'button:has-text("Utilization Report")',
    pageTitle: 'h2:has-text("Team Utilization Overview")',
    utilizationCard: '.stat-card:has-text("Utilization %")',
    overutilizedCard: '.stat-card:has-text("# People Overutilized")',
    underutilizedCard: '.stat-card:has-text("# People Underutilized")',
    optimalCard: '.stat-card:has-text("# People Optimally Utilized")',
    dateRangeStart: 'input[name="startDate"], #startDate',
    dateRangeEnd: 'input[name="endDate"], #endDate',
    locationFilter: 'select:has(option:has-text("All Locations"))',
    projectTypeFilter: 'select:has(option:has-text("All Types"))',
    reduceLoadButton: 'button:has-text("🔻"), button:has-text("Reduce Load"), button:has-text("Reduce")',
    addProjectsButton: 'button:has-text("➕"), button:has-text("Add Projects"), button:has-text("Add")',
    viewDetailsButton: 'button:has-text("View Details")',
    refreshButton: 'button:has-text("Refresh")',
    exportButton: 'button:has-text("Export")',
    findProjectsLink: 'a:has-text("Find Projects"), button:has-text("Find Projects")'
  };

  async navigate(): Promise<void> {
    await this.page.goto(this.path);
    await this.waitForPageLoad();
    await this.clickUtilizationTab();
  }

  async clickUtilizationTab(): Promise<void> {
    await this.helpers.clickAndWait(this.pageSelectors.utilizationTab, {
      waitForSelector: this.pageSelectors.pageTitle
    });
  }

  async getUtilizationStats(): Promise<{
    overall: string;
    overutilized: string;
    underutilized: string;
    optimal: string;
  }> {
    const getStatValue = async (selector: string): Promise<string> => {
      const card = this.page.locator(selector);
      const value = card.locator('.stat-value, .value, [data-testid="stat-value"]');
      return await value.textContent() || '0';
    };

    return {
      overall: await getStatValue(this.pageSelectors.utilizationCard),
      overutilized: await getStatValue(this.pageSelectors.overutilizedCard),
      underutilized: await getStatValue(this.pageSelectors.underutilizedCard),
      optimal: await getStatValue(this.pageSelectors.optimalCard)
    };
  }

  async setDateRange(startDate: string, endDate: string): Promise<void> {
    await this.helpers.fillForm({
      [this.pageSelectors.dateRangeStart]: startDate,
      [this.pageSelectors.dateRangeEnd]: endDate
    });
    await this.helpers.waitForLoadingToComplete();
  }

  async filterByLocation(location: string): Promise<void> {
    await this.helpers.selectOption(this.pageSelectors.locationFilter, location);
    await this.helpers.waitForLoadingToComplete();
  }

  async filterByProjectType(projectType: string): Promise<void> {
    await this.helpers.selectOption(this.pageSelectors.projectTypeFilter, projectType);
    await this.helpers.waitForLoadingToComplete();
  }

  async getPersonUtilization(personName: string): Promise<{
    name: string;
    utilization: string;
    availableCapacity: string;
    availableHours: string;
  } | null> {
    const row = this.page.locator(`tr:has-text("${personName}")`);
    
    if (await row.count() === 0) {
      return null;
    }

    const cells = await row.locator('td').all();
    
    return {
      name: await cells[0]?.textContent() || '',
      utilization: await cells[2]?.textContent() || '0%',
      availableCapacity: await cells[3]?.textContent() || '0%',
      availableHours: await cells[4]?.textContent() || '0'
    };
  }

  async clickReduceLoad(personName: string): Promise<void> {
    const row = this.page.locator(`tr:has-text("${personName}")`);
    const button = row.locator(this.pageSelectors.reduceLoadButton);
    
    await button.click();
    await this.helpers.waitForModal();
  }

  async clickAddProjects(personName: string): Promise<void> {
    const row = this.page.locator(`tr:has-text("${personName}")`);
    const button = row.locator(this.pageSelectors.addProjectsButton);
    
    await button.click();
    await this.helpers.waitForModal();
  }

  async clickViewDetails(personName: string): Promise<void> {
    const row = this.page.locator(`tr:has-text("${personName}")`);
    const button = row.locator(this.pageSelectors.viewDetailsButton);
    
    await button.click();
    await this.helpers.waitForNavigation();
  }

  async getReduceLoadModalAssignments(): Promise<string[]> {
    await this.helpers.waitForModal();
    const assignments = await this.page.locator('[role="dialog"] .assignment-item, [role="dialog"] li').all();
    
    const assignmentTexts: string[] = [];
    for (const assignment of assignments) {
      const text = await assignment.textContent();
      if (text) assignmentTexts.push(text);
    }
    
    return assignmentTexts;
  }

  async selectAssignmentToReduce(assignmentText: string): Promise<void> {
    const assignment = this.page.locator(`[role="dialog"] :has-text("${assignmentText}")`);
    const checkbox = assignment.locator('input[type="checkbox"]').first();
    await checkbox.check();
  }

  async confirmReduceLoad(): Promise<void> {
    const confirmButton = this.page.locator('[role="dialog"] button:has-text("Reduce"), [role="dialog"] button:has-text("Confirm")');
    await confirmButton.click();
    await this.helpers.waitForText('successfully', { timeout: 5000 });
  }

  async getAddProjectsModalProjects(): Promise<string[]> {
    await this.helpers.waitForModal();
    const projects = await this.page.locator('[role="dialog"] .project-item, [role="dialog"] li').all();
    
    const projectTexts: string[] = [];
    for (const project of projects) {
      const text = await project.textContent();
      if (text) projectTexts.push(text);
    }
    
    return projectTexts;
  }

  async selectProjectToAdd(projectText: string): Promise<void> {
    const project = this.page.locator(`[role="dialog"] :has-text("${projectText}")`);
    const checkbox = project.locator('input[type="checkbox"]').first();
    await checkbox.check();
  }

  async setAllocationPercentage(percentage: number): Promise<void> {
    const input = this.page.locator('[role="dialog"] input[name="allocation"], [role="dialog"] input[type="number"]');
    await input.fill(percentage.toString());
  }

  async confirmAddProjects(): Promise<void> {
    const confirmButton = this.page.locator('[role="dialog"] button:has-text("Add"), [role="dialog"] button:has-text("Assign")');
    await confirmButton.click();
    await this.helpers.waitForText('successfully', { timeout: 5000 });
  }

  async refreshReport(): Promise<void> {
    await this.helpers.clickAndWait(this.pageSelectors.refreshButton);
    await this.helpers.waitForLoadingToComplete();
  }

  async exportReport(format: 'csv' | 'excel' | 'pdf' = 'csv'): Promise<void> {
    await this.helpers.clickAndWait(this.pageSelectors.exportButton);
    const formatButton = this.page.locator(`button:has-text("${format.toUpperCase()}")`);
    await formatButton.click();
  }

  async clickFindProjects(): Promise<void> {
    await this.helpers.clickAndWait(this.pageSelectors.findProjectsLink, {
      waitForNavigation: true
    });
  }

  async getPeopleWithHighUtilization(threshold: number = 100): Promise<string[]> {
    const rows = await this.page.locator('table tbody tr').all();
    const highUtilizationPeople: string[] = [];

    for (const row of rows) {
      const utilizationCell = row.locator('td:nth-child(3)');
      const utilizationText = await utilizationCell.textContent();
      const utilization = parseInt(utilizationText?.replace('%', '') || '0');
      
      if (utilization >= threshold) {
        const nameCell = row.locator('td:first-child');
        const name = await nameCell.textContent();
        if (name) highUtilizationPeople.push(name);
      }
    }

    return highUtilizationPeople;
  }

  async getPeopleWithLowUtilization(threshold: number = 50): Promise<string[]> {
    const rows = await this.page.locator('table tbody tr').all();
    const lowUtilizationPeople: string[] = [];

    for (const row of rows) {
      const utilizationCell = row.locator('td:nth-child(3)');
      const utilizationText = await utilizationCell.textContent();
      const utilization = parseInt(utilizationText?.replace('%', '') || '0');
      
      if (utilization <= threshold) {
        const nameCell = row.locator('td:first-child');
        const name = await nameCell.textContent();
        if (name) lowUtilizationPeople.push(name);
      }
    }

    return lowUtilizationPeople;
  }

  async verifyUtilizationDisplay(): Promise<boolean> {
    try {
      await this.helpers.waitForElement(this.pageSelectors.pageTitle);
      await this.helpers.waitForTable();
      const rowCount = await this.getTableRowCount();
      return rowCount > 0;
    } catch {
      return false;
    }
  }
}