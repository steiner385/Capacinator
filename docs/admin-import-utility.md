# Excel Import Utility - Administrative Guide

## Overview

The Excel import functionality has been moved from the main UI to a dedicated administrative utility to streamline the user experience. This guide covers how to use the command-line import utility for administrative purposes.

## Quick Start

```bash
# Basic import
npm run import:excel -- --file=data.xlsx

# Import with options
npm run import:excel -- --file=data.xlsx --clear --v2 --auto-roles
```

## Installation Requirements

- Node.js (latest LTS version recommended)
- npm dependencies installed (`npm install`)
- Valid Excel file in supported format

## Usage

### Command Syntax

```bash
npm run import:excel -- --file=<path> [options]
```

or directly:

```bash
node scripts/import-excel.js --file=<path> [options]
```

### Required Parameters

- `--file=<path>`: Path to the Excel file to import

### Optional Flags

- `--clear`: Clear existing data before import
- `--v2`: Use V2 template format (fiscal weeks)
- `--validate-duplicates`: Enable duplicate validation (default: true)
- `--auto-roles`: Auto-create missing roles
- `--auto-locations`: Auto-create missing locations
- `--help`: Show help message

### Optional Parameters

- `--priority=<1-3>`: Default project priority
  - 1 = High
  - 2 = Medium (default)
  - 3 = Low
- `--date-format=<format>`: Date format for parsing
  - `MM/DD/YYYY` (default)
  - `DD/MM/YYYY`
  - `YYYY-MM-DD`

## Examples

### Basic Import
```bash
npm run import:excel -- --file=project-data.xlsx
```

### Full Replace Import
```bash
npm run import:excel -- --file=new-data.xlsx --clear --v2
```

### Import with Auto-Creation
```bash
npm run import:excel -- --file=data.xlsx --auto-roles --auto-locations --priority=1
```

### Custom Date Format
```bash
npm run import:excel -- --file=european-data.xlsx --date-format=DD/MM/YYYY
```

## Excel Template Format

Your Excel file must contain the following sheets:

### Required Sheets

1. **Project Types**
   - List of project types used in the system

2. **Roles**
   - Roles with Plan Owner, CW Option, and Data Access flags

3. **Roster**
   - People with roles and availability by fiscal week

4. **Projects**
   - Projects with type, location, and priority information

5. **Project Roadmap**
   - Phase timeline by fiscal week

6. **Resource Templates**
   - Role allocations by project type and phase

7. **Project Demand**
   - Demand hours by role and fiscal week

8. **Project Assignments**
   - Person assignments by project and fiscal week

### Template Versions

- **V1 (Standard)**: Traditional date-based templates
- **V2 (Fiscal Weeks)**: Uses fiscal week numbering system (recommended)

## Import Process

1. **File Validation**: Checks file format and accessibility
2. **Data Parsing**: Reads and validates Excel sheet structure
3. **Database Preparation**: Optionally clears existing data
4. **Data Import**: Imports data in proper dependency order
5. **Validation**: Checks for duplicates and missing references
6. **Result Report**: Shows import statistics and any warnings/errors

## Error Handling

The utility provides detailed error reporting:

- **File Errors**: Invalid file format, missing file, access issues
- **Structure Errors**: Missing required sheets, invalid column headers
- **Data Errors**: Invalid data types, missing required fields
- **Validation Errors**: Duplicate entries, missing references

## Output

Success output includes:
- Import statistics (records imported by type)
- Warnings for non-critical issues
- Processing time and status

Error output includes:
- Detailed error messages
- Line numbers for data issues
- Suggestions for fixes

## Security Considerations

- This utility has direct database access
- Always backup data before running with `--clear` option
- Validate file contents before import
- Restrict access to this utility to authorized administrators only

## Troubleshooting

### Common Issues

1. **Module Not Found**
   ```bash
   npm install
   ```

2. **Permission Denied**
   ```bash
   chmod +x scripts/import-excel.sh
   ```

3. **Invalid File Format**
   - Ensure file has .xlsx or .xls extension
   - Verify file is not corrupted
   - Check that all required sheets exist

4. **Database Connection Issues**
   - Verify database is running
   - Check environment variables
   - Ensure proper database permissions

### Getting Help

```bash
npm run import:excel:help
```

## Migration from UI Import

If you previously used the web UI for imports:

1. The same Excel template format is supported
2. All previous import options are available via command line flags
3. Import settings from the Settings page are used as defaults
4. Results format is similar but displayed in terminal

## Performance Notes

- Large files (>50MB) may take several minutes to process
- Use `--clear` option carefully as it removes all existing data
- V2 format is generally faster for large datasets
- Consider running imports during low-usage periods

## Support

For issues with the import utility:

1. Check this documentation
2. Run with `--help` for command syntax
3. Review error messages for specific guidance
4. Contact system administrators for database-related issues