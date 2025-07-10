# Excel Import Utility Design

## Overview
The Excel import utility will transform the existing Excel-based capacity planning data into our new relational database structure, handling data validation, relationship mapping, and conflict resolution.

## Import Process Flow

### 1. File Upload & Validation
- Accept .xlsx and .xls formats
- Validate file size (max 50MB)
- Check for required sheets based on original structure

### 2. Sheet Mapping
Map Excel sheets to database tables:

```javascript
const sheetMappings = {
  'Projects': {
    table: 'projects',
    columns: {
      'Projects': 'name',
      'Inc. in Demand': 'include_in_demand',
      'Priority': 'priority',
      'ProjType': 'project_type_lookup',
      'Location': 'location_lookup',
      'Data Restrictions': 'data_restrictions',
      'Description': 'description',
      'ID': 'external_id',
      'Asp. Start': 'aspiration_start',
      'Asp. Finish': 'aspiration_finish'
    }
  },
  'Roles': {
    table: 'roles',
    columns: {
      'Role Name': 'name',
      'Role ID': 'external_id',
      'Description': 'description'
    }
  },
  'Rosters': {
    table: 'people',
    columns: {
      'Person': 'name',
      'Primary Role': 'primary_role_lookup',
      'Plan Owner': 'is_plan_owner',
      'Worker Type': 'worker_type'
    }
  }
};
```

### 3. Data Transformation

#### 3.1 Date Column Handling
The date columns (24Feb6 through 25Feb25) represent:
- Weekly time periods
- Values are allocation percentages or hours

Transform into:
```javascript
// Extract date columns into time-series data
const timeSeriesData = {
  person_id: 'uuid',
  date: '2024-02-06',
  allocation_percentage: 85.5
};
```

#### 3.2 Lookup Resolution
- Project Types: Match by name, create if missing
- Locations: Match by name, create if missing  
- Roles: Match by name or ID
- People: Match by name (with duplicate handling)

#### 3.3 Standard Allocations Parsing
From "Standard Allocations" sheet:
- Extract project type from ProjectSite column
- Map role allocations by phase
- Store as templates

### 4. Import Wizard UI

```typescript
interface ImportWizardSteps {
  1: FileUpload;
  2: SheetSelection;
  3: ColumnMapping;
  4: DataPreview;
  5: ValidationResults;
  6: ImportOptions;
  7: ImportProgress;
  8: ImportSummary;
}
```

### 5. Validation Rules

#### Required Field Validation
- Projects: name, project_type, location
- People: name, primary_role
- Roles: name

#### Data Type Validation
- Dates: Parse Excel date serials
- Numbers: Handle percentages and decimals
- Booleans: Map Yes/No, True/False, 1/0

#### Business Rule Validation
- No duplicate project names within same location
- Valid date ranges (start < end)
- Allocation percentages 0-100
- Priority values 1-10

### 6. Conflict Resolution

```typescript
enum ConflictStrategy {
  SKIP = 'skip',          // Skip conflicting records
  UPDATE = 'update',      // Update existing records
  DUPLICATE = 'duplicate', // Create new with suffix
  MANUAL = 'manual'       // User decides per conflict
}
```

### 7. Import Service Architecture

```typescript
class ExcelImportService {
  async processImport(file: Buffer, options: ImportOptions) {
    // 1. Parse Excel file
    const workbook = await this.parseExcel(file);
    
    // 2. Extract and validate sheets
    const sheets = await this.validateSheets(workbook);
    
    // 3. Transform data
    const transformedData = await this.transformData(sheets);
    
    // 4. Validate business rules
    const validationResults = await this.validateData(transformedData);
    
    // 5. Import in transaction
    return await this.importData(transformedData, options);
  }
}
```

### 8. Error Handling

```typescript
interface ImportError {
  row: number;
  column: string;
  sheet: string;
  value: any;
  error: string;
  severity: 'error' | 'warning';
}
```

Display errors in a downloadable report with:
- Row/column location
- Original value
- Error description
- Suggested fix

### 9. Post-Import Processing

1. **Relationship Building**
   - Link projects to phases
   - Create default demands from standard allocations
   - Build assignment timeline

2. **Data Enrichment**
   - Calculate initial capacity metrics
   - Generate availability calendar
   - Create baseline reports

3. **Audit Trail**
   - Log import timestamp
   - Record user and options
   - Store original file reference

## Sample Import Code

```typescript
// Frontend component
const ExcelImporter: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [errors, setErrors] = useState<ImportError[]>([]);
  
  const handleImport = async () => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mapping', JSON.stringify(mapping));
    
    const response = await fetch('/api/import/excel', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    if (result.errors) {
      setErrors(result.errors);
    }
  };
};

// Backend endpoint
app.post('/api/import/excel', async (req, res) => {
  const { file } = req.files;
  const { mapping } = req.body;
  
  try {
    const result = await excelImportService.processImport(
      file.buffer,
      { mapping, strategy: ConflictStrategy.UPDATE }
    );
    
    res.json({
      success: true,
      imported: result.counts,
      errors: result.errors
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

## Testing Strategy

1. **Unit Tests**
   - Date parsing functions
   - Data transformation logic
   - Validation rules

2. **Integration Tests**
   - Full import flow
   - Database transactions
   - Error scenarios

3. **Test Files**
   - Valid complete Excel
   - Missing columns Excel
   - Invalid data Excel
   - Large file (performance)