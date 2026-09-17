const { contextBridge, ipcRenderer } = require('electron');

function registerListener(channel){
  return (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  };
}

// Resolve the version synchronously so window.tacky exists before the renderer
// bundle runs. The previous async IIFE raced the first React render.
let version = '0.0.0';
try {
  const fetched = ipcRenderer.sendSync('app-version-sync');
  if (typeof fetched === 'string' && fetched.trim().length) version = fetched;
} catch (_err) {}

contextBridge.exposeInMainWorld('tacky', {
  version,
  platform: process.platform,
  storage: {
    read: (key) => ipcRenderer.invoke('storage:read', key),
    write: (key, contents) => ipcRenderer.invoke('storage:write', key, contents),
    remove: (key) => ipcRenderer.invoke('storage:remove', key),
    stats: () => ipcRenderer.invoke('storage:stats'),
    openDir: () => ipcRenderer.invoke('storage:open-dir')
  },
  backups: {
    list: () => ipcRenderer.invoke('backup:list'),
    restore: (stamp) => ipcRenderer.invoke('backup:restore', stamp)
  },
  files: {
    save: (options) => ipcRenderer.invoke('file:save', options),
    open: (options) => ipcRenderer.invoke('file:open', options)
  },
  checkForUpdates: () => ipcRenderer.invoke('update-check'),
  downloadUpdate: () => ipcRenderer.invoke('update-download'),
  installUpdate: () => ipcRenderer.invoke('update-install'),
  onUpdateAvailable: registerListener('update-available'),
  onUpdateNotAvailable: registerListener('update-not-available'),
  onUpdateDownloaded: registerListener('update-downloaded'),
  onUpdateProgress: registerListener('update-download-progress'),
  onUpdateError: registerListener('update-error')
});
