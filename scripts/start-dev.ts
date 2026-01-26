#!/usr/bin/env tsx
/**
 * Cross-platform script to start development environment
 * Replaces: start-dev.sh
 */
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import {
  getTempDir,
  getLogsDir,
  savePid,
  isPortInUse
} from './utils/process-manager.js';

const PORTS = { server: 3110, client: 3120 };

async function checkPorts() {
  const checks = await Promise.all([
    isPortInUse(PORTS.server),
    isPortInUse(PORTS.client)
  ]);

  const busyPorts = [];
  if (checks[0]) busyPorts.push(`${PORTS.server} (server)`);
  if (checks[1]) busyPorts.push(`${PORTS.client} (client)`);

  if (busyPorts.length > 0) {
    console.error(`❌ Port(s) already in use: ${busyPorts.join(', ')}`);
    console.error('\nRun cleanup first: npm run dev:cleanup');
    process.exit(1);
  }
}

async function main() {
  console.log('🚀 Starting Capacinator development environment...\n');

  // Run cleanup first
  console.log('Running cleanup...');
  const cleanupScript = path.join(process.cwd(), 'scripts', 'cleanup-processes.ts');
  if (fs.existsSync(cleanupScript)) {
    const { execSync } = require('child_process');
    try {
      execSync(`npx tsx "${cleanupScript}"`, { stdio: 'inherit' });
      console.log('');
    } catch {
      // Cleanup failed, continue anyway
    }
  }

  // Check if ports are available
  await checkPorts();

  // Create log directory
  const logsDir = getLogsDir();
  const logFile = path.join(logsDir, 'dev.log');

  // Start development servers using concurrently
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });

  const isWindows = process.platform === 'win32';
  const npmCmd = isWindows ? 'npm.cmd' : 'npm';

  console.log('Starting development servers...\n');

  const child: ChildProcess = spawn(
    npmCmd,
    ['run', 'dev:no-bg'],
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: !isWindows, // Detached mode doesn't work well on Windows
      shell: true
    }
  );

  if (!child.pid) {
    console.error('❌ Failed to start development servers');
    process.exit(1);
  }

  // Pipe output to log file
  child.stdout?.pipe(logStream);
  child.stderr?.pipe(logStream);

  // Save PID for later stopping
  savePid('capacinator-dev', child.pid);

  // Give servers a moment to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log(`✅ Development servers started (PID: ${child.pid})`);
  console.log(`📄 Logs: ${logFile}`);
  console.log('');
  console.log('Server URLs:');
  console.log(`  Backend:  http://localhost:${PORTS.server}`);
  console.log(`  Frontend: http://localhost:${PORTS.client}`);
  console.log('');
  console.log('Commands:');
  console.log('  npm run dev:stop    - Stop the servers');
  console.log('  npm run dev:logs    - View live logs');
  console.log('  npm run dev:cleanup - Clean up orphaned processes');

  // Detach the child process so it continues running
  if (!isWindows) {
    child.unref();
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Error starting dev environment:', err);
  process.exit(1);
});
