const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  platform: process.platform,

  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Notifications
  showNotification: (title, body) => {
    new Notification(title, { body });
  },

  // Check if running in Electron
  isElectron: true
});

// Log that preload script loaded
console.log('Akai Electron preload script loaded');
