const { app, BrowserWindow, Menu, ipcMain, screen } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let win;
const isDev = !app.isPackaged;

function createWindow(){
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  const initialWidth = Math.max(Math.floor(screenWidth * 0.7), 1280);
  const initialHeight = Math.max(Math.floor(screenHeight * 0.7), 800);

  win = new BrowserWindow({
    width: initialWidth,
    height: initialHeight,
    minWidth:1280,
    minHeight:800,
    show:false,
    icon:path.join(__dirname,'assets','icon.ico'),
    backgroundColor:'#111318',
    webPreferences:{
      preload: path.join(__dirname,'preload.cjs'),
      nodeIntegration:false,
      contextIsolation:true
    }
  });

  win.once('ready-to-show', () => {
    if (win.isDestroyed()) return;
    win.maximize();
    win.show();
  });

  win.loadFile(path.join(__dirname,'..','dist','index.html'));
  if (isDev){
    win.webContents.openDevTools({ mode:'detach' });
  }
}

function sendToRenderer(channel, payload){
  if (win && !win.isDestroyed()){
    win.webContents.send(channel, payload);
  }
}

function registerUpdaterHandlers(){
  ipcMain.handle('update-check', async () => {
    if (isDev) return { skipped:true };
    try {
      const result = await autoUpdater.checkForUpdates();
      return { version: result?.updateInfo?.version ?? null };
    } catch (err) {
      return { error: err?.message ?? String(err) };
    }
  });

  ipcMain.handle('update-download', async () => {
    if (isDev) return { skipped:true };
    try {
      await autoUpdater.downloadUpdate();
      return { started:true };
    } catch (err) {
      return { error: err?.message ?? String(err) };
    }
  });

  ipcMain.handle('update-install', () => {
    if (isDev) return { skipped:true };
    autoUpdater.quitAndInstall();
    return { ok:true };
  });

  if (isDev) return;

  autoUpdater.autoDownload = false;

  autoUpdater.on('update-available', info => {
    sendToRenderer('update-available', {
      version: info?.version ?? null,
      releaseNotes: info?.releaseNotes ?? null
    });
  });

  autoUpdater.on('update-not-available', () => {
    sendToRenderer('update-not-available');
  });

  autoUpdater.on('download-progress', progress => {
    sendToRenderer('update-download-progress', {
      percent: progress?.percent ?? 0,
      bytesPerSecond: progress?.bytesPerSecond ?? 0
    });
  });

  autoUpdater.on('update-downloaded', info => {
    sendToRenderer('update-downloaded', {
      version: info?.version ?? null
    });
  });

  autoUpdater.on('error', error => {
    sendToRenderer('update-error', {
      message: error?.message ?? String(error)
    });
  });
}

app.whenReady().then(() => {
  const menuTemplate = [
    {
      label:'File',
      submenu:[
        { role:'quit' }
      ]
    }
  ];

  if (isDev){
    menuTemplate.push({
      label:'View',
      submenu:[
        { role:'reload' },
        { role:'forceReload' },
        { role:'toggleDevTools', accelerator:'Ctrl+Shift+I' }
      ]
    });
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
  createWindow();
  registerUpdaterHandlers();

  if (!isDev){
    autoUpdater.checkForUpdates().catch(err => {
      sendToRenderer('update-error', { message: err?.message ?? String(err) });
    });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
