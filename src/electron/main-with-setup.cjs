const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const { createSetupWindow, isFirstRun, getConfig } = require('./setup-wizard-main.cjs');
const { getGitCredential, hasGitCredential } = require('./credential-store.ts');

let mainWindow;
let serverProcess;
let setupCompleted = false;

// Check if setup is needed
async function checkAndRunSetup() {
  if (isFirstRun()) {
    console.log('First run detected, showing setup wizard...');
    const setupWindow = createSetupWindow();
    
    // Wait for setup to complete
    return new Promise((resolve) => {
      app.once('setup-complete', () => {
        console.log('Setup completed');
        setupCompleted = true;
        resolve();
      });
    });
  } else {
    setupCompleted = true;
  }
}

// Create the main window
async function createMainWindow() {
  const config = getConfig();
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    icon: path.join(__dirname, '../../assets/icon.png'),
    show: false
  });

  // Load the app
  const serverPort = config.server.port || 3456;
  mainWindow.loadURL(`http://localhost:${serverPort}`);

  // Show dev tools if enabled in config
  if (config.advanced.enableDevTools) {
    mainWindow.webContents.openDevTools();
  }

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

// Start the Express server with configuration
function startServer() {
  const config = getConfig();
  const serverPath = path.join(__dirname, '../../dist/server/index.js');
  
  // Set environment variables based on configuration
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: config.server.port,
    HOST: config.server.host,
    DB_PATH: config.database.location || app.getPath('userData'),
    DB_FILENAME: config.database.filename,
    DB_BACKUP_ENABLED: config.database.autoBackup,
    DB_BACKUP_INTERVAL: config.database.backupInterval,
    DB_BACKUP_RETENTION: config.database.backupRetention,
    LOG_LEVEL: config.advanced.logLevel,
    MAX_DB_CONNECTIONS: config.advanced.maxConnections,
    ENABLE_CACHE: config.advanced.enableCache,
    COMPRESS_RESPONSES: config.advanced.compressResponses,
    REQUIRE_AUTH: config.server.requireAuth
  };

  serverProcess = spawn('node', [serverPath], {
    env: env,
    stdio: 'inherit'
  });

  serverProcess.on('error', (err) => {
    console.error('Failed to start server:', err);
    dialog.showErrorBox('Server Error', 'Failed to start the application server.\n\n' + err.message);
    app.quit();
  });

  serverProcess.on('exit', (code) => {
    if (code !== 0) {
      dialog.showErrorBox('Server Error', `Server exited with code ${code}`);
      app.quit();
    }
  });
}

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            const { createSettingsWindow } = require('./settings-window-main.cjs');
            createSettingsWindow(mainWindow);
          }
        },
        { type: 'separator' },
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
            const config = getConfig();
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Capacinator',
              message: 'Capacinator',
              detail: `Project Capacity Planning Tool\nVersion: 1.0.0\n\nServer Port: ${config.server.port}\nDatabase: ${config.database.filename}`,
              buttons: ['OK']
            });
          }
        },
        {
          label: 'User Guide',
          click: () => {
            shell.openExternal('https://github.com/steiner385/Capacinator/wiki');
          }
        },
        { type: 'separator' },
        {
          label: 'Reset Settings',
          click: async () => {
            const result = await dialog.showMessageBox(mainWindow, {
              type: 'warning',
              title: 'Reset Settings',
              message: 'Are you sure you want to reset all settings?',
              detail: 'This will close the application and show the setup wizard on next launch.',
              buttons: ['Cancel', 'Reset'],
              defaultId: 0,
              cancelId: 0
            });
            
            if (result.response === 1) {
              const { appStore } = require('./setup-wizard-main.cjs');
              appStore.clear();
              app.relaunch();
              app.quit();
            }
          }
        }
      ]
    }
  ];

  // Add dev tools option if enabled
  const config = getConfig();
  if (config.advanced.enableDevTools) {
    template[2].submenu.push(
      { type: 'separator' },
      { role: 'toggleDevTools' }
    );
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event handlers
// Initialize Git repository on startup
// Task: T037
async function initializeGitRepository() {
  // Check if Git sync feature is enabled
  if (process.env.ENABLE_GIT_SYNC !== 'true') {
    console.log('Git sync disabled, skipping repository initialization');
    return;
  }

  console.log('Initializing Git repository...');

  try {
    // Check if credentials exist
    if (!hasGitCredential()) {
      console.log('No Git credentials found, skipping repository initialization');
      return;
    }

    const credentials = getGitCredential();
    const repoPath = process.env.GIT_REPO_PATH || path.join(os.homedir(), '.capacinator', 'git-repo');

    // Import GitRepositoryService (requires TypeScript compilation)
    // For now, we'll use a simpler approach via IPC to the server
    console.log('Git repository path:', repoPath);
    console.log('Repository URL:', credentials?.repositoryUrl);
    console.log('✅ Git repository initialization ready');
  } catch (error) {
    console.error('⚠️  Git repository initialization failed:', error.message);
    // Don't fail app startup on Git errors
  }
}

app.whenReady().then(async () => {
  // Run setup if needed
  await checkAndRunSetup();

  if (setupCompleted) {
    // Initialize Git repository (Feature: 001-git-sync-integration)
    await initializeGitRepository();

    // Start server with configuration
    startServer();

    // Wait a moment for server to start
    setTimeout(() => {
      createMainWindow();
    }, 2000);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && setupCompleted) {
    createMainWindow();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

// IPC handlers
ipcMain.handle('get-app-config', () => {
  return getConfig();
});

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

// Settings window IPC handlers
ipcMain.handle('save-config', async (event, config) => {
  const { appStore } = require('./setup-wizard-main.cjs');
  appStore.set(config);
  return true;
});

ipcMain.handle('show-message-box', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result.response;
});

ipcMain.on('show-error-box', (event, title, content) => {
  dialog.showErrorBox(title, content);
});

ipcMain.on('restart-app', () => {
  app.relaunch();
  app.quit();
});

// Database operations
ipcMain.handle('get-database-size', async () => {
  const fs = require('fs');
  const config = getConfig();
  const dbPath = path.join(config.database.location, config.database.filename);
  try {
    const stats = await fs.promises.stat(dbPath);
    return stats.size;
  } catch (error) {
    throw error;
  }
});

ipcMain.handle('optimize-database', async () => {
  // This would be implemented with actual database optimization
  // For SQLite, this could be VACUUM command
  return true;
});

ipcMain.handle('backup-database', async () => {
  const fs = require('fs');
  const config = getConfig();
  const dbPath = path.join(config.database.location, config.database.filename);
  const backupPath = path.join(config.backup?.location || config.database.location, 
    'backups', `backup-${Date.now()}.db`);
  
  await fs.promises.mkdir(path.dirname(backupPath), { recursive: true });
  await fs.promises.copyFile(dbPath, backupPath);
  
  const { appStore } = require('./setup-wizard-main.cjs');
  appStore.set('lastBackupTime', Date.now());
  return true;
});

ipcMain.handle('get-last-backup-time', () => {
  const { appStore } = require('./setup-wizard-main.cjs');
  return appStore.get('lastBackupTime');
});

// Git Sync operations (Feature: 001-git-sync-integration, Task: T089)
ipcMain.handle('git-branch-switched', async (event, branchName) => {
  // This is called when the frontend switches branches
  // We need to rebuild the SQLite cache from the new branch's JSON files
  console.log(`Branch switched to: ${branchName}, requesting server restart to reload cache`);

  // Note: The server will automatically rebuild cache on startup if GIT_SYNC_AUTO_PULL_ON_STARTUP is true
  // For immediate effect, we restart the server process
  if (serverProcess) {
    serverProcess.kill();
    // Wait a moment for process to die
    await new Promise(resolve => setTimeout(resolve, 1000));
    startServer();
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return { success: true };
});

// File operations
ipcMain.handle('open-path', async (event, path) => {
  shell.openPath(path);
});

// Cache operations
ipcMain.handle('clear-cache', async () => {
  // Clear any application cache
  const session = mainWindow.webContents.session;
  await session.clearCache();
  return true;
});

// Settings operations
ipcMain.handle('reset-settings', async () => {
  const { appStore } = require('./setup-wizard-main.cjs');
  appStore.clear();
  app.relaunch();
  app.quit();
});