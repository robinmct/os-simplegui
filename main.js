const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// Create the main application window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      enableRemoteModule: false
    },
    backgroundColor: '#1e1e1e',
    show: false
  });

  mainWindow.loadFile('src/index.html');

  // Show window when ready to avoid visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize app
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers for file system operations
ipcMain.handle('fs:readFile', async (event, filePath) => {
  try {
    const userDataPath = app.getPath('userData');
    const fullPath = path.join(userDataPath, 'files', filePath);
    const content = fs.readFileSync(fullPath, 'utf8');
    return { success: true, content };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:writeFile', async (event, filePath, content) => {
  try {
    const userDataPath = app.getPath('userData');
    const filesDir = path.join(userDataPath, 'files');
    
    // Create files directory if it doesn't exist
    if (!fs.existsSync(filesDir)) {
      fs.mkdirSync(filesDir, { recursive: true });
    }
    
    const fullPath = path.join(filesDir, filePath);
    fs.writeFileSync(fullPath, content, 'utf8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:deleteFile', async (event, filePath) => {
  try {
    const userDataPath = app.getPath('userData');
    const fullPath = path.join(userDataPath, 'files', filePath);
    const stat = fs.lstatSync(fullPath);
    if (stat.isDirectory()) {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(fullPath);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('fs:listFiles', async (event, dirPath = '') => {
  try {
    const userDataPath = app.getPath('userData');
    const filesDir = path.join(userDataPath, 'files');
    
    if (!fs.existsSync(filesDir)) {
      fs.mkdirSync(filesDir, { recursive: true });
      return { success: true, files: [] };
    }
    
    const targetDir = path.join(filesDir, dirPath);
    if (!fs.existsSync(targetDir)) {
      return { success: true, files: [] };
    }
    const entries = fs.readdirSync(targetDir);
    const files = entries.map(name => {
      const full = path.join(targetDir, name);
      let type = 'file';
      try {
        if (fs.lstatSync(full).isDirectory()) type = 'folder';
      } catch (_) {}
      return { name, type };
    });
    return { success: true, files };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Create folder (supports nested path like 'parent/child')
ipcMain.handle('fs:createFolder', async (event, folderPath) => {
  try {
    const userDataPath = app.getPath('userData');
    const filesDir = path.join(userDataPath, 'files');
    if (!fs.existsSync(filesDir)) {
      fs.mkdirSync(filesDir, { recursive: true });
    }
    const fullPath = path.join(filesDir, folderPath);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Move or rename a file/folder within the files directory
ipcMain.handle('fs:moveFile', async (event, fromPath, toPath) => {
  try {
    const userDataPath = app.getPath('userData');
    const filesDir = path.join(userDataPath, 'files');
    const fullFrom = path.join(filesDir, fromPath);
    const fullTo = path.join(filesDir, toPath);
    const targetDir = path.dirname(fullTo);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    fs.renameSync(fullFrom, fullTo);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
