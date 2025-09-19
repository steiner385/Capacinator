import { test, expect } from '@playwright/test';
import { TestHelpers , setupPageWithAuth} from './utils/test-helpers';

test.describe('Server Health Check', () => {
  test('should reach the health endpoint', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status', 'ok');
  });

  test('should load the main page', async ({ page }) => {
    const helpers = new TestHelpers(page);
    await setupPageWithAuth(page, '/');
    await helpers.setupPage();
    
    // Should not be a complete error page
    await expect(page).not.toHaveTitle(/404|Error/);
    
    // Page should load without throwing
    await page.waitForLoadState('networkidle', { timeout: 30000 });
  });
});