const { ipcRenderer } = require('electron');

let currentStep = 0;
const steps = ['welcome', 'database', 'server', 'advanced', 'review'];

// Configuration object to store user settings
let config = {
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
};

// Initialize event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Auto-backup checkbox toggle
    document.getElementById('autoBackup').addEventListener('change', (e) => {
        document.getElementById('backupOptions').style.display = e.target.checked ? 'block' : 'none';
    });

    // Navigation button listeners
    document.querySelectorAll('[data-action="next"]').forEach(btn => {
        btn.addEventListener('click', nextStep);
    });

    document.querySelectorAll('[data-action="previous"]').forEach(btn => {
        btn.addEventListener('click', previousStep);
    });

    // Browse folder button
    const browseBtn = document.querySelector('[data-action="browse"]');
    if (browseBtn) {
        browseBtn.addEventListener('click', browseFolder);
    }

    // Finish/save button
    const finishBtn = document.getElementById('finishBtn');
    if (finishBtn) {
        finishBtn.addEventListener('click', saveAndFinish);
    }

    // Load default paths
    loadDefaults();
});

async function loadDefaults() {
    try {
        const defaults = await ipcRenderer.invoke('get-default-paths');
        if (defaults.dbPath) {
            document.getElementById('dbLocation').placeholder = `Default: ${defaults.dbPath}`;
        }
    } catch (error) {
        console.error('Error loading defaults:', error);
    }
}

function updateStepUI() {
    // Update sidebar
    document.querySelectorAll('.step').forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index === currentStep) {
            step.classList.add('active');
        } else if (index < currentStep) {
            step.classList.add('completed');
        }
    });
    
    // Update content
    document.querySelectorAll('.step-content').forEach((content) => {
        content.classList.remove('active');
    });
    document.getElementById(steps[currentStep]).classList.add('active');
    
    // Update config preview on review step
    if (steps[currentStep] === 'review') {
        updateConfigPreview();
    }
}

function nextStep() {
    if (validateCurrentStep()) {
        if (currentStep < steps.length - 1) {
            saveCurrentStep();
            currentStep++;
            updateStepUI();
        }
    }
}

function previousStep() {
    if (currentStep > 0) {
        currentStep--;
        updateStepUI();
    }
}

function validateCurrentStep() {
    const step = steps[currentStep];
    
    switch(step) {
        case 'database':
            const dbName = document.getElementById('dbName').value.trim();
            if (!dbName) {
                showError('Please enter a database filename');
                return false;
            }
            if (!/\.db$/i.test(dbName)) {
                showError('Database filename must end with .db');
                return false;
            }
            break;
            
        case 'server':
            const port = parseInt(document.getElementById('serverPort').value);
            if (isNaN(port) || port < 1024 || port > 65535) {
                showError('Please enter a valid port number between 1024 and 65535');
                return false;
            }
            break;
    }
    
    return true;
}

function saveCurrentStep() {
    const step = steps[currentStep];
    
    switch(step) {
        case 'database':
            config.database.location = document.getElementById('dbLocation').value.trim();
            config.database.filename = document.getElementById('dbName').value.trim();
            config.database.autoBackup = document.getElementById('autoBackup').checked;
            config.database.backupInterval = document.getElementById('backupInterval').value;
            config.database.backupRetention = parseInt(document.getElementById('backupRetention').value);
            break;
            
        case 'server':
            config.server.port = parseInt(document.getElementById('serverPort').value);
            config.server.host = document.getElementById('serverHost').value;
            config.server.requireAuth = document.getElementById('requireAuth').checked;
            break;
            
        case 'advanced':
            config.advanced.logLevel = document.getElementById('logLevel').value;
            config.advanced.maxConnections = parseInt(document.getElementById('maxConnections').value);
            config.advanced.enableCache = document.getElementById('enableCache').checked;
            config.advanced.compressResponses = document.getElementById('compressResponses').checked;
            config.advanced.enableDevTools = document.getElementById('devTools').checked;
            break;
    }
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
    setTimeout(() => {
        errorEl.style.display = 'none';
    }, 5000);
}

function showSuccess(message) {
    const successEl = document.getElementById('successMessage');
    successEl.textContent = message;
    successEl.style.display = 'block';
}

function updateConfigPreview() {
    const preview = document.getElementById('configPreview');
    const dbPath = config.database.location || '[User Data Directory]';
    
    preview.innerHTML = `
<strong>Database Configuration:</strong>
  Location: ${dbPath}
  Filename: ${config.database.filename}
  Auto Backup: ${config.database.autoBackup ? 'Enabled' : 'Disabled'}
  ${config.database.autoBackup ? `Backup Interval: ${config.database.backupInterval}
  Backup Retention: ${config.database.backupRetention} days` : ''}

<strong>Server Configuration:</strong>
  Port: ${config.server.port}
  Host: ${config.server.host}
  Authentication: ${config.server.requireAuth ? 'Required' : 'Disabled'}

<strong>Advanced Settings:</strong>
  Log Level: ${config.advanced.logLevel}
  Max Connections: ${config.advanced.maxConnections}
  Caching: ${config.advanced.enableCache ? 'Enabled' : 'Disabled'}
  Compression: ${config.advanced.compressResponses ? 'Enabled' : 'Disabled'}
  Dev Tools: ${config.advanced.enableDevTools ? 'Enabled' : 'Disabled'}
    `.trim();
}

async function browseFolder() {
    try {
        const result = await ipcRenderer.invoke('browse-folder');
        if (result && !result.canceled && result.filePaths.length > 0) {
            document.getElementById('dbLocation').value = result.filePaths[0];
        }
    } catch (error) {
        showError('Error selecting folder: ' + error.message);
    }
}

async function saveAndFinish() {
    const finishBtn = document.getElementById('finishBtn');
    finishBtn.disabled = true;
    finishBtn.innerHTML = 'Saving... <span class="spinner"></span>';
    
    try {
        // Save the current step
        saveCurrentStep();
        
        // Send configuration to main process
        const result = await ipcRenderer.invoke('save-configuration', config);
        
        if (result.success) {
            showSuccess('Configuration saved successfully!');
            
            // Wait a moment then close the wizard
            setTimeout(() => {
                ipcRenderer.send('setup-complete');
            }, 1500);
        } else {
            throw new Error(result.error || 'Unknown error');
        }
    } catch (error) {
        showError('Error saving configuration: ' + error.message);
        finishBtn.disabled = false;
        finishBtn.innerHTML = 'Save Configuration';
    }
}

// Handle step navigation from sidebar
document.querySelectorAll('.step').forEach((stepEl, index) => {
    stepEl.addEventListener('click', () => {
        if (index < currentStep || currentStep === 0) {
            if (currentStep > 0) {
                saveCurrentStep();
            }
            currentStep = index;
            updateStepUI();
        }
    });
});