#!/usr/bin/env tsx
/**
 * Cross-platform script to view development logs
 * Replaces: dev-logs.sh
 */
import * as fs from 'fs';
import * as path from 'path';
import { getLogsDir } from './utils/process-manager.js';
import { spawn } from 'child_process';

async function main() {
  const logsDir = getLogsDir();
  const logFile = path.join(logsDir, 'dev.log');

  if (!fs.existsSync(logFile)) {
    console.error('❌ No dev log file found');
    console.error(`Expected location: ${logFile}`);
    console.error('\nIs the dev server running? Start it with: npm run dev');
    process.exit(1);
  }

  console.log(`📄 Viewing dev logs: ${logFile}`);
  console.log('Press Ctrl+C to exit\n');

  // Use platform-appropriate tail command
  const isWindows = process.platform === 'win32';

  if (isWindows) {
    // On Windows, use PowerShell Get-Content -Wait
    const ps = spawn('powershell', [
      '-Command',
      `Get-Content -Path "${logFile}" -Wait -Tail 50`
    ], {
      stdio: 'inherit',
      shell: true
    });

    ps.on('exit', () => process.exit(0));
  } else {
    // On Unix, use tail -f
    const tail = spawn('tail', ['-f', logFile], {
      stdio: 'inherit'
    });

    tail.on('exit', () => process.exit(0));
  }
}

main().catch(err => {
  console.error('Error viewing logs:', err);
  process.exit(1);
});
