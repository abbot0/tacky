const { app, BrowserWindow, Menu, ipcMain, screen, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');

let win;
const isDev = !app.isPackaged;

// ---------------------------------------------------------------------------
// Disk-backed storage (replaces localStorage, which caps out at ~5-10 MB and
// is far too small once canvases start embedding images).
// Each key lives in its own JSON file under userData/data. Writes are atomic
// (tmp file + rename) and serialised per key so a fast burst of saves can never
// interleave or leave a half-written file behind.
// ---------------------------------------------------------------------------
const DATA_DIR = path.join(app.getPath('userData'), 'data');
const SAFE_KEY = /^[a-z0-9._-]+$/i;
const writeQueues = new Map();

function keyPath(key){
  if (typeof key !== 'string' || !SAFE_KEY.test(key)) throw new Error('Invalid storage key');
  return path.join(DATA_DIR, `${key}.json`);
}

async function ensureDataDir(){
  await fsp.mkdir(DATA_DIR, { recursive: true });
}

async function readKey(key){
  const file = keyPath(key);
  try {
    return await fsp.readFile(file, 'utf8');
  } catch (err) {
    if (err?.code === 'ENOENT') return null;
    throw err;
  }
}

async function writeKeyAtomic(key, contents){
  await ensureDataDir();
  const file = keyPath(key);
  const tmp = `${file}.${process.pid}.tmp`;
  await fsp.writeFile(tmp, contents, 'utf8');
  await fsp.rename(tmp, file);
}

function writeKey(key, contents){
  const previous = writeQueues.get(key) ?? Promise.resolve();
  const next = previous
    .catch(() => {})
    .then(() => writeKeyAtomic(key, contents));
  writeQueues.set(key, next);
  next.finally(() => {
    if (writeQueues.get(key) === next) writeQueues.delete(key);
  });
  return next;
}

async function storageStats(){
  await ensureDataDir();
  const entries = await fsp.readdir(DATA_DIR, { withFileTypes: true });
  const files = [];
  for (const entry of entries){
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const stat = await fsp.stat(path.join(DATA_DIR, entry.name));
    files.push({ key: entry.name.replace(/\.json$/, ''), bytes: stat.size, modifiedAt: stat.mtimeMs });
  }
  return { dir: DATA_DIR, files };
}

function registerStorageHandlers(){
  ipcMain.handle('storage:read', (_event, key) => readKey(key));
  ipcMain.handle('storage:write', (_event, key, contents) => {
    if (typeof contents !== 'string') throw new Error('Storage payload must be a string');
    return writeKey(key, contents);
  });
  ipcMain.handle('storage:remove', async (_event, key) => {
    try { await fsp.unlink(keyPath(key)); } catch (err) { if (err?.code !== 'ENOENT') throw err; }
    return true;
  });
  ipcMain.handle('storage:stats', () => storageStats());
  ipcMain.handle('storage:open-dir', async () => {
    await ensureDataDir();
    await shell.openPath(DATA_DIR);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Native file dialogs for import/export.
// ---------------------------------------------------------------------------
function registerFileHandlers(){
  ipcMain.handle('file:save', async (_event, { defaultName, contents, filters }) => {
    const result = await dialog.showSaveDialog(win, {
      defaultPath: defaultName || 'export.json',
      filters: Array.isArray(filters) && filters.length ? filters : [{ name: 'JSON', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    await fsp.writeFile(result.filePath, String(contents ?? ''), 'utf8');
    return { canceled: false, filePath: result.filePath };
  });

  ipcMain.handle('file:open', async (_event, { filters } = {}) => {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: Array.isArray(filters) && filters.length ? filters : [{ name: 'JSON', extensions: ['json'] }]
    });
    if (result.canceled || !result.filePaths?.length) return { canceled: true };
    const filePath = result.filePaths[0];
    const contents = await fsp.readFile(filePath, 'utf8');
    return { canceled: false, filePath, contents };
  });
}

// ---------------------------------------------------------------------------
// Window state - remember size/position/maximised between launches.
// ---------------------------------------------------------------------------
const WINDOW_STATE_FILE = path.join(app.getPath('userData'), 'window-state.json');

function loadWindowState(){
  try {
    const parsed = JSON.parse(fs.readFileSync(WINDOW_STATE_FILE, 'utf8'));
    if (parsed && typeof parsed === 'object') return parsed;
  } catch (_) {}
  return null;
}

function saveWindowState(){
  if (!win || win.isDestroyed()) return;
  const isMaximized = win.isMaximized();
  const bounds = isMaximized ? (win.__lastNormalBounds || win.getNormalBounds()) : win.getBounds();
  const state = { ...bounds, isMaximized };
  try { fs.writeFileSync(WINDOW_STATE_FILE, JSON.stringify(state)); } catch (_) {}
}

function boundsAreVisible(bounds){
  if (!bounds || typeof bounds.x !== 'number' || typeof bounds.y !== 'number') return false;
  return screen.getAllDisplays().some(display => {
    const area = display.workArea;
    return bounds.x + bounds.width > area.x + 40
      && bounds.x < area.x + area.width - 40
      && bounds.y + bounds.height > area.y + 40
      && bounds.y < area.y + area.height - 40;
  });
}

function createWindow(){
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  const saved = loadWindowState();
  const initialWidth = Math.max(Math.floor(screenWidth * 0.7), 1100);
  const initialHeight = Math.max(Math.floor(screenHeight * 0.7), 720);
  const useSaved = saved && boundsAreVisible(saved);

  win = new BrowserWindow({
    width: useSaved ? saved.width : initialWidth,
    height: useSaved ? saved.height : initialHeight,
    x: useSaved ? saved.x : undefined,
    y: useSaved ? saved.y : undefined,
    minWidth:960,
    minHeight:640,
    show:false,
    icon:path.join(__dirname,'assets','icon.ico'),
    backgroundColor:'#111318',
    autoHideMenuBar: !isDev,
    webPreferences:{
      preload: path.join(__dirname,'preload.cjs'),
      nodeIntegration:false,
      contextIsolation:true,
      sandbox:false,
      spellcheck:false,
      backgroundThrottling:true
    }
  });

  win.once('ready-to-show', () => {
    if (win.isDestroyed()) return;
    if (!useSaved || saved.isMaximized) win.maximize();
    win.show();
  });

  // Track normal bounds so a maximised window still restores to the right size.
  const rememberNormalBounds = () => {
    if (!win.isMaximized() && !win.isMinimized()) win.__lastNormalBounds = win.getBounds();
  };
  win.on('resize', rememberNormalBounds);
  win.on('move', rememberNormalBounds);
  win.on('close', saveWindowState);

  // Open external links in the system browser instead of a new Electron window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
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

ipcMain.on('app-version-sync', event => { event.returnValue = app.getVersion(); });
ipcMain.handle('app-version', () => app.getVersion());

app.whenReady().then(() => {
  const menuTemplate = [
    {
      label:'File',
      submenu:[
        { role:'quit' }
      ]
    },
    {
      label:'Edit',
      submenu:[
        { role:'undo' }, { role:'redo' }, { type:'separator' },
        { role:'cut' }, { role:'copy' }, { role:'paste' }, { role:'selectAll' }
      ]
    },
    {
      label:'View',
      submenu:[
        { role:'resetZoom' }, { role:'zoomIn' }, { role:'zoomOut' }, { type:'separator' },
        { role:'togglefullscreen' },
        ...(isDev ? [{ type:'separator' }, { role:'reload' }, { role:'forceReload' }, { role:'toggleDevTools', accelerator:'Ctrl+Shift+I' }] : [])
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
  registerStorageHandlers();
  registerFileHandlers();
  registerUpdaterHandlers();
  createWindow();

  if (!isDev){
    autoUpdater.checkForUpdates().catch(err => {
      sendToRenderer('update-error', { message: err?.message ?? String(err) });
    });
  }
});

// Make sure any queued storage writes land before the process exits.
let quitting = false;
app.on('before-quit', event => {
  if (quitting) return;
  const pending = Array.from(writeQueues.values());
  if (!pending.length) return;
  event.preventDefault();
  quitting = true;
  Promise.allSettled(pending).then(() => { writeQueues.clear(); app.quit(); });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
