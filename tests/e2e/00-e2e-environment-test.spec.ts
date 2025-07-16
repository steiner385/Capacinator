import { test, expect } from '@playwright/test';

test.describe('E2E Environment Verification', () => {
  test('should have isolated e2e environment running', async ({ page }) => {
    // Navigate to the E2E application
    await page.goto('/');
    
    // Check that we're on the right port and environment
    expect(page.url()).toContain('localhost:3121');
    
    // Verify the application loads
    await expect(page.locator('h1')).toBeVisible();
    
    // Check that the API is accessible on the correct port
    const response = await page.request.get('http://localhost:3111/api/health');
    expect(response.ok()).toBeTruthy();
    
    // Verify E2E test data is available
    const rolesResponse = await page.request.get('http://localhost:3111/api/roles');
    expect(rolesResponse.ok()).toBeTruthy();
    
    const roles = await rolesResponse.json();
    expect(roles).toBeInstanceOf(Array);
    expect(roles.length).toBeGreaterThan(0);
    
    // Verify E2E test roles are present
    const e2eRoles = roles.filter((role: any) => role.name.includes('E2E'));
    expect(e2eRoles.length).toBeGreaterThan(0);
    
    console.log(`✅ E2E environment verified with ${roles.length} roles, ${e2eRoles.length} E2E-specific roles`);
  });

  test('should have e2e database isolation', async ({ page }) => {
    // Test that we're using the E2E database
    const peopleResponse = await page.request.get('http://localhost:3111/api/people');
    expect(peopleResponse.ok()).toBeTruthy();
    
    const people = await peopleResponse.json();
    expect(people).toBeInstanceOf(Array);
    
    // Check for E2E-specific test data
    const e2ePeople = people.filter((person: any) => person.name.includes('E2E'));
    expect(e2ePeople.length).toBeGreaterThan(0);
    
    console.log(`✅ E2E database isolation verified with ${people.length} people, ${e2ePeople.length} E2E-specific people`);
  });

  test('should have e2e scenarios available', async ({ page }) => {
    // Navigate to scenarios page
    await page.goto('/scenarios');
    
    // Wait for scenarios to load
    await page.waitForSelector('[data-testid="scenario-card"], .scenario-card, .commit-row', { timeout: 10000 });
    
    // Check that scenarios are visible
    const scenarioElements = await page.locator('[data-testid="scenario-card"], .scenario-card, .commit-row').count();
    expect(scenarioElements).toBeGreaterThan(0);
    
    // Test API directly
    const scenariosResponse = await page.request.get('http://localhost:3111/api/scenarios');
    expect(scenariosResponse.ok()).toBeTruthy();
    
    const scenarios = await scenariosResponse.json();
    expect(scenarios).toBeInstanceOf(Array);
    expect(scenarios.length).toBeGreaterThan(0);
    
    // Check for E2E-specific scenarios
    const e2eScenarios = scenarios.filter((scenario: any) => scenario.name.includes('E2E'));
    expect(e2eScenarios.length).toBeGreaterThan(0);
    
    console.log(`✅ E2E scenarios verified with ${scenarios.length} scenarios, ${e2eScenarios.length} E2E-specific scenarios`);
  });

  test('should not interfere with dev environment', async ({ page }) => {
    // This test ensures that the E2E environment is truly isolated
    
    // Check that we're definitely on E2E ports
    await page.goto('/');
    expect(page.url()).toContain('localhost:3121');
    
    // Verify API is on E2E port
    const response = await page.request.get('http://localhost:3111/api/health');
    expect(response.ok()).toBeTruthy();
    
    // Verify dev ports are not being used
    try {
      await page.request.get('http://localhost:3110/api/health', { timeout: 5000 });
      throw new Error('Dev server should not be accessible from E2E tests');
    } catch (error) {
      // This is expected - dev server should not be accessible
      expect(error.message).toContain('fetch failed');
    }
    
    console.log('✅ E2E environment isolation verified - no interference with dev environment');
  });
});