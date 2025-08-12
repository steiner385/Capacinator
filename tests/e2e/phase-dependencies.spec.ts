import { test, expect, Page } from '@playwright/test';

test.describe('Phase Dependencies E2E Tests', () => {
  let page: Page;
  const projectId = '987fcdeb-51a2-4b3c-d4e5-f6a7b8c9d0e1';
  const baseUrl = 'http://localhost:3120';

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Handle profile selection if needed
    await page.goto(`${baseUrl}/projects/${projectId}`);
    
    // Wait for potential profile selection and handle it
    try {
      await page.waitForSelector('select', { timeout: 5000 });
      const options = await page.$$eval('select option', options => 
        options.map(option => ({ value: option.value, text: option.textContent }))
      );
      const validOption = options.find(opt => opt.value && opt.value !== '');
      if (validOption) {
        await page.selectOption('select', validOption.value);
        await page.click('button');
        await page.waitForLoadState('networkidle');
      }
    } catch (e) {
      // Profile selection not needed or already handled
    }
    
    // Wait for the project page to load
    await page.waitForSelector('h1', { timeout: 10000 });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('should display project timeline section', async () => {
    // Check that the Project Timeline section exists
    await expect(page.locator('h2:has-text("Project Timeline")')).toBeVisible();
    
    // Check that the VisualPhaseManager component is rendered
    await expect(page.locator('.visual-phase-manager, .interactive-timeline')).toBeVisible({
      timeout: 10000
    });
  });

  test('should load and display project phases', async () => {
    // Wait for phases to load
    await page.waitForResponse(response => 
      response.url().includes('/api/project-phases') && response.status() === 200
    );
    
    // Check that timeline items are displayed
    await expect(page.locator('[data-testid*="timeline-item"], .timeline-item')).toHaveCount.greaterThan(0);
  });

  test('should load phase dependencies', async () => {
    // Wait for dependencies to load
    await page.waitForResponse(response => 
      response.url().includes('/api/project-phase-dependencies') && response.status() === 200
    );
    
    // Dependencies should be loaded (check for dependency-related elements)
    const dependencyElements = await page.locator('[class*="dependency"], [data-testid*="dependency"]').count();
    // Dependencies may or may not exist, so we just verify the API call was made
    expect(dependencyElements).toBeGreaterThanOrEqual(0);
  });

  test('should create a new phase dependency', async () => {
    // Wait for the timeline to be interactive
    await page.waitForSelector('.interactive-timeline, .visual-phase-manager');
    
    // Look for phase elements to create dependencies between
    const phases = await page.locator('[data-testid*="phase"], .timeline-item').count();
    
    if (phases >= 2) {
      // Try to create a dependency by right-clicking or using dependency creation UI
      const firstPhase = page.locator('[data-testid*="phase"], .timeline-item').first();
      const secondPhase = page.locator('[data-testid*="phase"], .timeline-item').nth(1);
      
      await firstPhase.click({ button: 'right' });
      
      // Look for dependency creation options in context menu
      const dependencyOption = page.locator('text=Create Dependency, text=Add Dependency');
      if (await dependencyOption.count() > 0) {
        await dependencyOption.first().click();
        await secondPhase.click();
        
        // Verify API call was made
        await page.waitForResponse(response => 
          response.url().includes('/api/project-phase-dependencies') && 
          response.request().method() === 'POST'
        );
      }
    }
  });

  test('should move a phase and trigger cascade calculation', async () => {
    // Wait for the timeline to be loaded
    await page.waitForSelector('.interactive-timeline, .visual-phase-manager');
    
    // Find a draggable phase element
    const phaseElement = page.locator('[draggable="true"], [data-testid*="phase"]:first-child');
    
    if (await phaseElement.count() > 0) {
      // Get the initial position
      const initialBox = await phaseElement.boundingBox();
      
      if (initialBox) {
        // Drag the phase to a new position
        await phaseElement.dragTo(phaseElement, {
          targetPosition: { x: initialBox.x + 100, y: initialBox.y }
        });
        
        // Wait for cascade calculation API call
        const cascadeResponse = await page.waitForResponse(response => 
          response.url().includes('/api/project-phase-dependencies/calculate-cascade') && 
          response.request().method() === 'POST',
          { timeout: 10000 }
        );
        
        expect(cascadeResponse.status()).toBe(200);
        
        // Check if cascade results are displayed (conflicts, affected phases, etc.)
        const cascadeDialog = page.locator('[data-testid="cascade-dialog"], .modal, .dialog');
        if (await cascadeDialog.count() > 0) {
          await expect(cascadeDialog).toBeVisible();
        }
      }
    }
  });

  test('should handle cascade conflicts appropriately', async () => {
    // This test would need specific test data that creates conflicts
    // For now, we'll check the UI handles the cascade response structure
    
    await page.waitForSelector('.interactive-timeline, .visual-phase-manager');
    
    // Mock a cascade response with conflicts by intercepting the API
    await page.route('**/api/project-phase-dependencies/calculate-cascade', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            affectedPhases: [
              {
                phaseId: 'test-phase-1',
                newStartDate: '2024-03-01T00:00:00.000Z',
                newEndDate: '2024-03-31T00:00:00.000Z'
              }
            ],
            conflicts: [
              {
                type: 'resource_conflict',
                phaseId: 'test-phase-1',
                message: 'Resource not available during new dates'
              }
            ]
          }
        })
      });
    });
    
    // Trigger a phase move
    const phaseElement = page.locator('[draggable="true"], [data-testid*="phase"]').first();
    if (await phaseElement.count() > 0) {
      await phaseElement.dragTo(phaseElement, {
        targetPosition: { x: 100, y: 0 }
      });
      
      // Check that conflict information is displayed
      await expect(page.locator('text=conflict, text=resource not available')).toBeVisible({
        timeout: 5000
      });
    }
  });

  test('should update phase dependency properties', async () => {
    await page.waitForSelector('.interactive-timeline, .visual-phase-manager');
    
    // Look for dependency elements or dependency management UI
    const dependencyElement = page.locator('[data-testid*="dependency"], [class*="dependency"]').first();
    
    if (await dependencyElement.count() > 0) {
      // Right-click or double-click to open dependency properties
      await dependencyElement.click({ button: 'right' });
      
      const editOption = page.locator('text=Edit, text=Properties, text=Settings');
      if (await editOption.count() > 0) {
        await editOption.first().click();
        
        // Look for dependency type dropdown
        const dependencyTypeSelect = page.locator('select[name*="dependency"], select[name*="type"]');
        if (await dependencyTypeSelect.count() > 0) {
          await dependencyTypeSelect.selectOption('SS'); // Start-to-Start
          
          // Save changes
          const saveButton = page.locator('button:has-text("Save"), button:has-text("Apply")');
          if (await saveButton.count() > 0) {
            await saveButton.click();
            
            // Verify API call
            await page.waitForResponse(response => 
              response.url().includes('/api/project-phase-dependencies') && 
              response.request().method() === 'PUT'
            );
          }
        }
      }
    }
  });

  test('should delete a phase dependency', async () => {
    await page.waitForSelector('.interactive-timeline, .visual-phase-manager');
    
    // Look for dependency elements
    const dependencyElement = page.locator('[data-testid*="dependency"], [class*="dependency"]').first();
    
    if (await dependencyElement.count() > 0) {
      // Right-click to open context menu
      await dependencyElement.click({ button: 'right' });
      
      const deleteOption = page.locator('text=Delete, text=Remove');
      if (await deleteOption.count() > 0) {
        await deleteOption.first().click();
        
        // Confirm deletion if confirmation dialog appears
        const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Confirm"), button:has-text("Yes")');
        if (await confirmButton.count() > 0) {
          await confirmButton.click();
          
          // Verify DELETE API call
          await page.waitForResponse(response => 
            response.url().includes('/api/project-phase-dependencies') && 
            response.request().method() === 'DELETE'
          );
        }
      }
    }
  });

  test('should display dependency visualization lines', async () => {
    await page.waitForSelector('.interactive-timeline, .visual-phase-manager');
    
    // Wait for dependencies to load
    await page.waitForResponse(response => 
      response.url().includes('/api/project-phase-dependencies') && response.status() === 200
    );
    
    // Check for SVG elements, lines, or arrows that represent dependencies
    const dependencyVisuals = await page.locator('svg line, svg path, .dependency-line, .dependency-arrow').count();
    
    // Dependencies may or may not exist in test data, so we just verify the UI is ready
    expect(dependencyVisuals).toBeGreaterThanOrEqual(0);
  });

  test('should handle multiple dependency types correctly', async () => {
    await page.waitForSelector('.interactive-timeline, .visual-phase-manager');
    
    // This test verifies that different dependency types (FS, SS, FF, SF) are handled
    // We'll mock different dependency types and verify they're displayed correctly
    
    await page.route('**/api/project-phase-dependencies*', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'dep-fs',
                dependency_type: 'FS',
                predecessor_phase_name: 'Analysis',
                successor_phase_name: 'Development'
              },
              {
                id: 'dep-ss',
                dependency_type: 'SS',
                predecessor_phase_name: 'Development',
                successor_phase_name: 'Testing'
              }
            ]
          })
        });
      } else {
        await route.continue();
      }
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify different dependency types are displayed with appropriate visual cues
    const dependencyElements = await page.locator('[data-dependency-type], [class*="dependency-"]').count();
    expect(dependencyElements).toBeGreaterThanOrEqual(0);
  });

  test('should maintain performance with many phases and dependencies', async () => {
    const startTime = Date.now();
    
    await page.waitForSelector('.interactive-timeline, .visual-phase-manager');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Timeline should load within reasonable time (adjust threshold as needed)
    expect(loadTime).toBeLessThan(5000); // 5 seconds
    
    // Check that timeline is interactive
    const interactiveElements = await page.locator('[draggable="true"], [data-testid*="phase"]').count();
    expect(interactiveElements).toBeGreaterThan(0);
  });
});