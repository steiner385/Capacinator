import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Settings as SettingsIcon, Save, Database,
  Users, Palette
} from 'lucide-react';
import { api } from '../lib/api-client';
import { queryKeys } from '../lib/queryKeys';
import { useTheme } from '../contexts/ThemeContext';
import { useBookmarkableTabs } from '../hooks/useBookmarkableTabs';
import { UnifiedTabComponent } from '../components/ui/UnifiedTabComponent';

interface SystemSettings {
  defaultWorkHoursPerWeek: number;
  defaultVacationDaysPerYear: number;
  fiscalYearStartMonth: number;
  allowOverAllocation: boolean;
  maxAllocationPercentage: number;
  requireApprovalForOverrides: boolean;
}

interface ImportSettings {
  clearExistingData: boolean;
  validateDuplicates: boolean;
  autoCreateMissingRoles: boolean;
  autoCreateMissingLocations: boolean;
  defaultProjectPriority: number;
  dateFormat: string;
}

interface UserRole {
  id: string;
  name: string;
  description: string;
  priority: number;
  is_system_admin: boolean;
}

interface Permission {
  id: string;
  name: string;
  description: string;
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  role_name?: string;
  primary_role_name?: string;
  is_system_admin: boolean;
  permission_overrides: number;
  last_login?: string;
  is_active: boolean;
}

// Define settings tabs configuration
const settingsTabs = [
  { id: 'system', label: 'System', icon: SettingsIcon },
  { id: 'import', label: 'Import', icon: Database },
  { id: 'users', label: 'User Permissions', icon: Users },
  { id: 'appearance', label: 'Appearance', icon: Palette }
];

