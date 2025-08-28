let config = {};
let hasChanges = false;
let requiresRestart = false;

// Load configuration on startup
window.addEventListener('DOMContentLoaded', async () => {
    config = await window.electronAPI.getConfig();
    loadSettings();
    calculateDatabaseSize();
    checkLastBackup();
});

// Tab switching
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Load current settings into form
function loadSettings() {
    // General
    document.getElementById('theme').value = config.general?.theme || 'auto';
    document.getElementById('language').value = config.general?.language || 'en';
    document.getElementById('startWithWindows').checked = config.general?.startWithWindows || false;
    document.getElementById('minimizeToTray').checked = config.general?.minimizeToTray || false;
    
    // Database
    document.getElementById('dbLocation').value = config.database?.location || '';
    document.getElementById('connectionPool').value = config.advanced?.maxConnections || 10;
    
    // Server
    document.getElementById('serverPort').value = config.server?.port || 3456;
    document.getElementById('serverHost').value = config.server?.host || 'localhost';
    document.getElementById('requireAuth').checked = config.server?.requireAuth || false;
    document.getElementById('enableHttps').checked = config.server?.enableHttps || false;
    
    // Backup
    document.getElementById('autoBackup').checked = config.database?.autoBackup || false;
    document.getElementById('backupInterval').value = config.database?.backupInterval || 'daily';
    document.getElementById('backupLocation').value = config.backup?.location || 
        config.database?.location + '/backups';
    document.getElementById('backupRetention').value = config.database?.backupRetention || 30;
    
    // Advanced
    document.getElementById('logLevel').value = config.advanced?.logLevel || 'info';
    document.getElementById('logLocation').value = config.advanced?.logLocation || 
        config.database?.location + '/logs';
    document.getElementById('enableDevTools').checked = config.advanced?.enableDevTools || false;
    document.getElementById('enableCache').checked = config.advanced?.enableCache || true;
    document.getElementById('compressResponses').checked = config.advanced?.compressResponses || true;
}

// Track changes
document.addEventListener('input', (e) => {
    if (e.target.matches('input, select')) {
        hasChanges = true;
        
        // Check if this change requires restart
        const restartRequired = [
            'serverPort', 'serverHost', 'language', 'connectionPool', 
            'enableHttps', 'logLevel'
        ];
        if (restartRequired.includes(e.target.id)) {
            requiresRestart = true;
            document.getElementById('restartNotice').style.display = 'block';
        }
    }
});

// Save settings
async function saveSettings() {
    if (!hasChanges) {
        closeSettings();
        return;
    }
    
    // Gather all settings
    const newConfig = {
        general: {
            theme: document.getElementById('theme').value,
            language: document.getElementById('language').value,
            startWithWindows: document.getElementById('startWithWindows').checked,
            minimizeToTray: document.getElementById('minimizeToTray').checked
        },
        database: {
            ...config.database,
            autoBackup: document.getElementById('autoBackup').checked,
            backupInterval: document.getElementById('backupInterval').value,
            backupRetention: parseInt(document.getElementById('backupRetention').value)
        },
        server: {
            port: parseInt(document.getElementById('serverPort').value),
            host: document.getElementById('serverHost').value,
            requireAuth: document.getElementById('requireAuth').checked,
            enableHttps: document.getElementById('enableHttps').checked
        },
        backup: {
            location: document.getElementById('backupLocation').value
        },
        advanced: {
            logLevel: document.getElementById('logLevel').value,
            logLocation: document.getElementById('logLocation').value,
            maxConnections: parseInt(document.getElementById('connectionPool').value),
            enableCache: document.getElementById('enableCache').checked,
            compressResponses: document.getElementById('compressResponses').checked,
            enableDevTools: document.getElementById('enableDevTools').checked
        }
    };
    
    try {
        await window.electronAPI.saveConfig(newConfig);
        
        if (requiresRestart) {
            const result = await window.electronAPI.showMessageBox({
                type: 'info',
                title: 'Restart Required',
                message: 'Some changes require a restart to take effect.',
                buttons: ['Restart Now', 'Restart Later'],
                defaultId: 0
            });
            
            if (result === 0) {
                await window.electronAPI.restartApp();
            } else {
                window.close();
            }
        } else {
            window.close();
        }
    } catch (error) {
        await window.electronAPI.showErrorBox('Error', 'Failed to save settings: ' + error.message);
    }
}

