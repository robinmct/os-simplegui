const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File system operations
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('fs:writeFile', filePath, content),
  deleteFile: (filePath) => ipcRenderer.invoke('fs:deleteFile', filePath),
  listFiles: (dirPath = '') => ipcRenderer.invoke('fs:listFiles', dirPath),
  createFolder: (folderPath) => ipcRenderer.invoke('fs:createFolder', folderPath),
  moveFile: (fromPath, toPath) => ipcRenderer.invoke('fs:moveFile', fromPath, toPath)
});
