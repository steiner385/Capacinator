#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const logDir = 'logs';

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function startProcess(name, command, args) {
  console.log(`Starting ${name}...`);
  
  const logFile = path.join(logDir, `${name}.log`);
  const errorFile = path.join(logDir, `${name}.error.log`);
  
  const child = spawn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
    cwd: process.cwd()
  });

  // Create log streams
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  const errorStream = fs.createWriteStream(errorFile, { flags: 'a' });
  
  // Pipe output to files
  child.stdout.pipe(logStream);
  child.stderr.pipe(errorStream);

  child.on('error', (error) => {
    console.error(`${name} error:`, error);
  });

  child.on('exit', (code) => {
    console.log(`${name} exited with code ${code}`);
  });

  return child;
}

// Start backend
const backend = startProcess('backend', 'npx', ['tsx', 'watch', '--clear-screen=false', 'src/server/index.ts']);

// Start frontend 
const frontend = startProcess('frontend', 'bash', ['-c', 'cd client && npm run dev']);

console.log('✅ Development environment started!');
console.log('📊 Backend: http://localhost:8082');
console.log('🌐 Frontend: http://localhost:8090');
console.log('📝 Logs available in:', logDir);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  backend.kill();
  frontend.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down...');
  backend.kill();
  frontend.kill();
  process.exit(0);
});