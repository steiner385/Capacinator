#!/usr/bin/env tsx
/**
 * Generic server manager utility
 * Can be used for dev, prod, and e2e servers
 */
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
  getTempDir,
  getLogsDir,
  savePid,
  readPid,
  deletePid,
  killProcess,
  killPort,
  isProcessRunning,
  isPortInUse
} from './utils/process-manager.js';

export interface ServerConfig {
  name: string;
  port: number;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export class ServerManager {
  constructor(private config: ServerConfig) {}

  async start(): Promise<void> {
    console.log(`🚀 Starting ${this.config.name}...\n`);

    // Check if already running
    const existingPid = readPid(this.config.name);
    if (existingPid && await isProcessRunning(existingPid)) {
      console.log(`✅ ${this.config.name} is already running (PID: ${existingPid})`);
      console.log(`Port: http://localhost:${this.config.port}`);
      return;
    }

    // Check port availability
    if (await isPortInUse(this.config.port)) {
      console.error(`❌ Port ${this.config.port} is already in use`);
      console.error(`\nFree the port with: npm run ${this.config.name.toLowerCase()}:stop`);
      process.exit(1);
    }

    // Create log directory
    const logsDir = getLogsDir();
    const logFile = path.join(logsDir, `${this.config.name}.log`);
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });

    // Start server
    const isWindows = process.platform === 'win32';
    const child: ChildProcess = spawn(
      this.config.command,
      this.config.args,
      {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: !isWindows,
        shell: true,
        env: { ...process.env, ...this.config.env }
      }
    );

    if (!child.pid) {
      console.error(`❌ Failed to start ${this.config.name}`);
      process.exit(1);
    }

    // Pipe output to log file
    child.stdout?.pipe(logStream);
    child.stderr?.pipe(logStream);

    // Save PID
    savePid(this.config.name, child.pid);

    // Give server a moment to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log(`✅ ${this.config.name} started (PID: ${child.pid})`);
    console.log(`📄 Logs: ${logFile}`);
    console.log(`🌐 URL: http://localhost:${this.config.port}`);

    // Detach the child process
    if (!isWindows) {
      child.unref();
    }
  }

  async stop(): Promise<void> {
    console.log(`🛑 Stopping ${this.config.name}...\n`);

    let stoppedSomething = false;

    // Try to read and kill the PID
    const pid = readPid(this.config.name);

    if (pid) {
      console.log(`Found PID: ${pid}`);
      const isRunning = await isProcessRunning(pid);

      if (isRunning) {
        console.log('Stopping server...');
        await killProcess(pid, 'SIGTERM');

        // Wait for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Force kill if still running
        if (await isProcessRunning(pid)) {
          console.log('Force killing...');
          await killProcess(pid, 'SIGKILL');
        }

        console.log(`✅ ${this.config.name} stopped`);
        stoppedSomething = true;
      } else {
        console.log('Process not running (stale PID file)');
      }

      deletePid(this.config.name);
    }

    // Also kill any processes on the port
    const killed = await killPort(this.config.port, true);
    if (killed > 0) {
      console.log(`✅ Freed port ${this.config.port}`);
      stoppedSomething = true;
    }

    if (!stoppedSomething) {
      console.log(`ℹ️  No running ${this.config.name} found`);
    }
  }

  async status(): Promise<void> {
    const pid = readPid(this.config.name);

    if (!pid) {
      console.log(`❌ ${this.config.name} is not running (no PID file)`);
      return;
    }

    const isRunning = await isProcessRunning(pid);

    if (isRunning) {
      console.log(`✅ ${this.config.name} is running`);
      console.log(`   PID: ${pid}`);
      console.log(`   Port: ${this.config.port}`);
      console.log(`   URL: http://localhost:${this.config.port}`);
    } else {
      console.log(`❌ ${this.config.name} is not running (stale PID file)`);
      deletePid(this.config.name);
    }
  }

  async logs(follow: boolean = true): Promise<void> {
    const logsDir = getLogsDir();
    const logFile = path.join(logsDir, `${this.config.name}.log`);

    if (!fs.existsSync(logFile)) {
      console.error(`❌ No log file found for ${this.config.name}`);
      console.error(`Expected location: ${logFile}`);
      process.exit(1);
    }

    console.log(`📄 Viewing ${this.config.name} logs: ${logFile}`);

    if (follow) {
      console.log('Press Ctrl+C to exit\n');

      const isWindows = process.platform === 'win32';

      if (isWindows) {
        const ps = spawn('powershell', [
          '-Command',
          `Get-Content -Path "${logFile}" -Wait -Tail 50`
        ], {
          stdio: 'inherit',
          shell: true
        });

        ps.on('exit', () => process.exit(0));
      } else {
        const tail = spawn('tail', ['-f', logFile], {
          stdio: 'inherit'
        });

        tail.on('exit', () => process.exit(0));
      }
    } else {
      // Just print last 50 lines
      const content = fs.readFileSync(logFile, 'utf8');
      const lines = content.split('\n');
      const last50 = lines.slice(-50).join('\n');
      console.log(last50);
    }
  }

  async restart(): Promise<void> {
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.start();
  }
}
