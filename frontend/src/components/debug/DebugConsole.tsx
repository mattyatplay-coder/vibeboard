'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useVideoConsole } from '@/lib/video-console';
import { X, Copy, Trash2, Bug, ChevronDown, ChevronUp, Pause, Play } from 'lucide-react';
import clsx from 'clsx';
import { Tooltip } from '@/components/ui/Tooltip';

export const DebugConsole = () => {
  const { logs, isOpen, toggleOpen, clearLogs, addLog } = useVideoConsole();
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredLogs = logs.filter(log => (filter === 'all' ? true : log.level === filter));

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll, isOpen]);

  if (!isOpen) {
    return (
      <Tooltip content="Open Debug Console" side="right">
        <button
          onClick={toggleOpen}
          className="fixed bottom-4 left-4 z-50 rounded-full border border-white/10 bg-black/80 p-2 text-white shadow-lg transition-colors hover:bg-black"
        >
          <Bug className="h-5 w-5" />
        </button>
      </Tooltip>
    );
  }

  const copyLogs = () => {
    const text = filteredLogs
      .map(l => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed bottom-0 left-0 z-50 flex h-[300px] w-full flex-col border-t border-white/10 bg-[#0a0a0a] font-mono text-xs shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 font-bold text-white">
            <Bug className="h-4 w-4 text-purple-400" />
            Debug Console
          </span>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex gap-1">
            {(['all', 'error', 'warn', 'info'] as const).map(l => (
              <button
                key={l}
                onClick={() => setFilter(l)}
                className={clsx(
                  'rounded px-2 py-0.5 text-[10px] font-bold uppercase transition-colors',
                  filter === l ? 'bg-white/20 text-white' : 'text-gray-500 hover:text-gray-300'
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Tooltip content="Auto-scroll" side="top">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={clsx(
                'rounded p-1.5 transition-colors hover:bg-white/10',
                autoScroll ? 'text-green-400' : 'text-gray-400'
              )}
            >
              {autoScroll ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
          </Tooltip>
          <Tooltip content="Copy All" side="top">
            <button
              onClick={copyLogs}
              className="rounded p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Copy className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip content="Clear Console" side="top">
            <button
              onClick={clearLogs}
              className="rounded p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip content="Test Wan 2.5 Guide API" side="top">
            <button
              onClick={() => {
                fetch('/api/prompts/models/fal-ai%2Fwan-25-preview%2Ftext-to-video')
                  .then(res => res.json())
                  .then(data => {
                    console.log('API Test Result:', data);
                    addLog('info', ['API Test Result:', JSON.stringify(data)]);
                  })
                  .catch(err => {
                    console.error('API Test Failed:', err);
                    addLog('error', ['API Test Failed:', err.message]);
                  });
              }}
              className="rounded p-1.5 text-blue-400 transition-colors hover:bg-white/10 hover:text-blue-300"
            >
              <Bug className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip content="Close" side="top">
            <button
              onClick={toggleOpen}
              className="rounded p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Logs */}
      <div ref={scrollRef} className="flex-1 space-y-1 overflow-y-auto bg-black/50 p-4">
        {filteredLogs.length === 0 ? (
          <div className="text-gray-600 italic">No logs captured...</div>
        ) : (
          filteredLogs.map(log => (
            <div key={log.id} className="flex gap-2 rounded px-1 py-0.5 hover:bg-white/5">
              <span className="shrink-0 text-gray-500 select-none">
                {log.timestamp.split('T')[1].split('.')[0]}
              </span>
              <span
                className={clsx(
                  'w-12 shrink-0 font-bold uppercase',
                  log.level === 'error'
                    ? 'text-red-500'
                    : log.level === 'warn'
                      ? 'text-yellow-500'
                      : 'text-blue-500'
                )}
              >
                {log.level}
              </span>
              <span
                className={clsx(
                  'break-all whitespace-pre-wrap',
                  log.level === 'error'
                    ? 'text-red-300'
                    : log.level === 'warn'
                      ? 'text-yellow-100'
                      : 'text-gray-300'
                )}
              >
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
