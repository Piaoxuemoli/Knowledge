const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  chatWithDeepseek: (messages) => ipcRenderer.invoke('deepseek-chat', messages),
  validateApiKey: (config) => ipcRenderer.invoke('validate-api-key', config),
  updateApiConfig: (config) => ipcRenderer.invoke('update-api-config', config),
  getApiConfig: () => ipcRenderer.invoke('get-api-config')
}); // 渲染进程向主进程通过 ipcRenderer.invoke 发送消息，然后等待主进程返回的promise结果