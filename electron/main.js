import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RENDERER_DEV_URL = process.env.ELECTRON_START_URL;
const API_PORT = Number(process.env.PORT || 3000);
const API_HOST = process.env.HOST || '127.0.0.1';
const API_BASE_URL = `http://${API_HOST}:${API_PORT}/api`;

let mainWindow = null;
let embeddedServer = null;

async function startEmbeddedBackend() {
  if (process.env.ELECTRON_EXTERNAL_API === 'true') {
    return null;
  }

  process.env.DISABLE_VITE = 'true';
  process.env.HOST = API_HOST;
  process.env.PORT = String(API_PORT);

  const { startServer } = await import('../server.js');
  embeddedServer = await startServer({ port: API_PORT, host: API_HOST, withRenderer: false });
  return embeddedServer;
}

async function createMainWindow() {
  await startEmbeddedBackend();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: '#f8fafc',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      sandbox: false
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (RENDERER_DEV_URL) {
    await mainWindow.loadURL(RENDERER_DEV_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    await mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

ipcMain.handle('app:ping', async () => ({
  ok: true,
  timestamp: new Date().toISOString(),
  apiBaseUrl: API_BASE_URL
}));

ipcMain.handle('app:get-versions', async () => ({
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  node: process.versions.node
}));

ipcMain.handle('shell:openExternal', async (_event, url) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
    await shell.openExternal(url);
    return { success: true };
  }
  throw new Error('Invalid URL');
});

app.whenReady().then(createMainWindow);

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createMainWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (embeddedServer && typeof embeddedServer.close === 'function') {
    embeddedServer.close();
  }
});
