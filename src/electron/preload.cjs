const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  
  // App info
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  getAppConfig: () => ipcRenderer.invoke('get-app-config'),
  
  // Settings window API
  getConfig: () => ipcRenderer.invoke('get-app-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  showErrorBox: (title, content) => ipcRenderer.send('show-error-box', title, content),
  restartApp: () => ipcRenderer.send('restart-app'),
  
  // Database operations
  getDatabaseSize: () => ipcRenderer.invoke('get-database-size'),
  optimizeDatabase: () => ipcRenderer.invoke('optimize-database'),
  backupDatabase: () => ipcRenderer.invoke('backup-database'),
  getLastBackupTime: () => ipcRenderer.invoke('get-last-backup-time'),
  
  // File operations
  openPath: (path) => ipcRenderer.invoke('open-path', path),
  
  // Cache operations
  clearCache: () => ipcRenderer.invoke('clear-cache'),
  
  // Settings operations
  resetSettings: () => ipcRenderer.invoke('reset-settings'),
  
  // Menu events
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-settings', callback);
    ipcRenderer.on('menu-import-excel', callback);
    ipcRenderer.on('menu-export-excel', callback);
    ipcRenderer.on('menu-backup-database', callback);
    ipcRenderer.on('menu-restore-database', callback);
  },
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
  
  // Setup wizard API
  setupValidate: (config) => ipcRenderer.invoke('setup-validate', config),
  setupSave: (config) => ipcRenderer.invoke('setup-save', config),
  setupComplete: () => ipcRenderer.send('setup-complete')
});