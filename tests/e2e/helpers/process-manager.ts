import { ChildProcess, spawn } from 'child_process';
import * as net from 'net';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PortCleanupUtility } from './port-cleanup.js';

interface ProcessInfo {
  process: ChildProcess;
  name: string;
  port?: number;
  startTime: number;
}

export class E2EProcessManager {
  private processes = new Map<string, ProcessInfo>();
  private lockFile = path.join(process.cwd(), '.e2e-lock');
  private pidDir = path.join(process.cwd(), '.e2e-pids');
  private portCleanup: PortCleanupUtility;
  
  constructor() {
    this.portCleanup = new PortCleanupUtility({ verbose: true });
    // Ensure PID directory exists
    this.ensurePidDirectory();
  }

  private async ensurePidDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.pidDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create PID directory:', error);
    }
  }

  /**
   * Write PID file for a process
   */
  private async writePidFile(name: string, pid: number, port?: number): Promise<void> {
    const pidFile = path.join(this.pidDir, `${name}.pid`);
    const pidData = {
      pid,
      name,
      port,
      startTime: Date.now(),
      command: process.argv.join(' ')
    };
    
    try {
      await fs.writeFile(pidFile, JSON.stringify(pidData, null, 2));
      console.log(`📝 Wrote PID file for ${name}: ${pidFile}`);
    } catch (error) {
      console.error(`Failed to write PID file for ${name}:`, error);
    }
  }

  /**
   * Read PID file
   */
  private async readPidFile(name: string): Promise<any | null> {
    const pidFile = path.join(this.pidDir, `${name}.pid`);
    try {
      const content = await fs.readFile(pidFile, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Remove PID file
   */
  private async removePidFile(name: string): Promise<void> {
    const pidFile = path.join(this.pidDir, `${name}.pid`);
    try {
      await fs.unlink(pidFile);
      console.log(`🗑️ Removed PID file for ${name}`);
    } catch {
      // File might not exist
    }
  }

  /**
   * Clean up stale PID files on startup
   */
  async cleanupStalePidFiles(): Promise<void> {
    try {
      // Ensure PID directory exists before trying to read it
      await fs.mkdir(this.pidDir, { recursive: true });
      
      const files = await fs.readdir(this.pidDir);
      const pidFiles = files.filter(f => f.endsWith('.pid'));
      
      for (const file of pidFiles) {
        const name = file.replace('.pid', '');
        const pidData = await this.readPidFile(name);
        
        if (pidData && !this.isProcessRunning(pidData.pid)) {
          console.log(`🧹 Removing stale PID file for ${name} (PID ${pidData.pid})`);
          await this.removePidFile(name);
          
          // Also try to clean up the port if specified
          if (pidData.port) {
            await this.portCleanup.cleanupPort(pidData.port);
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup stale PID files:', error);
    }
  }

  /**
   * Acquire a lock to prevent concurrent E2E test runs
   */
  async acquireLock(): Promise<boolean> {
    try {
      // Try to create lock file with exclusive flag
      await fs.writeFile(this.lockFile, JSON.stringify({
        pid: process.pid,
        timestamp: Date.now()
      }), { flag: 'wx' });
      
      console.log(`🔒 E2E test lock acquired (PID: ${process.pid})`);
      return true;
    } catch (error: any) {
      if (error.code === 'EEXIST') {
        // Lock file exists, check if it's stale
        try {
          const lockData = JSON.parse(await fs.readFile(this.lockFile, 'utf-8'));
          const isStale = Date.now() - lockData.timestamp > 600000; // 10 minutes
          
          if (isStale || !this.isProcessRunning(lockData.pid)) {
            console.log('🔓 Removing stale lock file');
            await fs.unlink(this.lockFile);
            return this.acquireLock(); // Retry
          }
          
          console.error(`❌ Another E2E test is running (PID: ${lockData.pid})`);
          return false;
        } catch {
          // Invalid lock file, remove it
          await fs.unlink(this.lockFile);
          return this.acquireLock();
        }
      }
      throw error;
    }
  }
  
  /**
   * Release the E2E test lock
   */
  async releaseLock(): Promise<void> {
    try {
      await fs.unlink(this.lockFile);
      console.log('🔓 E2E test lock released');
    } catch (error) {
      // Lock file might not exist, ignore
    }
  }
  
  /**
   * Check if a port is available
   */
  async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.once('error', () => {
        resolve(false);
      });
      
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      
      server.listen(port);
    });
  }
  
  /**
   * Wait for a port to become available
   */
  async waitForPortAvailable(port: number, timeout = 10000): Promise<boolean> {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      if (await this.isPortAvailable(port)) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return false;
  }
  
  /**
   * Kill any process using a specific port
   */
  async killProcessOnPort(port: number): Promise<void> {
    await this.portCleanup.cleanupPort(port);
  }
  
  /**
   * Start a managed process
   */
  async startProcess(
    name: string,
    command: string[],
    options: {
      env?: NodeJS.ProcessEnv;
      cwd?: string;
      port?: number;
      waitForOutput?: string | RegExp;
      timeout?: number;
    } = {}
  ): Promise<ChildProcess> {
    const { env = {}, cwd, port, waitForOutput, timeout = 30000 } = options;
    
    // Stop any existing process with this name
    await this.stopProcess(name);
    
    // If port is specified, ensure it's available
    if (port) {
      console.log(`🔍 Checking port ${port} for ${name}...`);
      const success = await this.portCleanup.cleanupPort(port);
      if (!success) {
        throw new Error(`Failed to cleanup port ${port} for ${name}`);
      }
    }
    
    console.log(`🚀 Starting ${name}: ${command.join(' ')}`);
    
    const proc = spawn(command[0], command.slice(1), {
      env: { ...process.env, ...env },
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });
    
    // Store process info
    this.processes.set(name, {
      process: proc,
      name,
      port,
      startTime: Date.now()
    });
    
    // Write PID file
    await this.writePidFile(name, proc.pid!, port);
    
    // Handle process output
    let output = '';
    proc.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      if (process.env.DEBUG_E2E) {
        // Strip ANSI color codes for cleaner output
        const cleanText = text.replace(/\x1b\[[0-9;]*m/g, '').trim();
        if (cleanText) {
          console.log(`[${name}:stdout]`, cleanText);
        }
      }
    });
    
    proc.stderr?.on('data', (data) => {
      const text = data.toString();
      if (process.env.DEBUG_E2E || text.includes('ERROR') || text.includes('FATAL')) {
        console.error(`[${name}:stderr]`, text.trim());
      }
    });
    
    // Handle process exit
    proc.on('exit', (code, signal) => {
      console.log(`📴 ${name} exited with code ${code}, signal ${signal}`);
      this.processes.delete(name);
      // Remove PID file when process exits
      this.removePidFile(name).catch(err => 
        console.error(`Failed to remove PID file for ${name}:`, err)
      );
    });
    
    proc.on('error', (error) => {
      console.error(`❌ ${name} error:`, error);
      this.processes.delete(name);
    });
    
    // Wait for process to be ready if pattern provided
    if (waitForOutput) {
      await this.waitForProcessOutput(name, output, waitForOutput, timeout);
    }
    
    return proc;
  }
  
  /**
   * Wait for specific output from a process
   */
  private async waitForProcessOutput(
    name: string,
    initialOutput: string,
    pattern: string | RegExp,
    timeout: number
  ): Promise<void> {
    const start = Date.now();
    const processInfo = this.processes.get(name);
    
    if (!processInfo) {
      throw new Error(`Process ${name} not found`);
    }
    
    return new Promise((resolve, reject) => {
      // Check initial output
      const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
      if (regex.test(initialOutput)) {
        console.log(`✅ ${name} is ready (pattern found in initial output)`);
        resolve();
        return;
      }
      
      let resolved = false;
      
      const checkTimeout = setInterval(() => {
        if (Date.now() - start > timeout) {
          clearInterval(checkTimeout);
          if (!resolved) {
            resolved = true;
            reject(new Error(`${name} startup timeout after ${timeout}ms`));
          }
        }
      }, 1000);
      
      const onData = (data: Buffer) => {
        const text = data.toString();
        if (regex.test(text)) {
          if (!resolved) {
            resolved = true;
            clearInterval(checkTimeout);
            processInfo.process.stdout?.off('data', onData);
            console.log(`✅ ${name} is ready`);
            resolve();
          }
        }
      };
      
      processInfo.process.stdout?.on('data', onData);
    });
  }
  
  /**
   * Stop a managed process
   */
  async stopProcess(name: string, gracefulTimeout = 5000): Promise<void> {
    const processInfo = this.processes.get(name);
    if (!processInfo || processInfo.process.killed) {
      return;
    }
    
    console.log(`🛑 Stopping ${name}...`);
    
    // Try graceful shutdown first
    processInfo.process.kill('SIGTERM');
    
    // Wait for graceful shutdown
    const killed = await Promise.race([
      new Promise(resolve => processInfo.process.once('exit', () => resolve(true))),
      new Promise(resolve => setTimeout(() => resolve(false), gracefulTimeout))
    ]);
    
    if (!killed) {
      console.log(`⚠️ ${name} didn't stop gracefully, forcing...`);
      processInfo.process.kill('SIGKILL');
      
      // Wait a bit for the process to die
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    this.processes.delete(name);
    await this.removePidFile(name);
    console.log(`✅ ${name} stopped`);
  }
  
  /**
   * Stop all managed processes
   */
  async stopAll(): Promise<void> {
    const names = Array.from(this.processes.keys());
    
    console.log(`🧹 Stopping ${names.length} processes...`);
    
    // Stop all processes in parallel
    await Promise.all(
      names.map(name => this.stopProcess(name).catch(err => 
        console.error(`Failed to stop ${name}:`, err)
      ))
    );
    
    this.processes.clear();
    
    // Clean up all PID files
    try {
      const files = await fs.readdir(this.pidDir).catch(() => []);
      const pidFiles = files.filter(f => f.endsWith('.pid'));
      for (const file of pidFiles) {
        await fs.unlink(path.join(this.pidDir, file)).catch(() => {});
      }
    } catch {
      // Ignore cleanup errors
    }
  }
  
  /**
   * Check if a process is running
   */
  private isProcessRunning(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Get process info
   */
  getProcess(name: string): ProcessInfo | undefined {
    return this.processes.get(name);
  }
  
  /**
   * Check if a process is running
   */
  isRunning(name: string): boolean {
    const info = this.processes.get(name);
    return !!info && !info.process.killed;
  }
  
  /**
   * Kill all processes from PID files (for recovery)
   */
  async killAllFromPidFiles(): Promise<void> {
    try {
      await this.ensurePidDirectory();
      const files = await fs.readdir(this.pidDir).catch(() => []);
      const pidFiles = files.filter(f => f.endsWith('.pid'));
      
      console.log(`🔍 Found ${pidFiles.length} PID files to check`);
      
      for (const file of pidFiles) {
        const name = file.replace('.pid', '');
        const pidData = await this.readPidFile(name);
        
        if (pidData && pidData.pid) {
          if (this.isProcessRunning(pidData.pid)) {
            console.log(`🛑 Killing process ${name} (PID ${pidData.pid})`);
            try {
              process.kill(pidData.pid, 'SIGTERM');
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              if (this.isProcessRunning(pidData.pid)) {
                process.kill(pidData.pid, 'SIGKILL');
              }
            } catch (error) {
              console.error(`Failed to kill ${name}:`, error);
            }
          }
          
          // Clean up the port if specified
          if (pidData.port) {
            await this.portCleanup.cleanupPort(pidData.port);
          }
          
          await this.removePidFile(name);
        }
      }
    } catch (error) {
      console.error('Failed to kill processes from PID files:', error);
    }
  }
}