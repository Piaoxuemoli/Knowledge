const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  chatWithDeepseek: (messages) => ipcRenderer.invoke('deepseek-chat', messages)
});