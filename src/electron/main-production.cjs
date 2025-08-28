const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const express = require('express');
const Store = require('electron-store');
const fs = require('fs');

// Initialize electron store
const store = new Store();

let mainWindow;
let server;
const serverPort = 3456;

// Initialize and start the backend server
async function startProductionServer() {
  try {
    // Import the server configuration
    const { createExpressApp } = await import('../server/app.js');
    const { initializeDatabase } = await import('../server/database/index.js');
    
    // Initialize database
    await initializeDatabase();
    
    // Create Express app
    const app = await createExpressApp();
    
    // Serve the built frontend from the dist directory
    app.use(express.static(path.join(__dirname, '../../dist/client')));
    
    // Catch all routes and serve index.html for client-side routing
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../../dist/client/index.html'));
      }
    });
    
    // Start server
    return new Promise((resolve, reject) => {
      server = app.listen(serverPort, 'localhost', () => {
        console.log(`Server running on http://localhost:${serverPort}`);
        resolve();
      });
      
      server.on('error', (err) => {
        console.error('Server error:', err);
        reject(err);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    throw error;
  }
}

// Create the main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    show: false
  });

  // Load the app from local server
  mainWindow.loadURL(`http://localhost:${serverPort}`);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create application menu
  createMenu();
}

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Import Excel',
          accelerator: 'CmdOrCtrl+I',
          click: () => {
            mainWindow.webContents.send('menu-import-excel');
          }
        },
        {
          label: 'Export to Excel',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow.webContents.send('menu-export-excel');
          }
        },
        { type: 'separator' },
        {
          label: 'Backup Database',
          click: async () => {
            const result = await dialog.showSaveDialog(mainWindow, {
              defaultPath: `capacinator-backup-${new Date().toISOString().split('T')[0]}.db`,
              filters: [{ name: 'Database Files', extensions: ['db'] }]
            });
            
            if (!result.canceled) {
              mainWindow.webContents.send('menu-backup-database', result.filePath);
            }
          }
        },
        {
          label: 'Restore Database',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              filters: [{ name: 'Database Files', extensions: ['db'] }],
              properties: ['openFile']
            });
            
            if (!result.canceled && result.filePaths.length > 0) {
              mainWindow.webContents.send('menu-restore-database', result.filePaths[0]);
            }
          }
        },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Capacinator',
              message: 'Capacinator',
              detail: 'A standalone project capacity planning tool.\n\nVersion: 1.0.0',
              buttons: ['OK']
            });
          }
        },
        {
          label: 'User Guide',
          click: () => {
            shell.openExternal('https://github.com/steiner385/Capacinator/wiki');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(async () => {
  try {
    await startProductionServer();
    createWindow();
  } catch (error) {
    dialog.showErrorBox('Startup Error', `Failed to start application: ${error.message}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  if (server) {
    server.close();
  }
});

// IPC handlers
ipcMain.handle('get-app-path', () => {
  return app.getPath('userData');
});

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

// Database backup IPC handler
ipcMain.handle('backup-database', async (event, targetPath) => {
  const dbPath = path.join(app.getPath('userData'), process.env.DB_FILENAME || 'capacinator.db');
  try {
    await fs.promises.copyFile(dbPath, targetPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Database restore IPC handler
ipcMain.handle('restore-database', async (event, sourcePath) => {
  const dbPath = path.join(app.getPath('userData'), process.env.DB_FILENAME || 'capacinator.db');
  const backupPath = dbPath + '.backup';
  
  try {
    // Create backup of current database
    await fs.promises.copyFile(dbPath, backupPath);
    
    // Restore from source
    await fs.promises.copyFile(sourcePath, dbPath);
    
    // Restart the app to load new database
    app.relaunch();
    app.quit();
    
    return { success: true };
  } catch (error) {
    // Try to restore from backup if something went wrong
    try {
      await fs.promises.copyFile(backupPath, dbPath);
    } catch (backupError) {
      console.error('Failed to restore backup:', backupError);
    }
    
    return { success: false, error: error.message };
  }
});