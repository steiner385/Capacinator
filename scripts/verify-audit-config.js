#!/usr/bin/env node

/**
 * Audit Configuration Verification Script
 * 
 * This script helps verify that audit logging is properly configured
 * for project updates and other operations.
 */

import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config({ path: join(__dirname, '..', '.env.development') });

console.log('🔍 Audit Configuration Verification\n');

// Check audit configuration
console.log('📋 Environment Variables:');
console.log('  AUDIT_ENABLED:', process.env.AUDIT_ENABLED);
console.log('  AUDIT_ENABLED_TABLES:', process.env.AUDIT_ENABLED_TABLES);
console.log('  AUDIT_MAX_HISTORY_ENTRIES:', process.env.AUDIT_MAX_HISTORY_ENTRIES);
console.log('  AUDIT_RETENTION_DAYS:', process.env.AUDIT_RETENTION_DAYS);
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  PORT:', process.env.PORT);

// Parse and check enabled tables
const enabledTables = process.env.AUDIT_ENABLED_TABLES?.split(',').map(t => t.trim()) || [];
console.log('\n📊 Audited Tables:');
enabledTables.forEach(table => {
  console.log(`  ✓ ${table}`);
});

// Check for required tables
const requiredTables = ['projects', 'people', 'assignments', 'project_phases_timeline', 'scenarios'];
console.log('\n🔍 Required Table Check:');
requiredTables.forEach(table => {
  const isEnabled = enabledTables.includes(table);
  console.log(`  ${isEnabled ? '✅' : '❌'} ${table} ${isEnabled ? 'ENABLED' : 'MISSING'}`);
});

// Check if projects audit is specifically enabled
const projectsAuditEnabled = enabledTables.includes('projects');
console.log('\n🎯 Projects Audit Status:');
console.log(`  ${projectsAuditEnabled ? '✅' : '❌'} Projects table audit: ${projectsAuditEnabled ? 'ENABLED' : 'DISABLED'}`);

if (projectsAuditEnabled) {
  console.log('\n✅ Audit configuration looks correct for project updates!');
  console.log('\n📝 If audit logs are still not appearing:');
  console.log('  1. Restart the development server: npm run dev:stop && npm run dev');
  console.log('  2. Check the audit_log table in the database');
  console.log('  3. Verify user authentication is working');
  console.log('  4. Check server logs for any audit-related errors');
} else {
  console.log('\n❌ Projects table audit is NOT enabled!');
  console.log('   Add "projects" to AUDIT_ENABLED_TABLES in .env.development');
}

console.log('\n🔧 Development Commands:');
console.log('  Start server: npm run dev');
console.log('  Stop server: npm run dev:stop');
console.log('  View logs: npm run dev:logs');
console.log('  Run audit tests: npm test -- tests/integration/audit/projects-audit.test.ts');