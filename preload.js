'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  processName: (name) => ipcRenderer.invoke('process-name', name),
  saveFile: (content) => ipcRenderer.invoke('save-file', content),
});
