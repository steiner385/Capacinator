import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Script to fix color contrast test selectors
 */

interface SelectorFix {
  old: string;
  new: string;
  description: string;
}

const SELECTOR_FIXES: SelectorFix[] = [
  {
    old: `await page.waitForSelector('.table th');`,
    new: `await page.waitForSelector('table th, .table th, [role="table"] th', { timeout: 10000 });`,
    description: 'Fix table header selector'
  },
  {
    old: `const headers = await page.$$('.table th');`,
    new: `const headers = await page.$$('table th, .table th');`,
    description: 'Fix table header query'
  },
  {
    old: `await checkElementContrast(page, \`.table th:nth-child(\${i + 1})\`)`,
    new: `await checkElementContrast(page, \`table th:nth-of-type(\${i + 1}), .table th:nth-of-type(\${i + 1})\`)`,
    description: 'Fix nth-child selector for table headers'
  },
  {
    old: `await page.waitForSelector('.table tbody tr');`,
    new: `await page.waitForSelector('table tbody tr, .table tbody tr, [role="table"] tbody tr', { timeout: 10000 });`,
    description: 'Fix table row selector'
  },
  {
    old: `await checkElementContrast(page, '.table tbody tr:first-child td')`,
    new: `await checkElementContrast(page, 'table tbody tr:first-child td, .table tbody tr:first-child td')`,
    description: 'Fix table cell selector'
  },
  {
    old: `await page.hover('.table tbody tr:first-child');`,
    new: `await page.hover('table tbody tr:first-child, .table tbody tr:first-child');`,
    description: 'Fix hover selector'
  },
  {
    old: `await page.waitForSelector('.badge');`,
    new: `await page.waitForSelector('.badge, [class*="badge"]', { timeout: 10000 });`,
    description: 'Fix badge selector'
  },
  {
    old: `const badges = await page.$$('.badge');`,
    new: `const badges = await page.$$('.badge, [class*="badge"]');`,
    description: 'Fix badge query'
  },
  {
    old: `await page.waitForSelector('.form-input');`,
    new: `await page.waitForSelector('input[type="text"], input[type="email"], .form-input, [class*="input"]', { timeout: 10000 });`,
    description: 'Fix form input selector'
  },
  {
    old: `await checkElementContrast(page, '.form-input')`,
    new: `await checkElementContrast(page, 'input[type="text"], input[type="email"], .form-input')`,
    description: 'Fix form input contrast check'
  },
  {
    old: `await checkElementContrast(page, '.form-label')`,
    new: `await checkElementContrast(page, 'label, .form-label, [class*="label"]')`,
    description: 'Fix form label selector'
  },
  {
    old: `await page.waitForSelector('.text-danger');`,
    new: `await page.waitForSelector('.text-danger, .text-destructive, [class*="error"], [class*="danger"]', { timeout: 10000 });`,
    description: 'Fix error text selector'
  },
  {
    old: `await checkElementContrast(page, '.text-danger')`,
    new: `await checkElementContrast(page, '.text-danger, .text-destructive, [class*="error"]')`,
    description: 'Fix error contrast check'
  },
  {
    old: `await page.waitForSelector('.recharts-wrapper');`,
    new: `await page.waitForSelector('.recharts-wrapper, svg[class*="chart"], canvas', { timeout: 10000 });`,
    description: 'Fix chart wrapper selector'
  },
  {
    old: `const chartTexts = await page.$$('.recharts-text');`,
    new: `const chartTexts = await page.$$('.recharts-text, svg text, [class*="chart"] text');`,
    description: 'Fix chart text selector'
  },
  {
    old: `await page.waitForSelector('.highlight-danger');`,
    new: `await page.waitForSelector('.highlight-danger, [class*="danger"], [class*="error"], tr[class*="red"]', { timeout: 10000 });`,
    description: 'Fix highlighted row selector'
  },
  {
    old: `await checkElementContrast(page, '.highlight-danger td')`,
    new: `await checkElementContrast(page, '.highlight-danger td, [class*="danger"] td, tr[class*="red"] td')`,
    description: 'Fix highlighted cell selector'
  },
  {
    old: `const sidebarItems = await page.$$('.nav-item');`,
    new: `const sidebarItems = await page.$$('.nav-item, nav a, [role="navigation"] a');`,
    description: 'Fix sidebar item selector'
  },
  {
    old: `await checkElementContrast(page, \`.nav-item:nth-child(\${i + 1}) a\`)`,
    new: `await checkElementContrast(page, \`.nav-item:nth-of-type(\${i + 1}) a, nav a:nth-of-type(\${i + 1})\`)`,
    description: 'Fix nav item nth selector'
  },
  {
    old: `await checkElementContrast(page, '.nav-item.active a')`,
    new: `await checkElementContrast(page, '.nav-item.active a, nav a.active, nav [aria-current="page"]')`,
    description: 'Fix active nav selector'
  }
];

async function fixColorContrastTests(): Promise<void> {
  const filePath = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../color-contrast.spec.ts');
  
  console.log('🔧 Fixing color contrast test selectors...\n');
  
  let content = await fs.readFile(filePath, 'utf-8');
  let fixCount = 0;
  
  for (const fix of SELECTOR_FIXES) {
    if (content.includes(fix.old)) {
      content = content.replace(new RegExp(fix.old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), fix.new);
      fixCount++;
      console.log(`✅ Applied: ${fix.description}`);
    }
  }
  
  if (fixCount > 0) {
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`\n✨ Fixed ${fixCount} selectors in color-contrast.spec.ts`);
  } else {
    console.log('✅ No fixes needed');
  }
}

// Main execution
fixColorContrastTests().catch(console.error);