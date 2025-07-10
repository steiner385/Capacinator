const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  
  // App info
  getAppPath: () => ipcRenderer.invoke('get-app-path'),
  
  // Menu events
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-import-excel', callback);
    ipcRenderer.on('menu-export-excel', callback);
    ipcRenderer.on('menu-backup-database', callback);
    ipcRenderer.on('menu-restore-database', callback);
  },
  
  // Remove listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});