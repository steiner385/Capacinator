import { spawn } from 'child_process';

console.log('Starting client...');

const child = spawn('npm', ['run', 'dev:client'], {
  cwd: '/home/tony/GitHub/Capacinator',
  stdio: 'pipe'
});

let output = '';
let hasStarted = false;

child.stdout.on('data', (data) => {
  const str = data.toString();
  output += str;
  console.log('STDOUT:', str);
  
  if (str.includes('ready in') || str.includes('Local:')) {
    hasStarted = true;
    console.log('Client started successfully!');
  }
});

child.stderr.on('data', (data) => {
  const str = data.toString();
  console.log('STDERR:', str);
  
  if (str.includes('error') || str.includes('Error')) {
    console.log('Found error in client startup');
  }
});

child.on('close', (code) => {
  console.log(`Client process exited with code ${code}`);
});

// Kill after 15 seconds
setTimeout(() => {
  if (!hasStarted) {
    console.log('Client did not start in time, killing...');
    child.kill();
  }
}, 15000);