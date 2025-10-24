const { contextBridge, ipcRenderer } = require('electron');

const version =
  (typeof process !== 'undefined' && process?.env?.npm_package_version) ||
  (typeof process !== 'undefined' && process?.versions?.app) ||
  (typeof process !== 'undefined' && process?.versions?.electron) ||
  '0.0.0';

function registerListener(channel){
  return (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  };
}

contextBridge.exposeInMainWorld('tacky', {
  version,
  checkForUpdates: () => ipcRenderer.invoke('update-check'),
  downloadUpdate: () => ipcRenderer.invoke('update-download'),
  installUpdate: () => ipcRenderer.invoke('update-install'),
  onUpdateAvailable: registerListener('update-available'),
  onUpdateNotAvailable: registerListener('update-not-available'),
  onUpdateDownloaded: registerListener('update-downloaded'),
  onUpdateProgress: registerListener('update-download-progress'),
  onUpdateError: registerListener('update-error')
});
