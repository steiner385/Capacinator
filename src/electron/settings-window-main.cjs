const { BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let settingsWindow = null;

function createSettingsWindow(parentWindow) {
  if (settingsWindow) {
    settingsWindow.focus();
    return settingsWindow;
  }

  settingsWindow = new BrowserWindow({
    width: 800,
    height: 600,
    parent: parentWindow,
    modal: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  settingsWindow.loadFile(path.join(__dirname, 'settings-window.html'));

  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });

  return settingsWindow;
}

module.exports = {
  createSettingsWindow
};