const { app, BrowserWindow, ipcMain, session, Menu, MenuItem } = require('electron');
const path = require('path');
const fs = require('fs');

// Persistent storage for bookmarks
const BOOKMARKS_FILE = path.join(app.getPath('userData'), 'bookmarks.json');
const ERROR_LOG_FILE = path.resolve(__dirname, '../browser_errors.log');
const PERF_LOG_FILE = path.resolve(__dirname, '../browser_performance.log');
const ENV_FILE = path.resolve(__dirname, '../backend/.env');

let mainWindow;
const consoleBuffer = [];
const MAX_BUFFER_SIZE = 500;

// Smart Bookmarks Configuration
const SMART_PATTERNS = [
    { key: 'FAL_KEY', name: 'Fal.ai Dashboard', url: 'https://fal.ai/dashboard', icon: '⚡' },
    { key: 'REPLICATE_API_TOKEN', name: 'Replicate', url: 'https://replicate.com', icon: '🚀' },
    { key: 'CIVITAI_TOKEN', name: 'Civitai', url: 'https://civitai.com', icon: '🎨' }
];

const DEFAULT_BOOKMARKS = [
    { name: 'VibeBoard', url: 'http://localhost:3000', icon: '🏠' },
    { name: 'ComfyUI', url: 'http://localhost:8188', icon: '🕸️' },
    { name: 'Google Studio', url: 'https://aistudio.google.com', icon: '🧠' }
];

function loadBookmarks() {
    let bookmarks = [...DEFAULT_BOOKMARKS];

    // 1. Load User Bookmarks
    try {
        if (fs.existsSync(BOOKMARKS_FILE)) {
            const saved = JSON.parse(fs.readFileSync(BOOKMARKS_FILE, 'utf8'));
            // Merge unique
            saved.forEach(b => {
                if (!bookmarks.find(x => x.url === b.url)) bookmarks.push(b);
            });
        }
    } catch (e) {
        console.error("Failed to load bookmarks", e);
    }

    // 2. Scan for Smart Bookmarks via .env
    try {
        if (fs.existsSync(ENV_FILE)) {
            const envContent = fs.readFileSync(ENV_FILE, 'utf8');
            SMART_PATTERNS.forEach(pattern => {
                if (envContent.includes(pattern.key + '=') && !bookmarks.find(b => b.url === pattern.url)) {
                    bookmarks.push({ name: pattern.name, url: pattern.url, icon: pattern.icon });
                }
            });
        }
    } catch (e) {
        console.error("Failed to scan .env", e);
    }

    return bookmarks;
}

function saveBookmarks(newBookmark) {
    let bookmarks = loadBookmarks();
    if (!bookmarks.find(b => b.url === newBookmark.url)) {
        bookmarks.push(newBookmark);
        fs.writeFileSync(BOOKMARKS_FILE, JSON.stringify(bookmarks, null, 2));
    }
    return bookmarks;
}

function deleteBookmark(targetUrl) {
    let bookmarks = loadBookmarks();
    bookmarks = bookmarks.filter(b => b.url !== targetUrl);
    fs.writeFileSync(BOOKMARKS_FILE, JSON.stringify(bookmarks, null, 2));
    return bookmarks;
}


