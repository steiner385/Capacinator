import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Settings as SettingsIcon, Save, Database, 
  Users, X
} from 'lucide-react';
import { api } from '../lib/api-client';

interface SystemSettings {
  defaultWorkHoursPerWeek: number;
  defaultVacationDaysPerYear: number;
  fiscalYearStartMonth: number;
  allowOverAllocation: boolean;
  maxAllocationPercentage: number;
  requireApprovalForOverrides: boolean;
  autoArchiveCompletedProjects: boolean;
  archiveAfterDays: number;
  enableEmailNotifications: boolean;
}

interface ImportSettings {
  clearExistingData: boolean;
  validateDuplicates: boolean;
  autoCreateMissingRoles: boolean;
  autoCreateMissingLocations: boolean;
  defaultProjectPriority: number;
  dateFormat: string;
}

export default function Settings() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'system' | 'import' | 'users'>('system');
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    defaultWorkHoursPerWeek: 40,
    defaultVacationDaysPerYear: 15,
    fiscalYearStartMonth: 1,
    allowOverAllocation: true,
    maxAllocationPercentage: 120,
    requireApprovalForOverrides: true,
    autoArchiveCompletedProjects: false,
    archiveAfterDays: 90,
    enableEmailNotifications: false
  });

  const [importSettings, setImportSettings] = useState<ImportSettings>({
    clearExistingData: false,
    validateDuplicates: true,
    autoCreateMissingRoles: false,
    autoCreateMissingLocations: false,
    defaultProjectPriority: 2,
    dateFormat: 'MM/DD/YYYY'
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');


  // Fetch system settings
  const { data: systemSettingsData } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const response = await api.settings.getSystemSettings();
      return response.data.data;
    },
    enabled: activeTab === 'system'
  });

  // Fetch import settings
  const { data: importSettingsData } = useQuery({
    queryKey: ['import-settings'],
    queryFn: async () => {
      const response = await api.settings.getImportSettings();
      return response.data.data;
    },
    enabled: activeTab === 'import'
  });

  // Fetch user permissions
  const { data: users } = useQuery({
    queryKey: ['users-permissions'],
    queryFn: async () => {
      const response = await api.people.list();
      return response.data.data;
    },
    enabled: activeTab === 'users'
  });

  // Update local state when API data loads
  useEffect(() => {
    if (systemSettingsData) {
      setSystemSettings(systemSettingsData);
    }
  }, [systemSettingsData]);

  useEffect(() => {
    if (importSettingsData) {
      setImportSettings(importSettingsData);
    }
  }, [importSettingsData]);

  const handleSaveSystemSettings = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      await api.settings.saveSystemSettings(systemSettings);
      setSaveMessage('System settings saved successfully!');
      
      // Invalidate and refetch settings
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    } catch (error: any) {
      console.error('Error saving system settings:', error);
      setSaveMessage(error.response?.data?.error || 'Error saving settings. Please try again.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleSaveImportSettings = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      await api.settings.saveImportSettings(importSettings);
      setSaveMessage('Import settings saved successfully!');
      
      // Invalidate and refetch settings
      queryClient.invalidateQueries({ queryKey: ['import-settings'] });
    } catch (error: any) {
      console.error('Error saving import settings:', error);
      setSaveMessage(error.response?.data?.error || 'Error saving settings. Please try again.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };


  const renderSystemSettings = () => (
    <div className="settings-section">
      <h2>System Settings</h2>
      
      <div className="settings-group">
        <h3>Work Hours & Time</h3>
        <div className="setting-item">
          <label>Default Work Hours per Week</label>
          <input
            type="number"
            value={systemSettings.defaultWorkHoursPerWeek}
            onChange={(e) => setSystemSettings({...systemSettings, defaultWorkHoursPerWeek: parseInt(e.target.value) || 40})}
            className="form-input"
            min="1"
            max="80"
          />
        </div>
        
        <div className="setting-item">
          <label>Default Vacation Days per Year</label>
          <input
            type="number"
            value={systemSettings.defaultVacationDaysPerYear}
            onChange={(e) => setSystemSettings({...systemSettings, defaultVacationDaysPerYear: parseInt(e.target.value) || 0})}
            className="form-input"
            min="0"
            max="365"
          />
        </div>
        
        <div className="setting-item">
          <label>Fiscal Year Start Month</label>
          <select
            value={systemSettings.fiscalYearStartMonth}
            onChange={(e) => setSystemSettings({...systemSettings, fiscalYearStartMonth: parseInt(e.target.value)})}
            className="form-select"
          >
            {['January', 'February', 'March', 'April', 'May', 'June', 
              'July', 'August', 'September', 'October', 'November', 'December'].map((month, index) => (
              <option key={index} value={index + 1}>{month}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="settings-group">
        <h3>Allocation Rules</h3>
        <div className="setting-item">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={systemSettings.allowOverAllocation}
              onChange={(e) => setSystemSettings({...systemSettings, allowOverAllocation: e.target.checked})}
            />
            Allow Over-allocation
          </label>
        </div>
        
        {systemSettings.allowOverAllocation && (
          <div className="setting-item">
            <label>Maximum Allocation Percentage</label>
            <input
              type="number"
              value={systemSettings.maxAllocationPercentage}
              onChange={(e) => setSystemSettings({...systemSettings, maxAllocationPercentage: parseInt(e.target.value) || 100})}
              className="form-input"
              min="100"
              max="200"
            />
          </div>
        )}
        
        <div className="setting-item">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={systemSettings.requireApprovalForOverrides}
              onChange={(e) => setSystemSettings({...systemSettings, requireApprovalForOverrides: e.target.checked})}
            />
            Require Approval for Availability Overrides
          </label>
        </div>
      </div>

      <div className="settings-group">
        <h3>Project Management</h3>
        <div className="setting-item">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={systemSettings.autoArchiveCompletedProjects}
              onChange={(e) => setSystemSettings({...systemSettings, autoArchiveCompletedProjects: e.target.checked})}
            />
            Auto-archive Completed Projects
          </label>
        </div>
        
        {systemSettings.autoArchiveCompletedProjects && (
          <div className="setting-item">
            <label>Archive After Days</label>
            <input
              type="number"
              value={systemSettings.archiveAfterDays}
              onChange={(e) => setSystemSettings({...systemSettings, archiveAfterDays: parseInt(e.target.value) || 90})}
              className="form-input"
              min="1"
              max="365"
            />
          </div>
        )}
      </div>

      <div className="settings-group">
        <h3>Notifications</h3>
        <div className="setting-item">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={systemSettings.enableEmailNotifications}
              onChange={(e) => setSystemSettings({...systemSettings, enableEmailNotifications: e.target.checked})}
              disabled
            />
            Enable Email Notifications
            <span className="help-text">Email notifications not yet implemented</span>
          </label>
        </div>
      </div>

      <div className="settings-actions">
        <button 
          className="btn btn-primary"
          onClick={handleSaveSystemSettings}
          disabled={isSaving}
        >
          <Save size={20} />
          {isSaving ? 'Saving...' : 'Save System Settings'}
        </button>
        {saveMessage && (
          <div className={`save-message ${saveMessage.includes('Error') ? 'error' : 'success'}`}>
            {saveMessage}
          </div>
        )}
      </div>
    </div>
  );

  const renderImportSettings = () => (
    <div className="settings-section">
      <h2>Import Settings</h2>
      
      <div className="settings-group">
        <h3>Import Behavior</h3>
        <div className="setting-item">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={importSettings.clearExistingData}
              onChange={(e) => setImportSettings({...importSettings, clearExistingData: e.target.checked})}
            />
            Clear Existing Data Before Import
            <span className="help-text">Warning: This will delete all existing data</span>
          </label>
        </div>
        
        <div className="setting-item">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={importSettings.validateDuplicates}
              onChange={(e) => setImportSettings({...importSettings, validateDuplicates: e.target.checked})}
            />
            Validate and Prevent Duplicates
          </label>
        </div>
      </div>

      <div className="settings-group">
        <h3>Auto-create Options</h3>
        <div className="setting-item">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={importSettings.autoCreateMissingRoles}
              onChange={(e) => setImportSettings({...importSettings, autoCreateMissingRoles: e.target.checked})}
            />
            Auto-create Missing Roles
          </label>
        </div>
        
        <div className="setting-item">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={importSettings.autoCreateMissingLocations}
              onChange={(e) => setImportSettings({...importSettings, autoCreateMissingLocations: e.target.checked})}
            />
            Auto-create Missing Locations
          </label>
        </div>
      </div>

      <div className="settings-group">
        <h3>Default Values</h3>
        <div className="setting-item">
          <label>Default Project Priority</label>
          <select
            value={importSettings.defaultProjectPriority}
            onChange={(e) => setImportSettings({...importSettings, defaultProjectPriority: parseInt(e.target.value)})}
            className="form-select"
          >
            <option value={1}>High</option>
            <option value={2}>Medium</option>
            <option value={3}>Low</option>
          </select>
        </div>
        
        <div className="setting-item">
          <label>Date Format</label>
          <select
            value={importSettings.dateFormat}
            onChange={(e) => setImportSettings({...importSettings, dateFormat: e.target.value})}
            className="form-select"
          >
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </div>
      </div>

      <div className="settings-actions">
        <button 
          className="btn btn-primary"
          onClick={handleSaveImportSettings}
          disabled={isSaving}
        >
          <Save size={20} />
          {isSaving ? 'Saving...' : 'Save Import Settings'}
        </button>
      </div>
    </div>
  );

  const renderUserPermissions = () => (
    <div className="settings-section">
      <h2>User Permissions</h2>
      
      <div className="info-message">
        <p>User permissions functionality needs backend implementation.</p>
        <p>The following features need to be developed:</p>
        <ul>
          <li>Permission management API endpoints</li>
          <li>Role-based access control</li>
          <li>User authentication system</li>
        </ul>
      </div>
      
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Can Plan For Others</th>
            <th>Can Approve Overrides</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users?.map((user: any) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.email}</td>
              <td>{user.primary_role?.name}</td>
              <td>
                <input 
                  type="checkbox" 
                  checked={user.can_plan_for_others || false}
                  disabled
                  title="Backend implementation needed"
                />
              </td>
              <td>
                <input 
                  type="checkbox" 
                  checked={user.can_approve_overrides || false}
                  disabled
                  title="Backend implementation needed"
                />
              </td>
              <td>
                <button className="btn-icon" title="Backend implementation needed" disabled>
                  <SettingsIcon size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );


  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      <div className="settings-tabs">
        <button 
          className={`tab ${activeTab === 'system' ? 'active' : ''}`}
          onClick={() => setActiveTab('system')}
        >
          <SettingsIcon size={20} />
          System
        </button>
        <button 
          className={`tab ${activeTab === 'import' ? 'active' : ''}`}
          onClick={() => setActiveTab('import')}
        >
          <Database size={20} />
          Import
        </button>
        <button 
          className={`tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={20} />
          User Permissions
        </button>
      </div>

      <div className="settings-content">
        {activeTab === 'system' && renderSystemSettings()}
        {activeTab === 'import' && renderImportSettings()}
        {activeTab === 'users' && renderUserPermissions()}
      </div>
    </div>
  );
}