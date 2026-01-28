#!/usr/bin/env tsx
/**
 * List all available npm scripts
 * Replaces: list-commands.sh
 */
import * as fs from 'fs';
import * as path from 'path';

function main() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  console.log('📋 Available Capacinator Commands\n');
  console.log('═'.repeat(60));

  const categories: Record<string, string[]> = {
    'Development': [],
    'Production': [],
    'Testing': [],
    'E2E Testing': [],
    'Database': [],
    'Build & Distribution': [],
    'Utilities': []
  };

  const scripts = packageJson.scripts || {};

  // Categorize scripts
  for (const [name, command] of Object.entries(scripts)) {
    if (name.startsWith('dev')) {
      categories['Development'].push(name);
    } else if (name.startsWith('prod') || name.startsWith('server')) {
      categories['Production'].push(name);
    } else if (name.startsWith('test:e2e')) {
      categories['E2E Testing'].push(name);
    } else if (name.startsWith('test')) {
      categories['Testing'].push(name);
    } else if (name.startsWith('e2e')) {
      categories['E2E Testing'].push(name);
    } else if (name.startsWith('db') || name.startsWith('import')) {
      categories['Database'].push(name);
    } else if (name.startsWith('build') || name.startsWith('dist')) {
      categories['Build & Distribution'].push(name);
    } else {
      categories['Utilities'].push(name);
    }
  }

  // Print categorized scripts
  for (const [category, commands] of Object.entries(categories)) {
    if (commands.length === 0) continue;

    console.log(`\n${category}:`);
    console.log('─'.repeat(60));

    for (const cmd of commands.sort()) {
      const description = scripts[cmd];
      console.log(`  npm run ${cmd.padEnd(25)} ${formatCommand(description as string)}`);
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('\n💡 Tip: Run "npm run <command>" to execute a script');
  console.log('💡 Example: npm run dev\n');
}

function formatCommand(cmd: string): string {
  if (cmd.length > 50) {
    return '# ' + cmd.substring(0, 47) + '...';
  }
  return '# ' + cmd;
}

main();