export default function Settings() {
  const queryClient = useQueryClient();
  const { theme, toggleTheme } = useTheme();
  
  // Use bookmarkable tabs for settings
  const { activeTab, setActiveTab } = useBookmarkableTabs({
    tabs: settingsTabs,
    defaultTab: 'system'
  });
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    defaultWorkHoursPerWeek: 40,
    defaultVacationDaysPerYear: 15,
    fiscalYearStartMonth: 1,
    allowOverAllocation: true,
    maxAllocationPercentage: 120,
    requireApprovalForOverrides: true,
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
    queryKey: queryKeys.settings.system(),
    queryFn: async () => {
      const response = await api.settings.getSystemSettings();
      return response.data.data;
    },
    enabled: activeTab === 'system'
  });

  // Fetch import settings
  const { data: importSettingsData } = useQuery({
    queryKey: queryKeys.settings.import(),
    queryFn: async () => {
      const response = await api.settings.getImportSettings();
      return response.data.data;
    },
    enabled: activeTab === 'import'
  });

  // Fetch user permissions
  const { data: users } = useQuery({
    queryKey: queryKeys.userPermissions.users(),
    queryFn: async () => {
      const response = await api.userPermissions.getUsersList();
      return response.data.data;
    },
    enabled: activeTab === 'users'
  });

  // Fetch user roles
  const { data: userRoles } = useQuery({
    queryKey: queryKeys.userPermissions.roles(),
    queryFn: async () => {
      const response = await api.userPermissions.getUserRoles();
      return response.data.data;
    },
    enabled: activeTab === 'users'
  });

  // Fetch system permissions
  const { data: systemPermissions } = useQuery({
    queryKey: queryKeys.userPermissions.systemPermissions(),
    queryFn: async () => {
      const response = await api.userPermissions.getSystemPermissions();
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
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.system() });
    } catch (error: unknown) {
      console.error('Error saving system settings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error saving settings. Please try again.';
      const axiosError = error as { response?: { data?: { error?: string } } };
      setSaveMessage(axiosError?.response?.data?.error || errorMessage);
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
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.import() });
    } catch (error: unknown) {
      console.error('Error saving import settings:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error saving settings. Please try again.';
      const axiosError = error as { response?: { data?: { error?: string } } };
      setSaveMessage(axiosError?.response?.data?.error || errorMessage);
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };


  const renderSystemSettings = () => (
    <div className="settings-section">
      <h2>System Settings</h2>
      
      <div className="settings-grid">
        <div className="settings-group">
          <h3>⏰ Work Hours & Time</h3>
          <div className="form-grid two-column">
            <div className="setting-item">
              <label>Default Work Hours per Week</label>
              <input
                type="number"
                value={systemSettings.defaultWorkHoursPerWeek}
                onChange={(e) => setSystemSettings({...systemSettings, defaultWorkHoursPerWeek: parseInt(e.target.value, 10) || 40})}
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
                onChange={(e) => setSystemSettings({...systemSettings, defaultVacationDaysPerYear: parseInt(e.target.value, 10) || 0})}
                className="form-input"
                min="0"
                max="365"
              />
            </div>
          </div>
          
          <div className="setting-item">
            <label>Fiscal Year Start Month</label>
            <select
              value={systemSettings.fiscalYearStartMonth}
              onChange={(e) => setSystemSettings({...systemSettings, fiscalYearStartMonth: parseInt(e.target.value, 10)})}
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
          <h3>📊 Allocation Rules</h3>
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
                onChange={(e) => setSystemSettings({...systemSettings, maxAllocationPercentage: parseInt(e.target.value, 10) || 100})}
                className="form-input"
                min="100"
                max="200"
              />
              <div className="settings-alert info">
                <span>💡 Allows team members to be allocated above 100% capacity</span>
              </div>
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
      </div>

      <div className="settings-grid">

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
      
      <div className="settings-grid">
        <div className="settings-group">
          <h3>📥 Import Behavior</h3>
          <div className="setting-item">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={importSettings.clearExistingData}
                onChange={(e) => setImportSettings({...importSettings, clearExistingData: e.target.checked})}
              />
              Clear Existing Data Before Import
            </label>
            {importSettings.clearExistingData && (
              <div className="settings-alert warning">
                <span>⚠️ Warning: This will permanently delete all existing data</span>
              </div>
            )}
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
            <div className="settings-alert info">
              <span>✅ Recommended: Helps maintain data integrity during imports</span>
            </div>
          </div>
        </div>

        <div className="settings-group">
          <h3>🔧 Auto-create Options</h3>
          <div className="setting-item">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={importSettings.autoCreateMissingRoles}
                onChange={(e) => setImportSettings({...importSettings, autoCreateMissingRoles: e.target.checked})}
              />
              Auto-create Missing Roles
            </label>
            <div className="settings-alert info">
              <span>🎭 Creates new roles automatically when they don't exist</span>
            </div>
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
            <div className="settings-alert info">
              <span>📍 Creates new locations automatically when they don't exist</span>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-grid single-column">
        <div className="settings-group">
          <h3>⚙️ Default Values</h3>
          <div className="form-grid two-column">
            <div className="setting-item">
              <label>Default Project Priority</label>
              <select
                value={importSettings.defaultProjectPriority}
                onChange={(e) => setImportSettings({...importSettings, defaultProjectPriority: parseInt(e.target.value, 10)})}
                className="form-select"
              >
                <option value={1}>🔴 High</option>
                <option value={2}>🟡 Medium</option>
                <option value={3}>🟢 Low</option>
              </select>
            </div>
            
            <div className="setting-item">
              <label>Date Format</label>
              <select
                value={importSettings.dateFormat}
                onChange={(e) => setImportSettings({...importSettings, dateFormat: e.target.value})}
                className="form-select"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (UK/EU)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
              </select>
            </div>
          </div>
          <div className="settings-alert info">
            <span>📅 Used for imported projects when no specific date format is detected</span>
          </div>
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
        {saveMessage && (
          <div className={`save-message ${saveMessage.includes('Error') ? 'error' : 'success'}`}>
            {saveMessage}
          </div>
        )}
      </div>
    </div>
  );

  const renderUserPermissions = () => (
    <div className="settings-section">
      <h2>User Permissions</h2>
      
      <div className="settings-alert info">
        <span>🛡️ Role-based access control system with individual permission overrides and system administrator privileges</span>
      </div>
      
      <div className="settings-grid single-column">
        <div className="settings-group">
          <h3>👥 User Roles</h3>
          {userRoles && userRoles.length > 0 ? (
            <div className="roles-grid">
              {userRoles.map((role: UserRole) => (
                <div key={role.id} className="role-card">
                  <h4>🎭 {role.name}</h4>
                  <p>{role.description}</p>
                  <div className="role-info">
                    <span className="priority">⚡ Priority: {role.priority}</span>
                    {role.is_system_admin && <span className="admin-badge">👑 System Admin</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="settings-alert warning">
              <span>⚠️ No user roles configured. Configure roles to manage user permissions.</span>
            </div>
          )}
        </div>

        <div className="settings-group">
          <h3>🔑 System Permissions</h3>
          {systemPermissions?.permissionsByCategory && Object.keys(systemPermissions.permissionsByCategory).length > 0 ? (
            <div className="permissions-grid">
              {Object.entries(systemPermissions.permissionsByCategory).map(([category, permissions]: [string, Permission[]]) => (
                <div key={category} className="permission-category">
                  <h4>📋 {category.charAt(0).toUpperCase() + category.slice(1)}</h4>
                  <div className="permissions-list">
                    {permissions.map((permission: Permission) => (
                      <div key={permission.id} className="permission-item">
                        <strong>{permission.name}</strong>
                        <span>{permission.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="settings-alert info">
              <span>🔧 System permissions are loading or not yet configured</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="settings-group">
        <h3>👤 User Management</h3>
        {users && users.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>User Role</th>
                  <th>Primary Role</th>
                  <th>System Admin</th>
                  <th>Permission Overrides</th>
                  <th>Last Login</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user: UserInfo) => (
                  <tr key={user.id}>
                    <td>
                      <div className="person-name">
                        <span className="name">{user.name}</span>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>{user.role_name || <span style={{color: 'var(--text-secondary)'}}>None</span>}</td>
                    <td>{user.primary_role_name || <span style={{color: 'var(--text-secondary)'}}>None</span>}</td>
                    <td>
                      <span className={`status-badge ${user.is_system_admin ? 'success' : 'warning'}`}>
                        {user.is_system_admin ? '👑 Yes' : '👤 No'}
                      </span>
                    </td>
                    <td>
                      <span className="badge-blue">{user.permission_overrides || 0}</span>
                    </td>
                    <td>{user.last_login ? new Date(user.last_login).toLocaleDateString() : <span style={{color: 'var(--text-secondary)'}}>Never</span>}</td>
                    <td>
                      <span className={`status-badge ${user.is_active ? 'success' : 'error'}`}>
                        {user.is_active ? '✅ Active' : '❌ Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="settings-alert warning">
            <span>👥 No users found. Users will appear here once the system is configured.</span>
          </div>
        )}
      </div>
    </div>
  );

  const renderAppearanceSettings = () => (
    <div className="settings-section">
      <h2>Appearance</h2>
      
      <div className="settings-grid">
        <div className="settings-group">
          <h3>🎨 Color Theme</h3>
          <div className="setting-item">
            <label>Theme Mode</label>
            <div className="theme-selector">
              <button
                className={`btn btn-outline theme-option ${theme === 'light' ? 'active' : ''}`}
                onClick={() => theme !== 'light' && toggleTheme()}
              >
                ☀️ Light
              </button>
              <button
                className={`btn btn-outline theme-option ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => theme !== 'dark' && toggleTheme()}
              >
                🌙 Dark
              </button>
            </div>
            <div className="settings-alert info">
              <span>🎯 Theme preference is automatically saved locally and persists across sessions</span>
            </div>
          </div>
        </div>

      </div>

      <div className="settings-alert warning">
        <span>🚧 Additional appearance settings (UI density, font size, accessibility options) are coming soon</span>
      </div>

    </div>
  );


  return (
    <UnifiedTabComponent
      tabs={settingsTabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      variant="primary"
      size="md"
      orientation="horizontal"
      ariaLabel="Settings navigation"
    >
      {activeTab === 'system' && renderSystemSettings()}
      {activeTab === 'import' && renderImportSettings()}
      {activeTab === 'users' && renderUserPermissions()}
      {activeTab === 'appearance' && renderAppearanceSettings()}
    </UnifiedTabComponent>
  );
}