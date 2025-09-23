import { Page } from '@playwright/test';
import { StandardTestHelpers } from './standard-test-helpers';

/**
 * Domain-specific helpers for assignment-related operations
 */
export class AssignmentHelpers {
  private helpers: StandardTestHelpers;

  constructor(private page: Page) {
    this.helpers = new StandardTestHelpers(page);
  }

  /**
   * Navigate to assignments page
   */
  async navigateToAssignments(): Promise<void> {
    await this.page.goto('/assignments');
    await this.helpers.waitForPageReady();
  }

  /**
   * Create a new assignment via UI
   */
  async createAssignment(data: {
    personName: string;
    projectName: string;
    role?: string;
    startDate?: string;
    endDate?: string;
    allocation?: number;
  }): Promise<void> {
    // Click add assignment button
    await this.helpers.clickAndWait('button:has-text("Add Assignment"), button:has-text("New Assignment")', {
      waitForSelector: '[role="dialog"]'
    });

    // Fill form
    await this.helpers.selectPersonByName(data.personName);
    await this.helpers.selectProjectByName(data.projectName);

    if (data.role) {
      await this.helpers.selectOption('select[name="role_id"]', data.role);
    }

    if (data.startDate) {
      await this.helpers.fillForm({ 'input[name="start_date"]': data.startDate });
    }

    if (data.endDate) {
      await this.helpers.fillForm({ 'input[name="end_date"]': data.endDate });
    }

    if (data.allocation !== undefined) {
      await this.helpers.fillForm({ 'input[name="allocation_percentage"]': data.allocation });
    }

    // Submit
    await this.page.click('button[type="submit"]');
    await this.helpers.waitForText('successfully');
  }

  /**
   * Select person in assignment form
   */
  private async selectPersonByName(name: string): Promise<void> {
    const personSelect = this.page.locator('select[name="person_id"], [data-testid="person-select"]');
    const personOption = personSelect.locator(`option:has-text("${name}")`);
    
    if (await personOption.count() > 0) {
      const value = await personOption.getAttribute('value');
      if (value) await personSelect.selectOption(value);
    } else {
      // Try autocomplete/search approach
      const personInput = this.page.locator('input[placeholder*="person"], [data-testid="person-search"]');
      await personInput.fill(name);
      await this.helpers.waitForElement(`[role="option"]:has-text("${name}")`);
      await this.page.click(`[role="option"]:has-text("${name}")`);
    }
  }

  /**
   * Select project in assignment form
   */
  private async selectProjectByName(name: string): Promise<void> {
    const projectSelect = this.page.locator('select[name="project_id"], [data-testid="project-select"]');
    const projectOption = projectSelect.locator(`option:has-text("${name}")`);
    
    if (await projectOption.count() > 0) {
      const value = await projectOption.getAttribute('value');
      if (value) await projectSelect.selectOption(value);
    } else {
      // Try autocomplete/search approach
      const projectInput = this.page.locator('input[placeholder*="project"], [data-testid="project-search"]');
      await projectInput.fill(name);
      await this.helpers.waitForElement(`[role="option"]:has-text("${name}")`);
      await this.page.click(`[role="option"]:has-text("${name}")`);
    }
  }

  /**
   * Edit an existing assignment
   */
  async editAssignment(identifier: string, updates: Partial<{
    allocation: number;
    startDate: string;
    endDate: string;
    role: string;
  }>): Promise<void> {
    // Find and click the assignment
    await this.helpers.clickTableRow(identifier);
    await this.helpers.waitForModal();

    // Update fields
    if (updates.allocation !== undefined) {
      const allocationInput = this.page.locator('input[name="allocation_percentage"]');
      await allocationInput.clear();
      await allocationInput.fill(updates.allocation.toString());
    }

    if (updates.startDate) {
      await this.helpers.fillForm({ 'input[name="start_date"]': updates.startDate });
    }

    if (updates.endDate) {
      await this.helpers.fillForm({ 'input[name="end_date"]': updates.endDate });
    }

    if (updates.role) {
      await this.helpers.selectOption('select[name="role_id"]', updates.role);
    }

    // Save changes
    await this.page.click('button:has-text("Save"), button[type="submit"]');
    await this.helpers.waitForText('successfully');
  }

