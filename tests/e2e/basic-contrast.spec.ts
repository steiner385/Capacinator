import { test, expect } from '@playwright/test'
import { setupPageWithAuth } from './utils/improved-auth-helpers';;

test.describe('Basic Color Contrast', () => {
  test('check basic text contrast', async ({ page }) => {
    await setupPageWithAuth(page, '/');
    
    // Get computed styles of body and text
    const styles = await page.evaluate(() => {
      const body = document.body;
      const h1 = document.querySelector('h1');
      const bodyStyle = window.getComputedStyle(body);
      const h1Style = h1 ? window.getComputedStyle(h1) : null;
      
      return {
        bodyBg: bodyStyle.backgroundColor,
        bodyColor: bodyStyle.color,
        h1Color: h1Style?.color,
        colorScheme: bodyStyle.colorScheme,
        // Check CSS variables
        primaryColor: getComputedStyle(document.documentElement).getPropertyValue('--primary'),
        bgPrimary: getComputedStyle(document.documentElement).getPropertyValue('--bg-primary'),
        textPrimary: getComputedStyle(document.documentElement).getPropertyValue('--text-primary'),
      };
    });
    
    console.log('Styles:', styles);
    
    // Check if styles are loaded
    expect(styles.bodyBg).toBeTruthy();
    expect(styles.bodyColor).toBeTruthy();
  });
  
  test('check table contrast', async ({ page }) => {
    await setupPageWithAuth(page, '/projects');
    await page.waitForSelector('.table', { timeout: 30000 });
    
    const tableStyles = await page.evaluate(() => {
      const table = document.querySelector('.table');
      const th = document.querySelector('.table th');
      const td = document.querySelector('.table td');
      
      if (!table || !th || !td) return null;
      
      const tableStyle = window.getComputedStyle(table);
      const thStyle = window.getComputedStyle(th);
      const tdStyle = window.getComputedStyle(td);
      
      // Get parent backgrounds
      const getEffectiveBg = (elem: Element) => {
        let current = elem;
        while (current) {
          const bg = window.getComputedStyle(current).backgroundColor;
          if (bg && bg !== 'rgba(0, 0, 0, 0)') return bg;
          if (!current.parentElement) break;
          current = current.parentElement;
        }
        return window.getComputedStyle(document.body).backgroundColor;
      };
      
      return {
        table: {
          bg: tableStyle.backgroundColor,
          effectiveBg: getEffectiveBg(table)
        },
        th: {
          color: thStyle.color,
          bg: thStyle.backgroundColor,
          effectiveBg: getEffectiveBg(th)
        },
        td: {
          color: tdStyle.color,
          bg: tdStyle.backgroundColor,
          effectiveBg: getEffectiveBg(td)
        },
        tableHoverBg: getComputedStyle(document.documentElement).getPropertyValue('--table-hover-bg'),
      };
    });
    
    console.log('Table styles:', tableStyles);
    
    expect(tableStyles).toBeTruthy();
    expect(tableStyles?.th.color).toBeTruthy();
    expect(tableStyles?.td.color).toBeTruthy();
  });

  test('check hover states', async ({ page }) => {
    await setupPageWithAuth(page, '/projects');
    await page.waitForSelector('.table tbody tr', { timeout: 30000 });
    
    // Get normal state
    const normalState = await page.evaluate(() => {
      const row = document.querySelector('.table tbody tr');
      const td = row?.querySelector('td');
      if (!row || !td) return null;
      
      const rowStyle = window.getComputedStyle(row);
      const tdStyle = window.getComputedStyle(td);
      
      return {
        rowBg: rowStyle.backgroundColor,
        tdColor: tdStyle.color
      };
    });
    
    // Hover and get hover state
    await page.hover('.table tbody tr');
    await page.waitForTimeout(100); // Wait for transition
    
    const hoverState = await page.evaluate(() => {
      const row = document.querySelector('.table tbody tr');
      const td = row?.querySelector('td');
      if (!row || !td) return null;
      
      const rowStyle = window.getComputedStyle(row);
      const tdStyle = window.getComputedStyle(td);
      
      return {
        rowBg: rowStyle.backgroundColor,
        tdColor: tdStyle.color
      };
    });
    
    console.log('Normal state:', normalState);
    console.log('Hover state:', hoverState);
    
    // Backgrounds should be different
    expect(normalState?.rowBg).not.toBe(hoverState?.rowBg);
  });
});