#!/usr/bin/env node

/**
 * Excel Import Utility Script
 * 
 * Administrative utility for importing Excel data into the Capacinator system.
 * This script provides command-line access to the Excel import functionality
 * that was previously available through the main UI.
 * 
 * Usage:
 *   node scripts/import-excel.js --file=path/to/data.xlsx [options]
 *   npm run import:excel -- --file=data.xlsx --clear --v2
 * 
 * Options:
 *   --file=<path>           Path to Excel file (required)
 *   --clear                 Clear existing data before import
 *   --v2                    Use V2 template format (fiscal weeks)
 *   --validate-duplicates   Enable duplicate validation
 *   --auto-roles            Auto-create missing roles
 *   --auto-locations        Auto-create missing locations
 *   --priority=<1-3>        Default project priority (1=High, 2=Medium, 3=Low)
 *   --date-format=<format>  Date format (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD)
 *   --help                  Show this help message
 */

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync, existsSync } from 'fs';
import { ExcelImporter } from '../src/server/services/import/ExcelImporter.ts';
import { ExcelImporterV2 } from '../src/server/services/import/ExcelImporterV2.ts';
import { initializeDatabase } from '../src/server/database/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    file: null,
    clearExisting: false,
    useV2: false,
    validateDuplicates: true,
    autoCreateMissingRoles: false,
    autoCreateMissingLocations: false,
    defaultProjectPriority: 2, // Medium
    dateFormat: 'MM/DD/YYYY',
    help: false
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg.startsWith('--file=')) {
      options.file = arg.split('=')[1];
    } else if (arg === '--clear') {
      options.clearExisting = true;
    } else if (arg === '--v2') {
      options.useV2 = true;
    } else if (arg === '--validate-duplicates') {
      options.validateDuplicates = true;
    } else if (arg === '--auto-roles') {
      options.autoCreateMissingRoles = true;
    } else if (arg === '--auto-locations') {
      options.autoCreateMissingLocations = true;
    } else if (arg.startsWith('--priority=')) {
      const priority = parseInt(arg.split('=')[1]);
      if (priority >= 1 && priority <= 3) {
        options.defaultProjectPriority = priority;
      } else {
        console.error('Error: Priority must be 1 (High), 2 (Medium), or 3 (Low)');
        process.exit(1);
      }
    } else if (arg.startsWith('--date-format=')) {
      const format = arg.split('=')[1];
      if (['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'].includes(format)) {
        options.dateFormat = format;
      } else {
        console.error('Error: Date format must be MM/DD/YYYY, DD/MM/YYYY, or YYYY-MM-DD');
        process.exit(1);
      }
    } else {
      console.error(`Error: Unknown option ${arg}`);
      process.exit(1);
    }
  }

  return options;
}

// Show help message
function showHelp() {
  const helpText = `
Excel Import Utility for Capacinator

USAGE:
  node scripts/import-excel.js --file=<path> [options]
  npm run import:excel -- --file=<path> [options]

REQUIRED OPTIONS:
  --file=<path>           Path to Excel file to import

OPTIONAL FLAGS:
  --clear                 Clear existing data before import
  --v2                    Use V2 template format (fiscal weeks)
  --validate-duplicates   Enable duplicate validation (default: true)
  --auto-roles            Auto-create missing roles
  --auto-locations        Auto-create missing locations
  --help, -h              Show this help message

OPTIONAL PARAMETERS:
  --priority=<1-3>        Default project priority (1=High, 2=Medium, 3=Low)
                          Default: 2 (Medium)
  --date-format=<format>  Date format for parsing dates
                          Options: MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD
                          Default: MM/DD/YYYY

EXAMPLES:
  # Basic import
  npm run import:excel -- --file=data.xlsx

  # Import with clear existing data and V2 format
  npm run import:excel -- --file=data.xlsx --clear --v2

  # Import with custom settings
  npm run import:excel -- --file=data.xlsx --priority=1 --auto-roles --auto-locations

TEMPLATE FORMAT:
  Your Excel file should contain these sheets:
  - Project Types: List of project types
  - Roles: Roles with Plan Owner, CW Option, and Data Access
  - Roster: People with roles and availability by fiscal week
  - Projects: Projects with type, location, and priority
  - Project Roadmap: Phase timeline by fiscal week
  - Resource Templates: Role allocations by project type and phase
  - Project Demand: Demand hours by role and fiscal week
  - Project Assignments: Person assignments by project and fiscal week

ADMIN ACCESS:
  This utility is for administrative use only. The import functionality
  has been removed from the main UI to streamline the user experience.
`;
  console.log(helpText);
}

