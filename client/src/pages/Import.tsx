import { useState, useRef, useEffect } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X, Settings, Download, FileText, Database } from 'lucide-react';
import { api } from '../lib/api-client';
import { useScenario } from '../contexts/ScenarioContext';
import './Import.css';

interface ImportResult {
  success: boolean;
  message: string;
  imported?: {
    locations: number;
    projectTypes: number;
    phases: number;
    roles: number;
    people: number;
    projects: number;
    standardAllocations: number;
    assignments: number;
    phaseTimelines?: number;
    demands?: number;
    availabilityOverrides?: number;
  };
  errors?: string[];
  warnings?: string[];
}

interface ImportSettings {
  clearExistingData: boolean;
  validateDuplicates: boolean;
  autoCreateMissingRoles: boolean;
  autoCreateMissingLocations: boolean;
  defaultProjectPriority: number;
  dateFormat: string;
}

export default function Import() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [clearExisting, setClearExisting] = useState(false);
  const [useV2, setUseV2] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importSettings, setImportSettings] = useState<ImportSettings | null>(null);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [settingsOverrides, setSettingsOverrides] = useState<Partial<ImportSettings>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export state
  const [exportingScenario, setExportingScenario] = useState(false);
  const [exportingTemplate, setExportingTemplate] = useState(false);
  const [exportScenarioId, setExportScenarioId] = useState<string>('');
  const [exportIncludeAssignments, setExportIncludeAssignments] = useState(true);
  const [exportIncludePhases, setExportIncludePhases] = useState(true);
  const [templateType, setTemplateType] = useState('complete');
  
  const { currentScenario, scenarios } = useScenario();

  // Load import settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.import.getSettings();
        setImportSettings(response.data.data);
        // Set initial values based on saved settings
        setClearExisting(response.data.data.clearExistingData);
      } catch (error) {
        console.error('Failed to load import settings:', error);
      }
    };

    loadSettings();
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')) {
        setFile(selectedFile);
        setResult(null);
      } else {
        alert('Please select a valid Excel file (.xlsx or .xls)');
      }
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls'))) {
      setFile(droppedFile);
      setResult(null);
    } else {
      alert('Please drop a valid Excel file (.xlsx or .xls)');
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setResult(null);

    try {
      const uploadOptions = {
        clearExisting,
        useV2,
        ...settingsOverrides
      };

      const response = await api.import.uploadExcel(file, uploadOptions);
      setResult(response.data as ImportResult);
      if (response.data.success) {
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: 'Import failed',
        errors: [error.response?.data?.message || error.message || 'Unknown error occurred']
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportScenario = async () => {
    const scenarioToExport = exportScenarioId || currentScenario?.id;
    
    if (!scenarioToExport) {
      alert('Please select a scenario to export');
      return;
    }

    setExportingScenario(true);
    try {
      console.log('Exporting scenario:', scenarioToExport);
      
      const response = await api.import.exportScenario(scenarioToExport, {
        includeAssignments: exportIncludeAssignments,
        includePhases: exportIncludePhases,
      });

      // Create blob and download link
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from response headers or create default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'scenario_export.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(url);
      
      console.log('Export completed successfully');
    } catch (error: any) {
      console.error('Export failed:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers
      });
      
      let message = 'Unknown error occurred';
      
      if (error.response) {
        // Server responded with error status
        if (error.response.status === 404) {
          message = 'Export endpoint not found. Please check if the server is running properly.';
        } else if (error.response.status === 500) {
          message = 'Server error occurred during export. Please check server logs.';
        } else if (error.response.data?.message) {
          message = error.response.data.message;
        } else {
          message = `Server error: ${error.response.status} ${error.response.statusText}`;
        }
      } else if (error.request) {
        // Request was made but no response received
        message = 'No response from server. Please check your connection and that the server is running.';
      } else {
        // Something else happened
        message = error.message || 'Unknown error occurred';
      }
      
      alert('Export failed: ' + message);
    } finally {
      setExportingScenario(false);
    }
  };

  const handleExportTemplate = async () => {
    setExportingTemplate(true);
    try {
      console.log('Exporting template:', templateType);
      
      const response = await api.import.exportTemplate({
        templateType,
        includeAssignments: exportIncludeAssignments,
        includePhases: exportIncludePhases,
      });

      // Create blob and download link
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from response headers or create default
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'capacinator_template.xlsx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(url);
      
      console.log('Template export completed successfully');
    } catch (error: any) {
      console.error('Template export failed:', error);
      const message = error.response?.data?.message || error.message || 'Unknown error occurred';
      alert('Template export failed: ' + message);
    } finally {
      setExportingTemplate(false);
    }
  };

  // Set default export scenario when current scenario changes
  useEffect(() => {
    if (currentScenario && !exportScenarioId) {
      setExportScenarioId(currentScenario.id);
    }
  }, [currentScenario, exportScenarioId]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Import & Export Data</h1>
          <p className="text-muted">Import Excel files or export current scenario data</p>
        </div>
      </div>

      <div className="import-container">
        <div className="import-card">
          <div className="import-options">
            <div className="basic-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={clearExisting}
                  onChange={(e) => setClearExisting(e.target.checked)}
                  disabled={uploading}
                />
                <span>Clear existing data before import</span>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={useV2}
                  onChange={(e) => setUseV2(e.target.checked)}
                  disabled={uploading}
                />
                <span>Use new template format (fiscal weeks)</span>
              </label>
            </div>

            {importSettings && (
              <div className="settings-preview">
                <div className="settings-header">
                  <h4>Import Settings</h4>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                    disabled={uploading}
                  >
                    <Settings size={16} />
                    {showAdvancedSettings ? 'Hide' : 'Show'} Advanced Settings
                  </button>
                </div>

                <div className="settings-summary">
                  <span>Validate duplicates: {importSettings.validateDuplicates ? 'Yes' : 'No'}</span>
                  <span>Auto-create missing roles: {importSettings.autoCreateMissingRoles ? 'Yes' : 'No'}</span>
                  <span>Auto-create missing locations: {importSettings.autoCreateMissingLocations ? 'Yes' : 'No'}</span>
                  <span>Default project priority: {importSettings.defaultProjectPriority === 1 ? 'High' : importSettings.defaultProjectPriority === 2 ? 'Medium' : 'Low'}</span>
                  <span>Date format: {importSettings.dateFormat}</span>
                </div>

                {showAdvancedSettings && (
                  <div className="advanced-settings">
                    <h5>Override Settings for This Import</h5>
                    <div className="settings-grid">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={settingsOverrides.validateDuplicates ?? importSettings.validateDuplicates}
                          onChange={(e) => setSettingsOverrides({
                            ...settingsOverrides,
                            validateDuplicates: e.target.checked
                          })}
                          disabled={uploading}
                        />
                        <span>Validate duplicates</span>
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={settingsOverrides.autoCreateMissingRoles ?? importSettings.autoCreateMissingRoles}
                          onChange={(e) => setSettingsOverrides({
                            ...settingsOverrides,
                            autoCreateMissingRoles: e.target.checked
                          })}
                          disabled={uploading}
                        />
                        <span>Auto-create missing roles</span>
                      </label>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={settingsOverrides.autoCreateMissingLocations ?? importSettings.autoCreateMissingLocations}
                          onChange={(e) => setSettingsOverrides({
                            ...settingsOverrides,
                            autoCreateMissingLocations: e.target.checked
                          })}
                          disabled={uploading}
                        />
                        <span>Auto-create missing locations</span>
                      </label>
                      <div className="form-group">
                        <label>Default Project Priority:</label>
                        <select
                          value={settingsOverrides.defaultProjectPriority ?? importSettings.defaultProjectPriority}
                          onChange={(e) => setSettingsOverrides({
                            ...settingsOverrides,
                            defaultProjectPriority: parseInt(e.target.value)
                          })}
                          disabled={uploading}
                          className="form-select"
                        >
                          <option value={1}>High</option>
                          <option value={2}>Medium</option>
                          <option value={3}>Low</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Date Format:</label>
                        <select
                          value={settingsOverrides.dateFormat ?? importSettings.dateFormat}
                          onChange={(e) => setSettingsOverrides({
                            ...settingsOverrides,
                            dateFormat: e.target.value
                          })}
                          disabled={uploading}
                          className="form-select"
                        >
                          <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                          <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                          <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {!file && (
            <div
              className="upload-area"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={48} />
              <h3>Drop Excel file here</h3>
              <p>or click to browse</p>
              <p className="text-sm text-muted">Supports .xlsx and .xls files</p>
            </div>
          )}

          {file && (
            <div className="file-selected">
              <FileSpreadsheet size={48} />
              <div className="file-info">
                <h3>{file.name}</h3>
                <p className="text-sm text-muted">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button
                className="btn btn-icon btn-sm"
                onClick={handleRemoveFile}
                disabled={uploading}
              >
                <X size={16} />
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {file && (
            <button
              className="btn btn-primary upload-btn"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload and Import'}
            </button>
          )}
        </div>

        {result && (
          <div className={`import-result ${result.success ? 'success' : 'error'}`}>
            <div className="result-header">
              {result.success ? (
                <CheckCircle size={24} className="result-icon" />
              ) : (
                <AlertCircle size={24} className="result-icon" />
              )}
              <h3>{result.message || (result.success ? 'Import Successful' : 'Import Failed')}</h3>
            </div>

            {result.imported && (
              <div className="import-stats">
                <h4>Imported Records:</h4>
                <div className="stats-grid">
                  {Object.entries(result.imported).map(([key, value]) => (
                    <div key={key} className="stat-item">
                      <span className="stat-label">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                      <span className="stat-value">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.errors && result.errors.length > 0 && (
              <div className="result-errors">
                <h4>Errors:</h4>
                <ul>
                  {result.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.warnings && result.warnings.length > 0 && (
              <div className="result-warnings">
                <h4>Warnings:</h4>
                <ul>
                  {result.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Export Section */}
        <div className="import-card export-section">
          <div className="card-header">
            <h2>Export Data</h2>
            <p className="text-muted">Export scenario data or download blank templates</p>
          </div>

          <div className="export-options">
            <div className="export-type-selector">
              <div className="export-option">
                <Database size={24} />
                <div>
                  <h3>Export Scenario Data</h3>
                  <p>Export current scenario data in re-importable Excel format</p>
                </div>
              </div>
              
              <div className="export-controls">
                <div className="form-group">
                  <label>Export Scenario:</label>
                  <select
                    value={exportScenarioId}
                    onChange={(e) => setExportScenarioId(e.target.value)}
                    className="form-select"
                    disabled={exportingScenario || exportingTemplate}
                  >
                    <option value="">
                      {currentScenario ? `Current: ${currentScenario.name} (${currentScenario.scenario_type})` : 'Loading scenarios...'}
                    </option>
                    {scenarios.map(scenario => (
                      <option key={scenario.id} value={scenario.id}>
                        {scenario.name} ({scenario.scenario_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={exportIncludeAssignments}
                      onChange={(e) => setExportIncludeAssignments(e.target.checked)}
                      disabled={exportingScenario}
                    />
                    <span>Include Project Assignments</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={exportIncludePhases}
                      onChange={(e) => setExportIncludePhases(e.target.checked)}
                      disabled={exportingScenario}
                    />
                    <span>Include Phase Timelines</span>
                  </label>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handleExportScenario}
                  disabled={exportingScenario || exportingTemplate || (!exportScenarioId && !currentScenario && !scenarios.length)}
                >
                  <Download size={16} />
                  {exportingScenario ? 'Exporting...' : 'Export Scenario Data'}
                </button>
              </div>
            </div>

            <div className="export-divider">OR</div>

            <div className="export-option">
              <FileText size={24} />
              <div>
                <h3>Download Blank Template</h3>
                <p>Download enhanced template with instructions and formatting</p>
              </div>
              
              <div className="export-controls">
                <div className="form-group">
                  <label>Template Type:</label>
                  <select
                    value={templateType}
                    onChange={(e) => setTemplateType(e.target.value)}
                    className="form-select"
                    disabled={exportingTemplate}
                  >
                    <option value="complete">Complete Template (All Sheets)</option>
                    <option value="basic">Basic Template (Core Sheets Only)</option>
                    <option value="minimal">Minimal Template (Projects & People)</option>
                  </select>
                </div>

                <button
                  className="btn btn-outline"
                  onClick={handleExportTemplate}
                  disabled={exportingTemplate}
                >
                  <Download size={16} />
                  {exportingTemplate ? 'Generating...' : 'Download Template'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="template-info">
          <h3>Template Format</h3>
          <p>Your Excel file should contain the following sheets:</p>
          <ul>
            <li><strong>Project Types</strong> - List of project types</li>
            <li><strong>Roles</strong> - Roles with Plan Owner, CW Option, and Data Access</li>
            <li><strong>Roster</strong> - People with roles and availability by fiscal week</li>
            <li><strong>Projects</strong> - Projects with type, location, and priority</li>
            <li><strong>Project Roadmap</strong> - Phase timeline by fiscal week</li>
            <li><strong>Resource Templates</strong> - Role allocations by project type and phase</li>
            <li><strong>Project Demand</strong> - Demand hours by role and fiscal week</li>
            <li><strong>Project Assignments</strong> - Person assignments by project and fiscal week</li>
          </ul>
        </div>
      </div>
    </div>
  );
}