const createWindow = () => {
    // Session persistence is automatic with 'userData' by default
    // We explicitly verify the partition
    const ses = session.fromPartition('persist:antigravity');

    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        backgroundColor: '#1a1a1a',
        titleBarStyle: 'hiddenInset',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            session: ses,
            // Enable standard browser features
            spellcheck: true,
            sandbox: true
        }
    });

    // Strip User Agent to avoid some "automation" detection, though standard Electron UA usually works
    mainWindow.webContents.setUserAgent(mainWindow.webContents.getUserAgent().replace('Electron/' + process.versions.electron, '').replace('antigravity-browser/1.0.0', ''));

    // Main VibeBoard App
    mainWindow.loadURL('http://localhost:3000');

    // Menu Setup
    const menu = Menu.buildFromTemplate([
        {
            label: 'Antigravity',
            submenu: [
                { role: 'quit' }
            ]
        },
        {
            label: 'Navigation',
            submenu: [
                { label: 'Go Back', accelerator: 'CmdOrCtrl+[', click: () => mainWindow.webContents.goBack() },
                { label: 'Go Forward', accelerator: 'CmdOrCtrl+]', click: () => mainWindow.webContents.goForward() },
                { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow.webContents.reload() },
                { type: 'separator' },
                { label: 'Bookmarks', accelerator: 'CmdOrCtrl+B', click: showBookmarksMenu }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'toggledevtools' }
            ]
        }
    ]);
    Menu.setApplicationMenu(menu);

    // Initial Load - Check if backend is ready
    mainWindow.webContents.on('did-fail-load', () => {
        // Backend might not be ready, retry in 2s
        setTimeout(() => {
            if (mainWindow) mainWindow.loadURL('http://localhost:3000');
        }, 2000);
    });

    mainWindow.webContents.on('did-navigate', (event, url) => {
        mainWindow.webContents.send('url-changed', url);
        mainWindow.setTitle(`Antigravity: ${mainWindow.webContents.getTitle()}`);
    });

    // Context Menu for Right-Click
    mainWindow.webContents.on('context-menu', (event, params) => {
        const menuTemplate = [];

        if (params.isEditable) {
            menuTemplate.push({ role: 'undo' });
            menuTemplate.push({ role: 'redo' });
            menuTemplate.push({ type: 'separator' });
            menuTemplate.push({ role: 'cut' });
            menuTemplate.push({ role: 'copy' });
            menuTemplate.push({ role: 'paste' });
            menuTemplate.push({ role: 'selectAll' });
        } else if (params.selectionText && params.selectionText.trim().length > 0) {
            menuTemplate.push({ role: 'copy' });
        }

        if (params.mediaType === 'image') {
            menuTemplate.push({
                label: 'Save Image As...',
                click: () => mainWindow.webContents.downloadURL(params.srcURL)
            });
            menuTemplate.push({
                label: 'Copy Image',
                click: () => mainWindow.webContents.copyImageAt(params.x, params.y)
            });
            menuTemplate.push({
                label: 'Open Image in New Tab',
                click: () => mainWindow.loadURL(params.srcURL)
            });
        } else if (params.mediaType === 'video') {
            menuTemplate.push({
                label: 'Save Video As...',
                click: () => mainWindow.webContents.downloadURL(params.srcURL)
            });
        }

        // Always add Inspect Element for debugging (can be removed in prod)
        if (menuTemplate.length > 0) {
            menuTemplate.push({ type: 'separator' });
        }

        menuTemplate.push({
            label: 'Copy Console Messages',
            enabled: consoleBuffer.length > 0,
            click: () => {
                const text = consoleBuffer.join('\n');
                require('electron').clipboard.writeText(text);
                // Optional: Notify user? simpler to just copy.
            }
        });

        menuTemplate.push({ type: 'separator' });

        menuTemplate.push({
            label: 'Inspect Element',
            click: () => mainWindow.webContents.inspectElement(params.x, params.y)
        });

        if (menuTemplate.length > 0) {
            const menu = Menu.buildFromTemplate(menuTemplate);
            menu.popup(mainWindow);
        }
    });
};

function showBookmarksMenu() {
    const bookmarks = loadBookmarks();
    const menuTemplate = bookmarks.map(b => ({
        label: `${b.icon} ${b.name}`,
        click: () => mainWindow.loadURL(b.url)
    }));

    menuTemplate.push({ type: 'separator' });
    menuTemplate.push({
        label: '➕ Bookmark Current Page',
        click: async () => {
            const url = mainWindow.webContents.getURL();
            const name = mainWindow.webContents.getTitle();
            saveBookmarks({ name, url, icon: '📌' });
        }
    });

    const menu = Menu.buildFromTemplate(menuTemplate);
    menu.popup();
}


app.whenReady().then(() => {
    createWindow();

    ipcMain.handle('get-bookmarks', () => loadBookmarks());
    ipcMain.handle('save-bookmark', (e, bookmark) => saveBookmarks(bookmark));
    ipcMain.handle('delete-bookmark', (e, url) => deleteBookmark(url));
    ipcMain.on('load-url', (e, url) => mainWindow.loadURL(url));
    ipcMain.handle('get-current-url', () => mainWindow.webContents.getURL());

    // Console Logging System
    ipcMain.on('console-message', (event, data) => {
        const logEntry = `[${data.timestamp}] [${data.type.toUpperCase()}] ${data.message}`;
        consoleBuffer.push(logEntry);
        if (consoleBuffer.length > MAX_BUFFER_SIZE) consoleBuffer.shift();

        // Also log errors to file as before
        if (data.type === 'error') {
            const fileEntry = `[${data.timestamp}] [${data.url}]\n${data.message}\n----------------------------------------\n`;
            fs.appendFile(ERROR_LOG_FILE, fileEntry, (err) => {
                if (err) console.error("Failed to write to error log", err);
            });
        }
    });

    // Performance Logging

    // Performance Logging
    ipcMain.on('console-performance', (event, data) => {
        const slowList = data.slowResources.map(r => `  - ${r.name} (${r.duration}ms)`).join('\n');
        const logEntry = `[${data.timestamp}] [${data.url}]\nLoad: ${data.loadTime}ms | DOM: ${data.domContent}ms\nSlowest Resources:\n${slowList || '  (None)'}\n----------------------------------------\n`;
        fs.appendFile(PERF_LOG_FILE, logEntry, (err) => {
            if (err) console.error("Failed to write to performance log", err);
        });
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
