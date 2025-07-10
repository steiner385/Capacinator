import { test, expect } from '@playwright/test';

test.describe('Server Health Check', () => {
  test('should reach the health endpoint', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status', 'ok');
  });

  test('should load the main page', async ({ page }) => {
    await page.goto('/');
    
    // Should not be a complete error page
    await expect(page).not.toHaveTitle(/404|Error/);
    
    // Page should load without throwing
    await page.waitForLoadState('networkidle');
  });
});