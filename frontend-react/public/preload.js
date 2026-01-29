const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  platform: process.platform,
  isElectron: true,

  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  snapToRight: () => ipcRenderer.send('snap-to-right'),

  // Session
  refreshSession: () => ipcRenderer.send('refresh-session'),

  // Desktop shortcut
  createShortcut: () => ipcRenderer.send('create-shortcut'),

  // Screen sharing - get available sources
  getScreenSources: () => ipcRenderer.invoke('get-sources'),

  // Notifications
  onNotification: (callback) => {
    ipcRenderer.on('notification', (event, data) => callback(data));
  },

  // Remove notification listener
  removeNotificationListener: () => {
    ipcRenderer.removeAllListeners('notification');
  }
});

// Log that preload script loaded
console.log('Akai Electron preload script loaded');
