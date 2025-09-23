import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class PeoplePage extends BasePage {
  private readonly path = '/people';

  // Page-specific selectors
  private pageSelectors = {
    addPersonButton: 'button:has-text("Add Person"), button:has-text("New Person")',
    personModal: '[data-testid="person-modal"], [role="dialog"]:has(h2:has-text("Person"))',
    nameInput: 'input[name="name"], #name',
    emailInput: 'input[name="email"], #email',
    roleSelect: 'select[name="primary_person_role_id"], #primary_person_role_id',
    locationSelect: 'select[name="location_id"], #location_id',
    workerTypeSelect: 'select[name="worker_type"], #worker_type',
    availabilityInput: 'input[name="default_availability_percentage"]',
    hoursPerDayInput: 'input[name="default_hours_per_day"]',
    filterButton: 'button:has-text("Filter"), button:has-text("Filters")',
    exportButton: 'button:has-text("Export")',
    utilizationBadge: '.utilization-badge, [data-testid="utilization-badge"]'
  };

  async navigate(): Promise<void> {
    await this.page.goto(this.path);
    await this.waitForPageLoad();
  }

  async clickAddPerson(): Promise<void> {
    await this.helpers.clickAndWait(this.pageSelectors.addPersonButton, {
      waitForSelector: this.pageSelectors.personModal
    });
  }

  async fillPersonForm(data: {
    name: string;
    email: string;
    role?: string;
    location?: string;
    workerType?: 'FTE' | 'Contractor';
    availability?: number;
    hoursPerDay?: number;
  }): Promise<void> {
    await this.helpers.fillForm({
      [this.pageSelectors.nameInput]: data.name,
      [this.pageSelectors.emailInput]: data.email
    });

    if (data.role) {
      await this.helpers.selectOption(this.pageSelectors.roleSelect, data.role);
    }

    if (data.location) {
      await this.helpers.selectOption(this.pageSelectors.locationSelect, data.location);
    }

    if (data.workerType) {
      await this.helpers.selectOption(this.pageSelectors.workerTypeSelect, data.workerType);
    }

    if (data.availability !== undefined) {
      await this.helpers.fillForm({
        [this.pageSelectors.availabilityInput]: data.availability
      });
    }

    if (data.hoursPerDay !== undefined) {
      await this.helpers.fillForm({
        [this.pageSelectors.hoursPerDayInput]: data.hoursPerDay
      });
    }
  }

  async savePerson(): Promise<void> {
    await this.submitForm();
    await this.helpers.waitForText('successfully', { timeout: 5000 });
  }

  async searchPerson(name: string): Promise<void> {
    await this.search(name);
  }

  async clickPerson(name: string): Promise<void> {
    await this.clickTableRow(name);
    await this.helpers.waitForModal();
  }

  async editPerson(name: string): Promise<void> {
    await this.clickPerson(name);
  }

  async deletePerson(): Promise<void> {
    const deleteButton = this.page.locator('button:has-text("Delete")');
    await deleteButton.click();
    
    // Confirm deletion
    const confirmButton = this.page.locator('[role="dialog"] button:has-text("Delete"), [role="dialog"] button:has-text("Confirm")');
    await confirmButton.click();
    
    await this.helpers.waitForText('deleted', { timeout: 5000 });
  }

  async getPersonCount(): Promise<number> {
    return this.getTableRowCount();
  }

  async getPersonUtilization(name: string): Promise<string | null> {
    const row = this.page.locator(`tr:has-text("${name}")`);
    const utilizationCell = row.locator(this.pageSelectors.utilizationBadge);
    
    if (await utilizationCell.count() > 0) {
      return utilizationCell.textContent();
    }
    
    return null;
  }

  async filterByLocation(location: string): Promise<void> {
    await this.helpers.clickAndWait(this.pageSelectors.filterButton);
    const locationFilter = this.page.locator('select[name="location"], [data-testid="location-filter"]');
    await this.helpers.selectOption(locationFilter, location);
    await this.helpers.waitForLoadingToComplete();
  }

  async filterByRole(role: string): Promise<void> {
    await this.helpers.clickAndWait(this.pageSelectors.filterButton);
    const roleFilter = this.page.locator('select[name="role"], [data-testid="role-filter"]');
    await this.helpers.selectOption(roleFilter, role);
    await this.helpers.waitForLoadingToComplete();
  }

  async exportData(format: 'csv' | 'excel' = 'csv'): Promise<void> {
    await this.helpers.clickAndWait(this.pageSelectors.exportButton);
    const formatButton = this.page.locator(`button:has-text("${format.toUpperCase()}")`);
    await formatButton.click();
  }

  async getPeopleNames(): Promise<string[]> {
    const tableData = await this.getTableData();
    return tableData.map(row => row[0]); // Assuming name is in first column
  }

  async verifyPersonExists(name: string): Promise<boolean> {
    await this.searchPerson(name);
    const count = await this.getPersonCount();
    return count > 0;
  }

  async bulkSelectPeople(names: string[]): Promise<void> {
    for (const name of names) {
      const row = this.page.locator(`tr:has-text("${name}")`);
      const checkbox = row.locator('input[type="checkbox"]');
      await checkbox.check();
    }
  }

  async bulkDelete(): Promise<void> {
    const bulkActionButton = this.page.locator('button:has-text("Bulk Actions")');
    await bulkActionButton.click();
    
    const deleteOption = this.page.locator('button:has-text("Delete Selected")');
    await deleteOption.click();
    
    // Confirm bulk deletion
    const confirmButton = this.page.locator('[role="dialog"] button:has-text("Delete"), [role="dialog"] button:has-text("Confirm")');
    await confirmButton.click();
    
    await this.helpers.waitForText('deleted', { timeout: 5000 });
  }
}