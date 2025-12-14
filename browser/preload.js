const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    saveBookmark: (bookmark) => ipcRenderer.invoke('save-bookmark', bookmark),
    getBookmarks: () => ipcRenderer.invoke('get-bookmarks'),
    deleteBookmark: (url) => ipcRenderer.invoke('delete-bookmark', url),
    loadUrl: (url) => ipcRenderer.send('load-url', url),
    getCurrentUrl: () => ipcRenderer.invoke('get-current-url'),
    onUrlChanged: (callback) => ipcRenderer.on('url-changed', (_event, url) => callback(url))
});

// Console Bridge: Capture logs, warnings, and errors
const captureConsole = (type) => {
    const original = console[type];
    console[type] = (...args) => {
        const message = args.map(arg => {
            if (arg instanceof Error) return arg.stack || arg.message;
            if (typeof arg === 'object') return JSON.stringify(arg);
            return String(arg);
        }).join(' ');

        ipcRenderer.send('console-message', {
            type,
            message,
            url: window.location.href,
            timestamp: new Date().toISOString()
        });

        original.apply(console, args);
    };
};

['log', 'warn', 'error'].forEach(captureConsole);

// Performance Monitor: Capture load times and bottlenecks
window.addEventListener('load', () => {
    // Wait a brief moment for any post-load execution
    setTimeout(() => {
        const nav = performance.getEntriesByType('navigation')[0] || {};
        const resources = performance.getEntriesByType('resource');

        // Filter for slow resources (> 500ms)
        const slowResources = resources
            .filter(r => r.duration > 500)
            .map(r => ({
                name: r.name ? r.name.split('/').pop().split('?')[0] : 'unknown',
                duration: Math.round(r.duration),
                type: r.initiatorType
            }))
            .slice(0, 10); // Top 10 only

        const metrics = {
            url: window.location.href,
            timestamp: new Date().toISOString(),
            loadTime: Math.round(nav.loadEventEnd - nav.startTime),
            domContent: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
            slowResources
        };

        if (metrics.loadTime > 0) {
            ipcRenderer.send('console-performance', metrics);
        }
    }, 1000);
});
