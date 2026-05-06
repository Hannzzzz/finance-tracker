// Preload script for secure context between main and renderer process
const { contextBridge, ipcRenderer } = require('electron');

// Expose store API to renderer process securely
contextBridge.exposeInMainWorld('store', {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
    all: () => ipcRenderer.invoke('store:all')
});

