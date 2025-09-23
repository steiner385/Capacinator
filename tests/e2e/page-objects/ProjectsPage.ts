import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class ProjectsPage extends BasePage {
  private readonly path = '/projects';

  async navigate(): Promise<void> {
    await this.page.goto(this.path);
    await this.waitForPageLoad();
  }

  async clickAddProject(): Promise<void> {
    await this.helpers.clickAndWait('button:has-text("New Project"), button:has-text("Add Project")', {
      waitForSelector: '[role="dialog"]'
    });
  }

  async fillProjectForm(data: {
    name?: string;
    description?: string;
    priority?: number;
    location?: string;
    projectType?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<void> {
    if (data.name) {
      await this.helpers.fillForm({ 'input[name="name"]': data.name });
    }
    if (data.description) {
      await this.helpers.fillForm({ 'textarea[name="description"]': data.description });
    }
    if (data.priority) {
      await this.helpers.selectOption('select[name="priority"]', data.priority.toString());
    }
    if (data.location) {
      await this.helpers.selectOption('select[name="location_id"]', data.location);
    }
    if (data.projectType) {
      await this.helpers.selectOption('select[name="project_type_id"]', data.projectType);
    }
    if (data.startDate) {
      await this.helpers.fillForm({ 'input[name="start_date"]': data.startDate });
    }
    if (data.endDate) {
      await this.helpers.fillForm({ 'input[name="end_date"]': data.endDate });
    }
  }

  async saveProject(): Promise<void> {
    await this.submitForm();
    await this.helpers.waitForText('successfully');
  }

  async clearSearch(): Promise<void> {
    const searchInput = this.page.locator('input[placeholder*="Search"], input[type="search"]');
    await searchInput.clear();
    await this.page.keyboard.press('Enter');
    await this.helpers.waitForLoadingToComplete();
  }

  async searchProject(name: string): Promise<void> {
    await this.search(name);
  }

  async verifyProjectExists(name: string): Promise<boolean> {
    await this.searchProject(name);
    const count = await this.getTableRowCount();
    return count > 0;
  }

  async editProject(name: string): Promise<void> {
    await this.clickTableRow(name);
    await this.helpers.waitForModal();
  }

  async deleteProject(name: string): Promise<void> {
    const row = this.page.locator(`tr:has-text("${name}")`);
    const deleteButton = row.locator('button:has-text("Delete")');
    await deleteButton.click();
    
    // Confirm deletion
    await this.helpers.waitForModal();
    await this.page.click('[role="dialog"] button:has-text("Delete"), [role="dialog"] button:has-text("Confirm")');
    await this.helpers.waitForText('deleted');
  }

  async getProjectCount(): Promise<number> {
    return this.getTableRowCount();
  }

  async getProjectDetails(name: string): Promise<any> {
    const row = this.page.locator(`tr:has-text("${name}")`);
    const cells = await row.locator('td').all();
    
    return {
      name: await cells[0]?.textContent(),
      description: await cells[1]?.textContent(),
      priority: await cells[2]?.textContent(),
      status: await cells[3]?.textContent()
    };
  }

  async viewProjectDetails(name: string): Promise<void> {
    await this.clickTableRow(name);
    await this.helpers.waitForPageReady();
  }

  async getProjectTeamMembers(): Promise<string[]> {
    const memberElements = await this.page.locator('.team-member, [data-testid="team-member"]').all();
    const members = [];
    
    for (const element of memberElements) {
      const name = await element.textContent();
      if (name) members.push(name);
    }
    
    return members;
  }

  async updateProjectStatus(status: string): Promise<void> {
    await this.helpers.selectOption('select[name="status"]', status);
    await this.page.click('button:has-text("Update Status")');
    await this.helpers.waitForText('updated');
  }
}