const { contextBridge, ipcRenderer } = require('electron');

function registerListener(channel){
  return (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on(channel, listener);
    return () => ipcRenderer.removeListener(channel, listener);
  };
}

(async ()=>{
  let version = '0.0.0';
  try{
    const fetched = await ipcRenderer.invoke('app-version');
    if (typeof fetched === 'string' && fetched.trim().length){
      version = fetched;
    }
  }catch(_err){
    // ignore and keep fallback
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
})();
