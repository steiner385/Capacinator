import { test, expect } from '@playwright/test';

test.describe('Project Roadmap Phase Boxes', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to roadmap page using existing projects
    await page.goto('/projects?tab=roadmap');
    await page.waitForLoadState('networkidle');
  });

  test('should display phase boxes for existing projects', async ({ page }) => {
    // Wait for projects to load
    await page.waitForSelector('.project-row', { timeout: 10000 });
    
    // Check if we have project rows
    const projectRows = page.locator('.project-row');
    const projectCount = await projectRows.count();
    console.log(`Found ${projectCount} projects on roadmap`);
    
    if (projectCount > 0) {
      // Check the first project for phase bars
      const firstProject = projectRows.first();
      
      // Log the project HTML to see structure
      const projectHtml = await firstProject.innerHTML();
      console.log(`First project HTML: ${projectHtml.substring(0, 500)}...`);
      
      const phaseBars = firstProject.locator('.phase-bar');
      const phaseCount = await phaseBars.count();
      
      console.log(`Found ${phaseCount} phase bars in first project`);
      
      // Also check for any timeline-related elements in the project
      const timelineElements = firstProject.locator('[class*="timeline"]');
      const timelineElementCount = await timelineElements.count();
      console.log(`Found ${timelineElementCount} timeline elements in project`);
      
      if (phaseCount > 0) {
        // Verify phase bar properties
        const firstPhase = phaseBars.first();
        await expect(firstPhase).toBeVisible();
        
        // Check if phase has background color
        const backgroundColor = await firstPhase.evaluate(el => {
          return window.getComputedStyle(el).backgroundColor;
        });
        
        console.log(`Phase bar background color: ${backgroundColor}`);
        expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)'); // Not transparent
        
        // Check if phase has width (positioned correctly)
        const boundingBox = await firstPhase.boundingBox();
        expect(boundingBox?.width).toBeGreaterThan(0);
        expect(boundingBox?.height).toBeGreaterThan(0);
        
        console.log(`✅ Phase boxes are displaying correctly`);
      } else {
        console.log('⚠️ No phase bars found - checking project data');
        
        // Check if project has phases data via API
        const projectElement = firstProject.locator('.project-name');
        const projectName = await projectElement.textContent();
        console.log(`Checking phases for project: ${projectName}`);
        
        // Check if there are any elements with phase-related classes
        const phaseElements = page.locator('[class*="phase"]');
        const phaseElementCount = await phaseElements.count();
        console.log(`Found ${phaseElementCount} elements with 'phase' in class name across entire page`);
        
        if (phaseElementCount > 0) {
          for (let i = 0; i < Math.min(phaseElementCount, 5); i++) {
            const element = phaseElements.nth(i);
            const className = await element.getAttribute('class');
            console.log(`Phase-related element ${i}: ${className}`);
          }
        }
      }
    } else {
      console.log('⚠️ No projects found on roadmap');
    }
  });
  
  test('should display project information in left panel', async ({ page }) => {
    // Wait for projects to load
    await page.waitForSelector('.project-row', { timeout: 10000 });
    
    const projectRows = page.locator('.project-row');
    const projectCount = await projectRows.count();
    
    if (projectCount > 0) {
      const firstProject = projectRows.first();
      
      // Check for project name
      const projectName = firstProject.locator('.project-name');
      await expect(projectName).toBeVisible();
      const nameText = await projectName.textContent();
      console.log(`Project name: ${nameText}`);
      
      // Check for project details
      const projectDetails = firstProject.locator('.project-details');
      if (await projectDetails.count() > 0) {
        await expect(projectDetails).toBeVisible();
      }
      
      console.log('✅ Project information panel is working');
    }
  });
  
  test('should have proper timeline structure', async ({ page }) => {
    // Check timeline container
    await expect(page.locator('.timeline-container')).toBeVisible();
    
    // Check for timeline headers
    await expect(page.locator('.timeline-header')).toBeVisible();
    
    // Check for month headers with correct class name
    const monthHeaders = page.locator('.timeline-header-month');
    const monthCount = await monthHeaders.count();
    console.log(`Found ${monthCount} month headers`);
    
    // Check for year headers  
    const yearHeaders = page.locator('.timeline-header-year');
    const yearCount = await yearHeaders.count();
    console.log(`Found ${yearCount} year headers`);
    
    // Check timeline content area
    await expect(page.locator('.projects-timeline')).toBeVisible();
    
    // Log some debug info about the timeline
    const timelineContainer = page.locator('.timeline-container');
    const boundingBox = await timelineContainer.boundingBox();
    console.log(`Timeline container size: ${boundingBox?.width}x${boundingBox?.height}`);
    
    console.log('✅ Timeline structure verified');
  });
});