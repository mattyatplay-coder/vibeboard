import { create } from 'zustand';

export interface LogEntry {
    id: string;
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    args: unknown[];
}

interface VideoConsoleStore {
    logs: LogEntry[];
    isOpen: boolean;
    addLog: (level: 'info' | 'warn' | 'error', args: unknown[]) => void;
    clearLogs: () => void;
    toggleOpen: () => void;
    setOpen: (open: boolean) => void;
}

export const useVideoConsole = create<VideoConsoleStore>((set) => ({
    logs: [],
    isOpen: false,
    addLog: (level, args) => {
        const entry: LogEntry = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            level,
            message: args.map(a =>
                typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)
            ).join(' '),
            args
        };

        set((state) => ({
            logs: [...state.logs, entry].slice(-1000) // Keep last 1000 logs
        }));
    },
    clearLogs: () => set({ logs: [] }),
    toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
    setOpen: (open) => set({ isOpen: open })
}));

// Singleton to intercept console once
let isIntercepted = false;

export const initVideoConsole = () => {
    if (typeof window === 'undefined' || isIntercepted) return;

    isIntercepted = true;
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args) => {
        useVideoConsole.getState().addLog('info', args);
        originalLog(...args);
    };

    console.warn = (...args) => {
        useVideoConsole.getState().addLog('warn', args);
        originalWarn(...args);
    };

    console.error = (...args) => {
        useVideoConsole.getState().addLog('error', args);
        originalError(...args);
    };
};