  /**
   * Delete an assignment
   */
  async deleteAssignment(identifier: string): Promise<void> {
    // Find and click the assignment
    await this.helpers.clickTableRow(identifier);
    await this.helpers.waitForModal();

    // Click delete button
    await this.page.click('button:has-text("Delete")');
    
    // Confirm deletion
    await this.helpers.waitForModal();
    await this.page.click('[role="dialog"] button:has-text("Delete"), [role="dialog"] button:has-text("Confirm")');
    
    await this.helpers.waitForText('deleted');
  }

  /**
   * Bulk edit assignments
   */
  async bulkEditAssignments(identifiers: string[], action: 'delete' | 'extend' | 'reduce'): Promise<void> {
    // Select multiple assignments
    for (const identifier of identifiers) {
      const row = this.page.locator(`tr:has-text("${identifier}")`);
      const checkbox = row.locator('input[type="checkbox"]');
      await checkbox.check();
    }

    // Open bulk actions menu
    await this.page.click('button:has-text("Bulk Actions")');

    // Select action
    switch (action) {
      case 'delete':
        await this.page.click('button:has-text("Delete Selected")');
        await this.helpers.waitForModal();
        await this.page.click('[role="dialog"] button:has-text("Delete"), [role="dialog"] button:has-text("Confirm")');
        break;
        
      case 'extend':
        await this.page.click('button:has-text("Extend Selected")');
        await this.helpers.waitForModal();
        // Fill in extension details
        await this.helpers.fillForm({ 'input[name="extend_by_days"]': '30' });
        await this.page.click('[role="dialog"] button:has-text("Extend")');
        break;
        
      case 'reduce':
        await this.page.click('button:has-text("Reduce Allocation")');
        await this.helpers.waitForModal();
        // Fill in reduction percentage
        await this.helpers.fillForm({ 'input[name="reduce_by_percentage"]': '20' });
        await this.page.click('[role="dialog"] button:has-text("Reduce")');
        break;
    }

    await this.helpers.waitForText('successfully');
  }

  /**
   * Get assignment details from row
   */
  async getAssignmentDetails(identifier: string): Promise<{
    person: string;
    project: string;
    role: string;
    allocation: string;
    period: string;
    status: string;
  } | null> {
    const row = this.page.locator(`tr:has-text("${identifier}")`);
    
    if (await row.count() === 0) {
      return null;
    }

    const cells = await row.locator('td').all();
    
    return {
      person: await cells[0]?.textContent() || '',
      project: await cells[1]?.textContent() || '',
      role: await cells[2]?.textContent() || '',
      allocation: await cells[3]?.textContent() || '',
      period: await cells[4]?.textContent() || '',
      status: await cells[5]?.textContent() || ''
    };
  }

  /**
   * Filter assignments
   */
  async filterAssignments(filters: {
    person?: string;
    project?: string;
    status?: 'active' | 'upcoming' | 'completed';
    dateRange?: { start: string; end: string };
  }): Promise<void> {
    // Open filter panel
    await this.page.click('button:has-text("Filter"), button:has-text("Filters")');
    await this.helpers.waitForElement('[data-testid="filter-panel"], .filter-panel');

    // Apply filters
    if (filters.person) {
      await this.helpers.selectOption('select[name="person_filter"]', filters.person);
    }

    if (filters.project) {
      await this.helpers.selectOption('select[name="project_filter"]', filters.project);
    }

    if (filters.status) {
      await this.helpers.selectOption('select[name="status_filter"]', filters.status);
    }

    if (filters.dateRange) {
      await this.helpers.fillForm({
        'input[name="filter_start_date"]': filters.dateRange.start,
        'input[name="filter_end_date"]': filters.dateRange.end
      });
    }

    // Apply filters
    await this.page.click('button:has-text("Apply Filters")');
    await this.helpers.waitForLoadingToComplete();
  }