// Validate file exists and is readable
function validateFile(filePath) {
  if (!filePath) {
    console.error('Error: --file parameter is required');
    console.error('Use --help for usage information');
    return false;
  }

  const fullPath = resolve(filePath);
  if (!existsSync(fullPath)) {
    console.error(`Error: File not found: ${fullPath}`);
    return false;
  }

  const extension = fullPath.toLowerCase();
  if (!extension.endsWith('.xlsx') && !extension.endsWith('.xls')) {
    console.error('Error: File must be an Excel file (.xlsx or .xls)');
    return false;
  }

  return fullPath;
}

// Main import function
async function importExcel(filePath, options) {
  console.log('🚀 Starting Excel import...');
  console.log(`📁 File: ${filePath}`);
  console.log(`🔄 Template: ${options.useV2 ? 'V2 (Fiscal Weeks)' : 'V1 (Standard)'}`);
  console.log(`🗑️  Clear existing: ${options.clearExisting ? 'Yes' : 'No'}`);
  console.log(`✅ Validate duplicates: ${options.validateDuplicates ? 'Yes' : 'No'}`);
  console.log(`🏷️  Auto-create roles: ${options.autoCreateMissingRoles ? 'Yes' : 'No'}`);
  console.log(`📍 Auto-create locations: ${options.autoCreateMissingLocations ? 'Yes' : 'No'}`);
  console.log(`⚡ Default priority: ${options.defaultProjectPriority === 1 ? 'High' : options.defaultProjectPriority === 2 ? 'Medium' : 'Low'}`);
  console.log(`📅 Date format: ${options.dateFormat}`);
  console.log('');

  try {
    // Initialize database connection
    console.log('📊 Initializing database connection...');
    const db = await initializeDatabase();
    
    // Select appropriate importer
    const ImporterClass = options.useV2 ? ExcelImporterV2 : ExcelImporter;
    const importer = new ImporterClass(db);
    
    // Read file
    console.log('📖 Reading Excel file...');
    const fileBuffer = readFileSync(filePath);
    
    // Configure import options
    const importOptions = {
      clearExisting: options.clearExisting,
      validateDuplicates: options.validateDuplicates,
      autoCreateMissingRoles: options.autoCreateMissingRoles,
      autoCreateMissingLocations: options.autoCreateMissingLocations,
      defaultProjectPriority: options.defaultProjectPriority,
      dateFormat: options.dateFormat
    };
    
    // Perform import
    console.log('⚙️  Processing import...');
    const result = await importer.import(fileBuffer, importOptions);
    
    // Display results
    console.log('');
    if (result.success) {
      console.log('✅ Import completed successfully!');
      console.log('');
      
      if (result.imported) {
        console.log('📊 Import Statistics:');
        Object.entries(result.imported).forEach(([key, value]) => {
          const label = key.replace(/([A-Z])/g, ' $1').trim();
          console.log(`   ${label}: ${value}`);
        });
      }
      
      if (result.warnings && result.warnings.length > 0) {
        console.log('');
        console.log('⚠️  Warnings:');
        result.warnings.forEach((warning, index) => {
          console.log(`   ${index + 1}. ${warning}`);
        });
      }
    } else {
      console.log('❌ Import failed!');
      console.log(`Error: ${result.message}`);
      
      if (result.errors && result.errors.length > 0) {
        console.log('');
        console.log('🚨 Errors:');
        result.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
      }
      
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Fatal error during import:');
    console.error(error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Main execution
async function main() {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    return;
  }
  
  const filePath = validateFile(options.file);
  if (!filePath) {
    process.exit(1);
  }
  
  await importExcel(filePath, options);
}

// Run the script
main().catch((error) => {
  console.error('💥 Unexpected error:');
  console.error(error);
  process.exit(1);
});