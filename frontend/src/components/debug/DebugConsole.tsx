"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useVideoConsole } from '@/lib/video-console';
import { X, Copy, Trash2, Bug, ChevronDown, ChevronUp, Pause, Play } from 'lucide-react';
import clsx from 'clsx';

export const DebugConsole = () => {
    const { logs, isOpen, toggleOpen, clearLogs } = useVideoConsole();
    const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
    const [autoScroll, setAutoScroll] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    const filteredLogs = logs.filter(log =>
        filter === 'all' ? true : log.level === filter
    );

    useEffect(() => {
        if (autoScroll && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [filteredLogs, autoScroll, isOpen]);

    if (!isOpen) {
        return (
            <button
                onClick={toggleOpen}
                className="fixed bottom-4 left-4 z-50 p-2 bg-black/80 hover:bg-black text-white rounded-full shadow-lg border border-white/10 transition-colors"
                title="Open Debug Console"
            >
                <Bug className="w-5 h-5" />
            </button>
        );
    }

    const copyLogs = () => {
        const text = filteredLogs.map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join('\n');
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="fixed bottom-0 left-0 w-full h-[300px] z-50 bg-[#0a0a0a] border-t border-white/10 flex flex-col shadow-2xl font-mono text-xs">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-white flex items-center gap-2">
                        <Bug className="w-4 h-4 text-purple-400" />
                        Debug Console
                    </span>
                    <div className="h-4 w-px bg-white/10" />
                    <div className="flex gap-1">
                        {(['all', 'error', 'warn', 'info'] as const).map(l => (
                            <button
                                key={l}
                                onClick={() => setFilter(l)}
                                className={clsx(
                                    "px-2 py-0.5 rounded uppercase text-[10px] font-bold transition-colors",
                                    filter === l
                                        ? "bg-white/20 text-white"
                                        : "text-gray-500 hover:text-gray-300"
                                )}
                            >
                                {l}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setAutoScroll(!autoScroll)}
                        className={clsx(
                            "p-1.5 rounded hover:bg-white/10 transition-colors",
                            autoScroll ? "text-green-400" : "text-gray-400"
                        )}
                        title="Auto-scroll"
                    >
                        {autoScroll ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={copyLogs}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                        title="Copy All"
                    >
                        <Copy className="w-4 h-4" />
                    </button>
                    <button
                        onClick={clearLogs}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-white/10 rounded transition-colors"
                        title="Clear Console"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => {
                            fetch('/api/prompts/models/fal-ai%2Fwan-25-preview%2Ftext-to-video')
                                .then(res => res.json())
                                .then(data => {
                                    console.log('API Test Result:', data);
                                    addLog('info', 'API Test Result: ' + JSON.stringify(data));
                                })
                                .catch(err => {
                                    console.error('API Test Failed:', err);
                                    addLog('error', 'API Test Failed: ' + err.message);
                                });
                        }}
                        className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-white/10 rounded transition-colors"
                        title="Test Wan 2.5 Guide API"
                    >
                        <Bug className="w-4 h-4" />
                    </button>
                    <button
                        onClick={toggleOpen}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                        title="Close"
                    >
                        <ChevronDown className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Logs */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-1 bg-black/50"
            >
                {filteredLogs.length === 0 ? (
                    <div className="text-gray-600 italic">No logs captured...</div>
                ) : (
                    filteredLogs.map(log => (
                        <div key={log.id} className="flex gap-2 hover:bg-white/5 py-0.5 px-1 rounded">
                            <span className="text-gray-500 shrink-0 select-none">
                                {log.timestamp.split('T')[1].split('.')[0]}
                            </span>
                            <span className={clsx(
                                "uppercase font-bold shrink-0 w-12",
                                log.level === 'error' ? "text-red-500" :
                                    log.level === 'warn' ? "text-yellow-500" :
                                        "text-blue-500"
                            )}>
                                {log.level}
                            </span>
                            <span className={clsx(
                                "break-all whitespace-pre-wrap",
                                log.level === 'error' ? "text-red-300" :
                                    log.level === 'warn' ? "text-yellow-100" :
                                        "text-gray-300"
                            )}>
                                {log.message}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
