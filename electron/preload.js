import { contextBridge, ipcRenderer } from 'electron';

const apiBaseUrl = `http://${process.env.HOST || '127.0.0.1'}:${process.env.PORT || '3000'}/api`;

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  apiBaseUrl,
  ping: () => ipcRenderer.invoke('app:ping'),
  getVersions: () => ipcRenderer.invoke('app:get-versions'),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url)
});
