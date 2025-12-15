import { useState, useRef, useEffect } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X, Settings, Download, FileText, Database } from 'lucide-react';
import { api } from '../lib/api-client';
import { useScenario } from '../contexts/ScenarioContext';
import { useBookmarkableTabs } from '../hooks/useBookmarkableTabs';
import { UnifiedTabComponent } from '../components/ui/UnifiedTabComponent';
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

// Define import/export tabs configuration
const importExportTabs = [
  { id: 'import', label: 'Import', icon: Upload },
  { id: 'export', label: 'Export', icon: Download }
];

function ImportUnified() {
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
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [showTemplateOptions, setShowTemplateOptions] = useState(false);
  
  const { currentScenario, scenarios } = useScenario();

  // Use bookmarkable tabs for import/export
  const { activeTab, setActiveTab, isActiveTab } = useBookmarkableTabs({
    tabs: importExportTabs,
    defaultTab: 'import'
  });

  // Update document title based on active tab
  useEffect(() => {
    const title = activeTab === 'export' ? 'Export Data' : 'Import Data';
    document.title = `${title} - Capacinator`;
    
    // Also update the page on initial load to reflect both functions
    if (!activeTab) {
      document.title = 'Import & Export - Capacinator';
    }
  }, [activeTab]);

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

  const renderImportTab = () => (
    <div className="page-container">
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
                  <h4>Import Configuration</h4>
                  <button
                    type="button"
                    className="btn btn-sm btn-ghost"
                    onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                    disabled={uploading}
                  >
                    <Settings size={16} />
                    {showAdvancedSettings ? 'Hide Advanced' : 'Advanced Settings'}
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
                            defaultProjectPriority: parseInt(e.target.value, 10)
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

        <div className="help-section" role="complementary" aria-labelledby="help-section-title">
          <div className="help-header">
            <h3 id="help-section-title">Need Help Getting Started?</h3>
            <p className="text-muted">Learn about the import format and download templates from the Export tab</p>
          </div>
          
          <div className="help-cards">
            <div className="help-card" role="article" aria-labelledby="template-structure-title">
              <div className="help-card-icon" aria-hidden="true">
                📄
              </div>
              <div className="help-card-content">
                <h4 id="template-structure-title">Template Structure</h4>
                <p>Excel files should contain these key sheets:</p>
                <div className="sheet-list" role="list">
                  <div className="sheet-item essential" role="listitem">
                    <span className="sheet-badge" aria-label="Required sheet">Required</span>
                    <strong>Projects</strong> - Project details with type, location, priority
                  </div>
                  <div className="sheet-item essential" role="listitem">
                    <span className="sheet-badge" aria-label="Required sheet">Required</span>
                    <strong>Roster</strong> - People with roles and availability
                  </div>
                  <div className="sheet-item" role="listitem">
                    <span className="sheet-badge" aria-label="Optional sheet">Optional</span>
                    <strong>Assignments</strong> - Person assignments by project
                  </div>
                  <div className="sheet-item" role="listitem">
                    <span className="sheet-badge" aria-label="Optional sheet">Optional</span>
                    <strong>Project Roadmap</strong> - Phase timelines
                  </div>
                </div>
              </div>
            </div>
            
            <div className="help-card" role="article" aria-labelledby="import-tips-title">
              <div className="help-card-icon" aria-hidden="true">
                ⚙️
              </div>
              <div className="help-card-content">
                <h4 id="import-tips-title">Import Tips</h4>
                <div className="tip-list" role="list">
                  <div className="tip-item" role="listitem">
                    <span aria-hidden="true">💡</span> Use "Clear existing data" for fresh starts
                  </div>
                  <div className="tip-item" role="listitem">
                    <span aria-hidden="true">📅</span> Enable "fiscal weeks" format for new templates
                  </div>
                  <div className="tip-item" role="listitem">
                    <span aria-hidden="true">🔍</span> Review settings before importing large datasets
                  </div>
                  <div className="tip-item" role="listitem">
                    <span aria-hidden="true">💾</span> Always backup your current scenario first
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderExportTab = () => (
    <div className="page-container">
      <div className="import-container">
        <div className="import-card export-section">
          <div className="card-header">
            <h2>Export Data</h2>
            <p className="text-muted">Export scenario data or download blank templates</p>
          </div>

          <div className="export-options">
            {/* Export Scenario Data Section */}
            <div className="export-type-card">
              <div className="export-option">
                <Database size={28} />
                <div className="export-option-content">
                  <h3>Export Scenario Data</h3>
                  <p>Export current scenario data in re-importable Excel format with all your project assignments and timelines</p>
                </div>
              </div>
              
              <div className="export-controls">
                <div className="export-controls-grid">
                  <div className="controls-section">
                    <div className="controls-section-title">Scenario Selection</div>
                    <div className="form-group">
                      <label>Choose Scenario to Export:</label>
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
                  </div>

                  <div className="controls-section">
                    <div className="controls-section-header">
                      <div className="controls-section-title">Export Options</div>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => setShowExportOptions(!showExportOptions)}
                        disabled={exportingScenario}
                        aria-expanded={showExportOptions}
                        aria-controls="export-options-content"
                        aria-label={showExportOptions ? 'Hide export options' : 'Show export options'}
                      >
                        <Settings size={14} />
                        {showExportOptions ? 'Hide Options' : 'Show Options'}
                      </button>
                    </div>
                    
                    {showExportOptions && (
                      <div 
                        className="progressive-disclosure-content"
                        id="export-options-content"
                        role="region"
                        aria-labelledby="export-options-title"
                      >
                        <fieldset className="checkbox-group">
                          <legend className="sr-only">Export data options</legend>
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={exportIncludeAssignments}
                              onChange={(e) => setExportIncludeAssignments(e.target.checked)}
                              disabled={exportingScenario}
                              aria-describedby="assignments-help"
                            />
                            <span>Include Project Assignments</span>
                          </label>
                          <label className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={exportIncludePhases}
                              onChange={(e) => setExportIncludePhases(e.target.checked)}
                              disabled={exportingScenario}
                              aria-describedby="phases-help"
                            />
                            <span>Include Phase Timelines</span>
                          </label>
                        </fieldset>
                        <div className="options-summary" role="note">
                          <small className="text-muted" id="assignments-help phases-help">
                            💡 Both options are recommended for complete data export
                          </small>
                        </div>
                      </div>
                    )}
                    
                    {!showExportOptions && (
                      <div className="options-preview">
                        <small className="text-muted">
                          📋 Default: Including assignments & timelines
                        </small>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  className="btn btn-primary export-action-button"
                  onClick={handleExportScenario}
                  disabled={exportingScenario || exportingTemplate || (!exportScenarioId && !currentScenario)}
                  aria-describedby="export-scenario-status"
                  aria-label={exportingScenario ? 'Exporting scenario data, please wait' : 'Export selected scenario data as Excel file'}
                >
                  <Download size={18} aria-hidden="true" />
                  {exportingScenario ? 'Exporting Scenario...' : 'Export Scenario Data'}
                </button>
                
                <div id="export-scenario-status" className="sr-only">
                  {exportingScenario ? 'Export in progress, please wait' : 
                   (!exportScenarioId && !currentScenario) ? 'Please select a scenario to export' : 
                   'Ready to export scenario data'}
                </div>
              </div>
            </div>

            <div className="export-divider" data-text="OR"></div>

            {/* Download Template Section */}
            <div className="export-type-card">
              <div className="export-option">
                <FileText size={28} />
                <div className="export-option-content">
                  <h3>Download Blank Template</h3>
                  <p>Download enhanced Excel template with instructions, formatting, and sample data to get started quickly</p>
                </div>
              </div>
              
              <div className="export-controls">
                <div className="export-controls-grid">
                  <div className="controls-section">
                    <div className="controls-section-header">
                      <div className="controls-section-title">Template Configuration</div>
                      <button
                        type="button"
                        className="btn btn-sm btn-ghost"
                        onClick={() => setShowTemplateOptions(!showTemplateOptions)}
                        disabled={exportingTemplate}
                        aria-expanded={showTemplateOptions}
                        aria-controls="template-options-content"
                        aria-label={showTemplateOptions ? 'Hide template options' : 'Show template customization options'}
                      >
                        <Settings size={14} />
                        {showTemplateOptions ? 'Hide Options' : 'Customize'}
                      </button>
                    </div>
                    
                    {showTemplateOptions && (
                      <div 
                        className="progressive-disclosure-content"
                        id="template-options-content"
                        role="region"
                        aria-labelledby="template-options-title"
                      >
                        <div className="form-group">
                          <label htmlFor="template-type-select">Template Type:</label>
                          <select
                            id="template-type-select"
                            value={templateType}
                            onChange={(e) => setTemplateType(e.target.value)}
                            className="form-select"
                            disabled={exportingTemplate}
                            aria-describedby="template-type-help"
                          >
                            <option value="complete">Complete Template (All Sheets)</option>
                            <option value="basic">Basic Template (Core Sheets Only)</option>
                            <option value="minimal">Minimal Template (Projects & People)</option>
                          </select>
                          <div className="form-help">
                            <small className="text-muted" id="template-type-help">
                              {templateType === 'complete' && '📊 Includes all sheets with sample data and instructions'}
                              {templateType === 'basic' && '📋 Core functionality sheets without extra features'}
                              {templateType === 'minimal' && '⚡ Just the essentials - projects and people only'}
                            </small>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {!showTemplateOptions && (
                      <div className="options-preview">
                        <small className="text-muted">
                          📋 Using: {templateType === 'complete' ? 'Complete Template' : templateType === 'basic' ? 'Basic Template' : 'Minimal Template'}
                        </small>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  className="btn btn-outline export-action-button"
                  onClick={handleExportTemplate}
                  disabled={exportingTemplate}
                  aria-describedby="export-template-status"
                  aria-label={exportingTemplate ? 'Generating template, please wait' : 'Download blank Excel template'}
                >
                  <Download size={18} aria-hidden="true" />
                  {exportingTemplate ? 'Generating Template...' : 'Download Template'}
                </button>
                
                <div id="export-template-status" className="sr-only">
                  {exportingTemplate ? 'Template generation in progress, please wait' : 'Ready to download template'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <UnifiedTabComponent
      tabs={importExportTabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      variant="primary"
      size="md"
      orientation="horizontal"
      ariaLabel="Import & Export Data - Use tabs to switch between importing and exporting data"
    >
      {activeTab === 'import' && renderImportTab()}
      {activeTab === 'export' && renderExportTab()}
    </UnifiedTabComponent>
  );
}

export default ImportUnified;