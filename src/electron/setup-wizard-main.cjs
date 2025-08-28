const { BrowserWindow, ipcMain, dialog, app } = require('electron');
const path = require('path');
const fs = require('fs').promises;
let Store;
let appStore;

try {
    Store = require('electron-store');
    // Initialize electron store for app settings
    appStore = new Store({
    name: 'capacinator-config',
    defaults: {
        isFirstRun: true,
        config: {
            database: {
                location: '',
                filename: 'capacinator.db',
                autoBackup: true,
                backupInterval: 'daily',
                backupRetention: 30
            },
            server: {
                port: 3456,
                host: 'localhost',
                requireAuth: true
            },
            advanced: {
                logLevel: 'info',
                maxConnections: 10,
                enableCache: true,
                compressResponses: true,
                enableDevTools: false
            }
        }
    }
    });
} catch (error) {
    console.error('Failed to load electron-store:', error);
    // Create a fallback store using simple file storage
    const configPath = path.join(app.getPath('userData'), 'config.json');
    appStore = {
        get: (key, defaultValue) => {
            try {
                const data = require('fs').readFileSync(configPath, 'utf8');
                const config = JSON.parse(data);
                return key ? config[key] : config;
            } catch (e) {
                return defaultValue || (key === 'isFirstRun' ? true : {});
            }
        },
        set: (key, value) => {
            try {
                let config = {};
                try {
                    const data = require('fs').readFileSync(configPath, 'utf8');
                    config = JSON.parse(data);
                } catch (e) {}
                if (typeof key === 'object') {
                    config = key;
                } else {
                    config[key] = value;
                }
                require('fs').writeFileSync(configPath, JSON.stringify(config, null, 2));
            } catch (e) {
                console.error('Failed to save config:', e);
            }
        },
        clear: () => {
            try {
                require('fs').unlinkSync(configPath);
            } catch (e) {}
        }
    };
}

let setupWindow = null;

function createSetupWindow() {
    setupWindow = new BrowserWindow({
        width: 900,
        height: 600,
        resizable: false,
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: path.join(__dirname, '../../assets/icon.png')
    });

    setupWindow.loadFile(path.join(__dirname, 'setup-wizard.html'));

    setupWindow.on('closed', () => {
        setupWindow = null;
    });

    return setupWindow;
}

// IPC handlers for setup wizard
ipcMain.handle('get-default-paths', () => {
    return {
        dbPath: app.getPath('userData'),
        documentsPath: app.getPath('documents'),
        homePath: app.getPath('home')
    };
});

ipcMain.handle('browse-folder', async (event) => {
    const result = await dialog.showOpenDialog(setupWindow, {
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Database Location'
    });
    return result;
});

ipcMain.handle('save-configuration', async (event, config) => {
    try {
        // Validate configuration
        const validation = validateConfig(config);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        // Create database directory if it doesn't exist
        const dbPath = config.database.location || app.getPath('userData');
        await fs.mkdir(dbPath, { recursive: true });

        // Save configuration
        appStore.set('config', config);
        appStore.set('isFirstRun', false);

        // Create environment file for the server
        const envContent = generateEnvFile(config);
        const envPath = path.join(app.getPath('userData'), '.env.production');
        await fs.writeFile(envPath, envContent);

        return { success: true };
    } catch (error) {
        console.error('Error saving configuration:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.on('setup-complete', () => {
    if (setupWindow) {
        setupWindow.close();
    }
    
    // Emit event to main process to start the application
    app.emit('setup-complete');
});

function validateConfig(config) {
    // Validate database settings
    if (!config.database.filename || !config.database.filename.endsWith('.db')) {
        return { valid: false, error: 'Invalid database filename' };
    }

    // Validate server port
    const port = config.server.port;
    if (!port || port < 1024 || port > 65535) {
        return { valid: false, error: 'Invalid server port' };
    }

    // Validate backup retention
    if (config.database.autoBackup) {
        const retention = config.database.backupRetention;
        if (!retention || retention < 1 || retention > 365) {
            return { valid: false, error: 'Invalid backup retention period' };
        }
    }

    return { valid: true };
}

function generateEnvFile(config) {
    const dbPath = config.database.location || app.getPath('userData');
    const fullDbPath = path.join(dbPath, config.database.filename);

    const lines = [
        '# Capacinator Production Configuration',
        '# Generated by Setup Wizard',
        '',
        '# Server Configuration',
        `PORT=${config.server.port}`,
        `HOST=${config.server.host}`,
        '',
        '# Database Configuration',
        `DB_FILENAME=${config.database.filename}`,
        `DB_PATH=${dbPath}`,
        `DB_FULL_PATH=${fullDbPath}`,
        '',
        '# Backup Configuration',
        `DB_BACKUP_ENABLED=${config.database.autoBackup}`,
        `DB_BACKUP_INTERVAL=${config.database.backupInterval}`,
        `DB_BACKUP_RETENTION=${config.database.backupRetention}`,
        '',
        '# Security',
        `REQUIRE_AUTH=${config.server.requireAuth}`,
        '',
        '# Advanced Settings',
        `LOG_LEVEL=${config.advanced.logLevel}`,
        `MAX_DB_CONNECTIONS=${config.advanced.maxConnections}`,
        `ENABLE_CACHE=${config.advanced.enableCache}`,
        `COMPRESS_RESPONSES=${config.advanced.compressResponses}`,
        `ENABLE_DEV_TOOLS=${config.advanced.enableDevTools}`,
        '',
        '# Application Settings',
        'NODE_ENV=production',
        'CORS_ORIGIN=false'
    ];

    return lines.join('\n');
}

module.exports = {
    createSetupWindow,
    appStore,
    isFirstRun: () => appStore.get('isFirstRun'),
    getConfig: () => appStore.get('config')
};