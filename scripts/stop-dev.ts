#!/usr/bin/env tsx
/**
 * Cross-platform script to stop development environment
 * Replaces: stop-dev.sh
 */
import {
  readPid,
  deletePid,
  killProcess,
  killPort,
  isProcessRunning
} from './utils/process-manager.js';

const PORTS = { server: 3110, client: 3120 };

async function main() {
  console.log('🛑 Stopping Capacinator development environment...\n');

  let stoppedSomething = false;

  // Try to read and kill the main PID
  const pid = readPid('capacinator-dev');

  if (pid) {
    console.log(`Found dev server PID: ${pid}`);
    const isRunning = await isProcessRunning(pid);

    if (isRunning) {
      console.log('Stopping dev servers...');
      await killProcess(pid, 'SIGTERM');

      // Wait a bit for graceful shutdown
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Force kill if still running
      if (await isProcessRunning(pid)) {
        console.log('Force killing...');
        await killProcess(pid, 'SIGKILL');
      }

      console.log('✅ Dev servers stopped');
      stoppedSomething = true;
    } else {
      console.log('Process not running (stale PID file)');
    }

    deletePid('capacinator-dev');
  }

  // Also kill any processes on the dev ports (cleanup)
  for (const [name, port] of Object.entries(PORTS)) {
    const killed = await killPort(port, true);
    if (killed > 0) {
      console.log(`✅ Freed port ${port} (${name})`);
      stoppedSomething = true;
    }
  }

  if (!stoppedSomething) {
    console.log('ℹ️  No running dev servers found');
  }

  console.log('\n✅ Cleanup complete!');
}

main().catch(err => {
  console.error('Error stopping dev environment:', err);
  process.exit(1);
});
