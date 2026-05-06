const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;

const dataFile = path.join(app.getPath('userData'), 'finance-data.json');

async function readStore() {
    try {
        const content = await fs.readFile(dataFile, 'utf-8');
        return content ? JSON.parse(content) : {};
    } catch (error) {
        if (error.code === 'ENOENT') {
            await writeStore({});
            return {};
        }
        throw error;
    }
}

async function writeStore(storeData) {
    await fs.mkdir(path.dirname(dataFile), { recursive: true });
    await fs.writeFile(dataFile, JSON.stringify(storeData, null, 2), 'utf-8');
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            sandbox: true
        }
    });

    win.loadFile('index.html');
    
    // Uncomment to open DevTools
    // win.webContents.openDevTools();
}

ipcMain.handle('store:get', async (event, key) => {
    const store = await readStore();
    return key ? store[key] : store;
});

ipcMain.handle('store:set', async (event, key, value) => {
    const store = await readStore();
    store[key] = value;
    await writeStore(store);
    return true;
});

ipcMain.handle('store:all', async () => {
    return await readStore();
});

app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});