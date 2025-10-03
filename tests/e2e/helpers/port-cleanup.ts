/**
 * Centralized port cleanup utility for E2E tests
 * Ensures ports are properly freed and available before tests run
 */

import { execSync } from 'child_process';
import * as net from 'net';

export interface PortCleanupOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  verbose?: boolean;
}

export class PortCleanupUtility {
  private readonly defaultOptions: Required<PortCleanupOptions> = {
    timeout: 10000,
    retries: 3,
    retryDelay: 500,
    verbose: process.env.DEBUG_E2E === 'true'
  };

  constructor(private options: PortCleanupOptions = {}) {
    this.options = { ...this.defaultOptions, ...options };
  }

  /**
   * Check if a port is available
   */
  async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.once('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        } else {
          // Other errors mean the port might be available
          resolve(true);
        }
      });
      
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      
      server.listen(port, '127.0.0.1');
    });
  }

  /**
   * Get process IDs using a specific port
   */
  private getProcessesOnPort(port: number): string[] {
    const pids: string[] = [];
    
    try {
      if (process.platform === 'linux' || process.platform === 'darwin') {
        // Use lsof to find processes
        try {
          const output = execSync(`lsof -ti:${port} 2>/dev/null || true`, { 
            encoding: 'utf-8' 
          });
          pids.push(...output.trim().split('\n').filter(Boolean));
        } catch {
          // lsof might not be available or port might be free
        }

        // Also try with fuser as a fallback
        if (process.platform === 'linux') {
          try {
            const output = execSync(`fuser ${port}/tcp 2>/dev/null || true`, { 
              encoding: 'utf-8' 
            });
            const matches = output.match(/\d+/g);
            if (matches) {
              pids.push(...matches);
            }
          } catch {
            // fuser might not be available
          }
        }
      } else if (process.platform === 'win32') {
        // Windows: use netstat
        try {
          const output = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { 
            encoding: 'utf-8' 
          });
          const lines = output.trim().split('\n');
          for (const line of lines) {
            const pid = line.trim().split(/\s+/).pop();
            if (pid && !isNaN(Number(pid))) {
              pids.push(pid);
            }
          }
        } catch {
          // No processes found
        }
      }
    } catch (error) {
      this.log(`Error getting processes on port ${port}:`, error);
    }

    return [...new Set(pids)]; // Remove duplicates
  }

  /**
   * Kill a process by PID
   */
  private killProcess(pid: string, force = false): boolean {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /PID ${pid} ${force ? '/F' : ''}`, { stdio: 'ignore' });
      } else {
        // Try graceful kill first
        if (!force) {
          try {
            process.kill(Number(pid), 'SIGTERM');
            // Give it a moment to terminate
            execSync(`sleep 0.5`, { stdio: 'ignore' });
          } catch {
            // Process might already be gone
          }
        }
        
        // Force kill if needed
        try {
          process.kill(Number(pid), 'SIGKILL');
        } catch {
          // Process already terminated
        }
      }
      return true;
    } catch (error) {
      this.log(`Failed to kill process ${pid}:`, error);
      return false;
    }
  }

  /**
   * Kill all processes using a specific port
   */
  async killProcessesOnPort(port: number): Promise<number> {
    const pids = this.getProcessesOnPort(port);
    
    if (pids.length === 0) {
      this.log(`No processes found on port ${port}`);
      return 0;
    }

    this.log(`Found ${pids.length} process(es) on port ${port}: ${pids.join(', ')}`);
    
    let killedCount = 0;
    
    // First attempt: graceful termination
    for (const pid of pids) {
      if (this.killProcess(pid, false)) {
        killedCount++;
      }
    }

    // Wait a bit for graceful termination
    await this.delay(500);

    // Second attempt: force kill any remaining
    const remainingPids = this.getProcessesOnPort(port);
    for (const pid of remainingPids) {
      this.log(`Force killing process ${pid}`);
      if (this.killProcess(pid, true)) {
        killedCount++;
      }
    }

    return killedCount;
  }

  /**
   * Clean up a port with retries
   */
  async cleanupPort(port: number): Promise<boolean> {
    const { retries, retryDelay } = this.options;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      this.log(`\nAttempt ${attempt}/${retries} to cleanup port ${port}`);
      
      // Check if port is already available
      if (await this.isPortAvailable(port)) {
        this.log(`✅ Port ${port} is already available`);
        return true;
      }

      // Kill processes on the port
      const killedCount = await this.killProcessesOnPort(port);
      this.log(`Killed ${killedCount} processes`);

      // Wait for OS to release the port
      await this.delay(retryDelay);

      // Verify port is now available
      const startTime = Date.now();
      while (Date.now() - startTime < this.options.timeout) {
        if (await this.isPortAvailable(port)) {
          this.log(`✅ Port ${port} is now available`);
          return true;
        }
        await this.delay(100);
      }

      if (attempt < retries) {
        this.log(`⚠️ Port ${port} still not available, retrying...`);
        await this.delay(retryDelay);
      }
    }

    this.log(`❌ Failed to cleanup port ${port} after ${retries} attempts`);
    return false;
  }

  /**
   * Clean up multiple ports
   */
  async cleanupPorts(ports: number[]): Promise<Map<number, boolean>> {
    const results = new Map<number, boolean>();
    
    this.log(`🧹 Cleaning up ports: ${ports.join(', ')}`);
    
    // Clean up ports in parallel
    const cleanupPromises = ports.map(async (port) => {
      const success = await this.cleanupPort(port);
      results.set(port, success);
      return { port, success };
    });

    await Promise.all(cleanupPromises);
    
    // Summary
    const successful = Array.from(results.entries()).filter(([_, success]) => success);
    const failed = Array.from(results.entries()).filter(([_, success]) => !success);
    
    if (successful.length > 0) {
      this.log(`✅ Successfully cleaned up ports: ${successful.map(([port]) => port).join(', ')}`);
    }
    
    if (failed.length > 0) {
      this.log(`❌ Failed to cleanup ports: ${failed.map(([port]) => port).join(', ')}`);
    }

    return results;
  }

  /**
   * Clean up E2E test ports (3110, 3120)
   */
  async cleanupE2EPorts(): Promise<boolean> {
    const e2ePorts = [3110, 3120];
    const results = await this.cleanupPorts(e2ePorts);
    return Array.from(results.values()).every(success => success);
  }

  /**
   * Verify ports are available (without cleanup)
   */
  async verifyPortsAvailable(ports: number[]): Promise<Map<number, boolean>> {
    const results = new Map<number, boolean>();
    
    for (const port of ports) {
      const available = await this.isPortAvailable(port);
      results.set(port, available);
      this.log(`Port ${port}: ${available ? 'available' : 'in use'}`);
    }

    return results;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(...args: any[]): void {
    if (this.options.verbose) {
      console.log('[PortCleanup]', ...args);
    }
  }
}

// Export singleton instance for convenience
export const portCleanup = new PortCleanupUtility();

// Export E2E port constants
export const E2E_PORTS = {
  backend: 3110,
  frontend: 3120
} as const;