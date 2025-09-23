import { Page, TestInfo, errors } from '@playwright/test';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ErrorContext {
  testName: string;
  timestamp: string;
  url: string;
  consoleErrors: string[];
  networkErrors: any[];
  pageErrors: string[];
  screenshot?: string;
  html?: string;
}

/**
 * Standardized error handling for E2E tests
 */
export class E2EErrorHandler {
  private consoleErrors: string[] = [];
  private networkErrors: any[] = [];
  private pageErrors: string[] = [];
  private consoleHandler?: (msg: any) => void;
  private responseHandler?: (response: any) => void;
  private pageErrorHandler?: (error: Error) => void;

  constructor(private page: Page, private testInfo: TestInfo) {}

  /**
   * Start monitoring for errors
   */
  startMonitoring(): void {
    // Console errors
    this.consoleHandler = (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Filter out known non-issues
        if (!this.shouldIgnoreError(text)) {
          this.consoleErrors.push(text);
        }
      }
    };

    // Network errors
    this.responseHandler = (response) => {
      const status = response.status();
      const url = response.url();
      
      // Ignore successful responses and known endpoints
      if (status >= 400 && !this.shouldIgnoreNetworkError(url, status)) {
        this.networkErrors.push({
          url,
          status,
          statusText: response.statusText(),
          timestamp: new Date().toISOString()
        });
      }
    };

    // Page errors (uncaught exceptions)
    this.pageErrorHandler = (error: Error) => {
      this.pageErrors.push(error.message);
    };