// Close settings window
function closeSettings() {
    if (hasChanges) {
        window.electronAPI.showMessageBox({
            type: 'question',
            title: 'Unsaved Changes',
            message: 'You have unsaved changes. Do you want to save them?',
            buttons: ['Save', 'Discard', 'Cancel'],
            defaultId: 0
        }).then(result => {
            if (result === 0) {
                saveSettings();
            } else if (result === 1) {
                window.close();
            }
        });
    } else {
        window.close();
    }
}

// Database functions
async function calculateDatabaseSize() {
    try {
        const size = await window.electronAPI.getDatabaseSize();
        const sizeInMB = (size / 1024 / 1024).toFixed(2);
        document.getElementById('dbSize').textContent = `${sizeInMB} MB`;
    } catch (error) {
        document.getElementById('dbSize').textContent = 'Unknown';
    }
}

async function optimizeDatabase() {
    try {
        const result = await window.electronAPI.showMessageBox({
            type: 'info',
            title: 'Optimize Database',
            message: 'This will compact the database and may take a few moments.',
            buttons: ['Continue', 'Cancel'],
            defaultId: 0
        });
        
        if (result === 0) {
            await window.electronAPI.optimizeDatabase();
            await calculateDatabaseSize();
            await window.electronAPI.showMessageBox({
                type: 'info',
                title: 'Success',
                message: 'Database optimization completed successfully.',
                buttons: ['OK']
            });
        }
    } catch (error) {
        await window.electronAPI.showErrorBox('Error', 'Failed to optimize database: ' + error.message);
    }
}

// Backup functions
async function checkLastBackup() {
    try {
        const lastBackup = await window.electronAPI.getLastBackupTime();
        if (lastBackup) {
            const date = new Date(lastBackup);
            document.getElementById('lastBackup').textContent = date.toLocaleString();
        }
    } catch (error) {
        document.getElementById('lastBackup').textContent = 'Never';
    }
}

async function browseBackupFolder() {
    try {
        const result = await window.electronAPI.showOpenDialog({
            properties: ['openDirectory'],
            defaultPath: document.getElementById('backupLocation').value
        });
        
        if (!result.canceled && result.filePaths.length > 0) {
            document.getElementById('backupLocation').value = result.filePaths[0];
            hasChanges = true;
        }
    } catch (error) {
        await window.electronAPI.showErrorBox('Error', 'Failed to browse folder: ' + error.message);
    }
}

async function backupNow() {
    try {
        await window.electronAPI.backupDatabase();
        await checkLastBackup();
        await window.electronAPI.showMessageBox({
            type: 'info',
            title: 'Success',
            message: 'Database backup completed successfully.',
            buttons: ['OK']
        });
    } catch (error) {
        await window.electronAPI.showErrorBox('Error', 'Failed to backup database: ' + error.message);
    }
}

// Advanced functions
async function openLogFolder() {
    try {
        await window.electronAPI.openPath(document.getElementById('logLocation').value);
    } catch (error) {
        await window.electronAPI.showErrorBox('Error', 'Failed to open log folder: ' + error.message);
    }
}

async function clearCache() {
    try {
        const result = await window.electronAPI.showMessageBox({
            type: 'warning',
            title: 'Clear Cache',
            message: 'This will clear all cached data. Continue?',
            buttons: ['Clear', 'Cancel'],
            defaultId: 1
        });
        
        if (result === 0) {
            await window.electronAPI.clearCache();
            await window.electronAPI.showMessageBox({
                type: 'info',
                title: 'Success',
                message: 'Cache cleared successfully.',
                buttons: ['OK']
            });
        }
    } catch (error) {
        await window.electronAPI.showErrorBox('Error', 'Failed to clear cache: ' + error.message);
    }
}

async function resetSettings() {
    try {
        const result = await window.electronAPI.showMessageBox({
            type: 'warning',
            title: 'Reset All Settings',
            message: 'This will reset all settings to defaults and restart the application.',
            buttons: ['Reset', 'Cancel'],
            defaultId: 1
        });
        
        if (result === 0) {
            await window.electronAPI.resetSettings();
        }
    } catch (error) {
        await window.electronAPI.showErrorBox('Error', 'Failed to reset settings: ' + error.message);
    }
}

// Make functions available globally
window.switchTab = switchTab;
window.saveSettings = saveSettings;
window.closeSettings = closeSettings;
window.optimizeDatabase = optimizeDatabase;
window.browseBackupFolder = browseBackupFolder;
window.backupNow = backupNow;
window.openLogFolder = openLogFolder;
window.clearCache = clearCache;
window.resetSettings = resetSettings;