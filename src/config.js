const electronApi = typeof window !== 'undefined' ? window.electronAPI : null;

export const IS_ELECTRON = Boolean(electronApi?.isElectron);

export const API_BASE_URL = IS_ELECTRON
  ? electronApi.apiBaseUrl
  : (import.meta.env.VITE_API_BASE_URL || '/api');
