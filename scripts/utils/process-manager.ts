/**
 * Cross-platform process management utilities
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

/**
 * Get the platform-appropriate temp directory for Capacinator
 */
export function getTempDir(): string {
  const tempDir = path.join(os.tmpdir(), 'capacinator');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  return tempDir;
}

/**
 * Get the logs directory
 */
export function getLogsDir(): string {
  const logsDir = path.join(getTempDir(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  return logsDir;
}

/**
 * Find process ID(s) on a specific port
 */
export async function findProcessOnPort(port: number): Promise<number[]> {
  try {
    const platform = os.platform();
    let command: string;

    if (platform === 'win32') {
      command = `netstat -ano | findstr :${port}`;
    } else {
      command = `lsof -ti:${port} 2>/dev/null || true`;
    }

    const { stdout } = await execAsync(command);

    if (!stdout.trim()) {
      return [];
    }

    if (platform === 'win32') {
      // Parse Windows netstat output
      // Output format: TCP    0.0.0.0:3110    0.0.0.0:0    LISTENING    1234
      const lines = stdout.trim().split('\n');
      const pids = new Set<number>();

      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parseInt(parts[parts.length - 1]);
        if (!isNaN(pid) && pid > 0) {
          pids.add(pid);
        }
      }

      return Array.from(pids);
    } else {
      // Parse Unix lsof output (one PID per line)
      return stdout
        .trim()
        .split('\n')
        .map(pid => parseInt(pid))
        .filter(pid => !isNaN(pid));
    }
  } catch (error) {
    // Command failed or no process found
    return [];
  }
}

/**
 * Kill a process by PID
 */
export async function killProcess(pid: number, signal: 'SIGTERM' | 'SIGKILL' = 'SIGTERM'): Promise<boolean> {
  try {
    const platform = os.platform();

    if (platform === 'win32') {
      const forceFlag = signal === 'SIGKILL' ? '/F' : '';
      await execAsync(`taskkill ${forceFlag} /PID ${pid} /T 2>nul`);
    } else {
      const signum = signal === 'SIGKILL' ? '-9' : '-15';
      await execAsync(`kill ${signum} ${pid} 2>/dev/null || true`);
    }

    return true;
  } catch (error) {
    // Process might already be dead
    return false;
  }
}

/**
 * Kill all processes on a specific port
 */
export async function killPort(port: number, force: boolean = false): Promise<number> {
  const pids = await findProcessOnPort(port);

  if (pids.length === 0) {
    return 0;
  }

  const signal = force ? 'SIGKILL' : 'SIGTERM';
  const results = await Promise.all(pids.map(pid => killProcess(pid, signal)));

  return results.filter(r => r).length;
}

/**
 * Find processes by pattern (name or command line)
 */
export async function findProcessesByPattern(pattern: string): Promise<number[]> {
  try {
    const platform = os.platform();
    let command: string;

    if (platform === 'win32') {
      // Use wmic or tasklist
      command = `wmic process where "CommandLine like '%${pattern}%'" get ProcessId 2>nul`;
    } else {
      command = `ps aux | grep "${pattern}" | grep -v grep | awk '{print $2}'`;
    }

    const { stdout } = await execAsync(command);

    if (!stdout.trim()) {
      return [];
    }

    if (platform === 'win32') {
      // Parse WMIC output (skip header)
      const lines = stdout.trim().split('\n').slice(1);
      return lines
        .map(line => parseInt(line.trim()))
        .filter(pid => !isNaN(pid) && pid > 0);
    } else {
      return stdout
        .trim()
        .split('\n')
        .map(pid => parseInt(pid))
        .filter(pid => !isNaN(pid));
    }
  } catch (error) {
    return [];
  }
}

/**
 * Check if a port is in use
 */
export async function isPortInUse(port: number): Promise<boolean> {
  const pids = await findProcessOnPort(port);
  return pids.length > 0;
}

/**
 * Save PID to a file
 */
export function savePid(name: string, pid: number): void {
  const tempDir = getTempDir();
  const pidFile = path.join(tempDir, `${name}.pid`);
  fs.writeFileSync(pidFile, pid.toString(), 'utf8');
}

/**
 * Read PID from a file
 */
export function readPid(name: string): number | null {
  const tempDir = getTempDir();
  const pidFile = path.join(tempDir, `${name}.pid`);

  if (!fs.existsSync(pidFile)) {
    return null;
  }

  try {
    const content = fs.readFileSync(pidFile, 'utf8').trim();
    const pid = parseInt(content);
    return isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

/**
 * Delete PID file
 */
export function deletePid(name: string): void {
  const tempDir = getTempDir();
  const pidFile = path.join(tempDir, `${name}.pid`);

  if (fs.existsSync(pidFile)) {
    fs.unlinkSync(pidFile);
  }
}

/**
 * Check if a process is running
 */
export async function isProcessRunning(pid: number): Promise<boolean> {
  try {
    const platform = os.platform();

    if (platform === 'win32') {
      await execAsync(`tasklist /FI "PID eq ${pid}" 2>nul | findstr ${pid}`);
    } else {
      await execAsync(`ps -p ${pid} > /dev/null 2>&1`);
    }

    return true;
  } catch {
    return false;
  }
}