    this.page.on('console', this.consoleHandler);
    this.page.on('response', this.responseHandler);
    this.page.on('pageerror', this.pageErrorHandler);
  }

  /**
   * Stop monitoring and cleanup
   */
  stopMonitoring(): void {
    if (this.consoleHandler) {
      this.page.off('console', this.consoleHandler);
    }
    if (this.responseHandler) {
      this.page.off('response', this.responseHandler);
    }
    if (this.pageErrorHandler) {
      this.page.off('pageerror', this.pageErrorHandler);
    }
  }

  /**
   * Check if any errors were captured
   */
  hasErrors(): boolean {
    return this.consoleErrors.length > 0 || 
           this.networkErrors.length > 0 || 
           this.pageErrors.length > 0;
  }

  /**
   * Get error summary
   */
  getErrorSummary(): string {
    const parts: string[] = [];
    
    if (this.consoleErrors.length > 0) {
      parts.push(`Console errors: ${this.consoleErrors.length}`);
    }
    
    if (this.networkErrors.length > 0) {
      parts.push(`Network errors: ${this.networkErrors.length}`);
    }
    
    if (this.pageErrors.length > 0) {
      parts.push(`Page errors: ${this.pageErrors.length}`);
    }
    
    return parts.join(', ');
  }

  /**
   * Capture error context for debugging
   */
  async captureErrorContext(): Promise<ErrorContext> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const testName = this.testInfo.title.replace(/[^a-zA-Z0-9]/g, '-');
    
    // Take screenshot
    let screenshotPath: string | undefined;
    try {
      screenshotPath = path.join('test-results', 'errors', `${testName}-${timestamp}.png`);
      await this.ensureDirectory(path.dirname(screenshotPath));
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
    }

    // Capture page HTML
    let htmlPath: string | undefined;
    try {
      htmlPath = path.join('test-results', 'errors', `${testName}-${timestamp}.html`);
      await this.ensureDirectory(path.dirname(htmlPath));
      const html = await this.page.content();
      await fs.writeFile(htmlPath, html);
    } catch (error) {
      console.error('Failed to capture HTML:', error);
    }

    const context: ErrorContext = {
      testName: this.testInfo.title,
      timestamp: new Date().toISOString(),
      url: this.page.url(),
      consoleErrors: [...this.consoleErrors],
      networkErrors: [...this.networkErrors],
      pageErrors: [...this.pageErrors],
      screenshot: screenshotPath,
      html: htmlPath
    };

    // Write error context to file
    try {
      const contextPath = path.join('test-results', 'errors', `${testName}-${timestamp}-context.json`);
      await fs.writeFile(contextPath, JSON.stringify(context, null, 2));
    } catch (error) {
      console.error('Failed to write error context:', error);
    }

    return context;
  }

  /**
   * Assert no critical errors
   */
  async assertNoCriticalErrors(): Promise<void> {
    const criticalErrors = this.getCriticalErrors();
    
    if (criticalErrors.length > 0) {
      const context = await this.captureErrorContext();
      const errorMessage = this.formatErrorMessage(criticalErrors, context);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get only critical errors (filtering out known non-issues)
   */
  private getCriticalErrors(): string[] {
    const critical: string[] = [];

    // Check console errors
    const criticalConsoleErrors = this.consoleErrors.filter(error => 
      this.isCriticalConsoleError(error)
    );
    critical.push(...criticalConsoleErrors.map(e => `Console: ${e}`));

    // Check network errors
    const criticalNetworkErrors = this.networkErrors.filter(error =>
      this.isCriticalNetworkError(error)
    );
    critical.push(...criticalNetworkErrors.map(e => 
      `Network: ${e.status} ${e.statusText} - ${e.url}`
    ));

    // All page errors are considered critical
    critical.push(...this.pageErrors.map(e => `Page: ${e}`));

    return critical;
  }

  /**
   * Format error message for assertion
   */
  private formatErrorMessage(errors: string[], context: ErrorContext): string {
    const parts = [
      `Test encountered ${errors.length} critical error(s):`,
      '',
      ...errors.map((e, i) => `${i + 1}. ${e}`),
      '',
      `Test: ${context.testName}`,
      `URL: ${context.url}`,
      `Time: ${context.timestamp}`
    ];

    if (context.screenshot) {
      parts.push(`Screenshot: ${context.screenshot}`);
    }

    return parts.join('\n');
  }

  /**
   * Determine if console error is critical
   */
  private isCriticalConsoleError(error: string): boolean {
    const ignorePattterns = [
      /ResizeObserver loop limit exceeded/i,
      /Non-Error promise rejection captured/i,
      /Failed to load resource.*favicon/i,
      /Uncaught TypeError: Cannot read property.*of null.*at getHighlightedCode/i
    ];

    return !ignorePattterns.some(pattern => pattern.test(error));
  }

  /**
   * Determine if network error is critical
   */
  private isCriticalNetworkError(error: any): boolean {
    // 404s for certain resources are ok
    if (error.status === 404 && error.url.includes('/api/recommendations')) {
      return false;
    }

    // 401s might be expected in some tests
    if (error.status === 401 && this.testInfo.title.includes('authentication')) {
      return false;
    }

    // 500s are always critical
    return error.status >= 500;
  }

  /**
   * Should ignore this console error entirely
   */
  private shouldIgnoreError(text: string): boolean {
    const ignoreList = [
      'ResizeObserver loop limit exceeded',
      'favicon.ico',
      'DevTools failed to load source map'
    ];

    return ignoreList.some(ignore => text.includes(ignore));
  }

  /**
   * Should ignore this network error entirely
   */
  private shouldIgnoreNetworkError(url: string, status: number): boolean {
    // Ignore hot reload in dev
    if (url.includes('hot-update')) return true;
    
    // Ignore source maps
    if (url.endsWith('.map')) return true;
    
    // Ignore OPTIONS preflight
    if (status === 204) return true;

    return false;
  }

  /**
   * Ensure directory exists
   */
  private async ensureDirectory(dir: string): Promise<void> {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  /**
   * Clear all captured errors
   */
  clearErrors(): void {
    this.consoleErrors = [];
    this.networkErrors = [];
    this.pageErrors = [];
  }

  /**
   * Get all errors for reporting
   */
  getAllErrors(): {
    console: string[];
    network: any[];
    page: string[];
  } {
    return {
      console: [...this.consoleErrors],
      network: [...this.networkErrors],
      page: [...this.pageErrors]
    };
  }
}