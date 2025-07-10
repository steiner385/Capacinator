import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X } from 'lucide-react';
import { api } from '../lib/api-client';
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

export default function Import() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [clearExisting, setClearExisting] = useState(false);
  const [useV2, setUseV2] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const response = await api.import.uploadExcel(file, clearExisting, useV2);
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

  return (
    <div className="import-page">
      <div className="page-header">
        <div>
          <h1>Import Data</h1>
          <p className="text-muted">Upload Excel files to import project data</p>
        </div>
      </div>

      <div className="import-container">
        <div className="import-card">
          <div className="import-options">
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