  /**
   * Check for assignment conflicts
   */
  async checkForConflicts(personName: string): Promise<string[]> {
    const conflicts: string[] = [];
    
    // Look for conflict indicators
    const conflictBadges = await this.page.locator(`tr:has-text("${personName}") .conflict-badge, tr:has-text("${personName}") [data-testid="conflict"]`).all();
    
    for (const badge of conflictBadges) {
      const text = await badge.textContent();
      if (text) conflicts.push(text);
    }
    
    return conflicts;
  }

  /**
   * Resolve assignment conflict
   */
  async resolveConflict(assignmentIdentifier: string, resolution: 'reduce' | 'reschedule' | 'reassign'): Promise<void> {
    // Click on conflicted assignment
    await this.helpers.clickTableRow(assignmentIdentifier);
    
    // Wait for conflict resolution modal
    await this.helpers.waitForText('conflict', { matchCase: false });
    
    // Choose resolution
    switch (resolution) {
      case 'reduce':
        await this.page.click('button:has-text("Reduce Allocation")');
        await this.helpers.fillForm({ 'input[name="new_allocation"]': '50' });
        break;
        
      case 'reschedule':
        await this.page.click('button:has-text("Reschedule")');
        // Fill new dates
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        await this.helpers.fillForm({
          'input[name="new_start_date"]': nextMonth.toISOString().split('T')[0]
        });
        break;
        
      case 'reassign':
        await this.page.click('button:has-text("Reassign")');
        // Select new person
        await this.selectPersonByName('Alternative Person');
        break;
    }
    
    // Confirm resolution
    await this.page.click('button:has-text("Resolve Conflict")');
    await this.helpers.waitForText('resolved');
  }

  /**
   * Get assignment timeline view
   */
  async switchToTimelineView(): Promise<void> {
    await this.page.click('button:has-text("Timeline View"), [data-testid="timeline-view-toggle"]');
    await this.helpers.waitForElement('.timeline-container, [data-testid="assignment-timeline"]');
  }

  /**
   * Drag assignment in timeline
   */
  async dragAssignmentInTimeline(assignmentId: string, daysToMove: number): Promise<void> {
    const assignment = this.page.locator(`[data-assignment-id="${assignmentId}"]`);
    const box = await assignment.boundingBox();
    
    if (box) {
      const pixelsPerDay = 50; // Adjust based on your timeline scale
      await assignment.dragTo(assignment, {
        sourcePosition: { x: box.width / 2, y: box.height / 2 },
        targetPosition: { x: box.width / 2 + (daysToMove * pixelsPerDay), y: box.height / 2 }
      });
      
      await this.helpers.waitForText('updated');
    }
  }

  /**
   * Export assignments
   */
  async exportAssignments(format: 'csv' | 'excel' | 'pdf' = 'csv'): Promise<void> {
    await this.page.click('button:has-text("Export")');
    await this.page.click(`button:has-text("${format.toUpperCase()}")`);
    
    // Wait for download
    const downloadPromise = this.page.waitForEvent('download');
    await downloadPromise;
  }

  /**
   * Get utilization summary for assignments view
   */
  async getUtilizationSummary(): Promise<{
    totalAssignments: number;
    activeAssignments: number;
    overallocated: number;
    underallocated: number;
  }> {
    const summary = {
      totalAssignments: 0,
      activeAssignments: 0,
      overallocated: 0,
      underallocated: 0
    };

    // Get summary cards
    const totalCard = this.page.locator('.summary-card:has-text("Total Assignments")');
    summary.totalAssignments = parseInt(await totalCard.locator('.value').textContent() || '0');

    const activeCard = this.page.locator('.summary-card:has-text("Active")');
    summary.activeAssignments = parseInt(await activeCard.locator('.value').textContent() || '0');

    const overCard = this.page.locator('.summary-card:has-text("Overallocated")');
    summary.overallocated = parseInt(await overCard.locator('.value').textContent() || '0');

    const underCard = this.page.locator('.summary-card:has-text("Underallocated")');
    summary.underallocated = parseInt(await underCard.locator('.value').textContent() || '0');

    return summary;
  }
}