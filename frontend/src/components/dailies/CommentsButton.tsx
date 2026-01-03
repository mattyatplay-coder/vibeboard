'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, AlertCircle, Check } from 'lucide-react';
import clsx from 'clsx';
import { Tooltip } from '@/components/ui/Tooltip';

interface CommentStats {
  total: number;
  resolved: number;
  unresolved: number;
  byType: {
    note?: number;
    approval?: number;
    revision?: number;
    blocker?: number;
  };
}

interface CommentsButtonProps {
  generationId: string;
  onClick?: () => void;
  className?: string;
}

export function CommentsButton({ generationId, onClick, className }: CommentsButtonProps) {
  const [stats, setStats] = useState<CommentStats | null>(null);

  // Fetch comment stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/generations/${generationId}/comments/stats`);
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch comment stats:', error);
    }
  }, [generationId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Determine badge color based on comment types
  const getBadgeColor = () => {
    if (!stats || stats.total === 0) return 'bg-gray-500/50';
    if (stats.byType.blocker && stats.byType.blocker > 0) return 'bg-red-500';
    if (stats.byType.revision && stats.byType.revision > 0) return 'bg-amber-500';
    if (stats.unresolved > 0) return 'bg-blue-500';
    return 'bg-green-500';
  };

  // Tooltip text
  const getTooltip = () => {
    if (!stats || stats.total === 0) return 'Add comment';
    const parts = [];
    if (stats.unresolved > 0) parts.push(`${stats.unresolved} open`);
    if (stats.resolved > 0) parts.push(`${stats.resolved} resolved`);
    if (stats.byType.blocker) parts.push(`${stats.byType.blocker} blockers`);
    return parts.length > 0 ? parts.join(', ') : `${stats.total} comments`;
  };

  const hasBlockers = stats?.byType.blocker && stats.byType.blocker > 0;
  const hasUnresolved = stats && stats.unresolved > 0;

  return (
    <Tooltip content={getTooltip()} side="top">
      <button
        onClick={e => {
          e.stopPropagation();
          onClick?.();
        }}
        className={clsx(
          'relative flex h-[clamp(24px,8cqw,36px)] w-[clamp(24px,8cqw,36px)] items-center justify-center rounded backdrop-blur-sm transition-colors',
          hasBlockers
            ? 'bg-red-600/80 hover:bg-red-500'
            : hasUnresolved
              ? 'bg-amber-600/80 hover:bg-amber-500'
              : 'bg-black/50 hover:bg-white/20',
          className
        )}
        aria-label="Comments"
      >
        <MessageSquare className="h-[60%] w-[60%] text-white" />

        {/* Badge */}
        {stats && stats.total > 0 && (
          <span
            className={clsx(
              'absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white',
              getBadgeColor()
            )}
          >
            {stats.total > 99 ? '99+' : stats.total}
          </span>
        )}

        {/* All resolved indicator */}
        {stats && stats.total > 0 && stats.unresolved === 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-white">
            <Check className="h-3 w-3" />
          </span>
        )}
      </button>
    </Tooltip>
  );
}

export default CommentsButton;
