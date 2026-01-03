'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Check,
  X,
  Reply,
  Trash2,
  ChevronDown,
  AlertCircle,
  ThumbsUp,
} from 'lucide-react';
import clsx from 'clsx';

interface Coordinates {
  x: number;
  y: number;
}

interface Comment {
  id: string;
  text: string;
  timestamp: number | null;
  coordinates: string | null; // JSON string
  type: 'note' | 'approval' | 'revision' | 'blocker';
  resolved: boolean;
  resolvedAt: string | null;
  resolvedBy: string | null;
  userId: string;
  userName: string;
  userAvatar: string | null;
  createdAt: string;
  replies?: Comment[];
}

interface AnnotationOverlayProps {
  generationId: string;
  mediaType: 'image' | 'video';
  currentTime?: number; // For video - current playback time
  onTimeClick?: (time: number) => void; // Seek video to timestamp
  isEditing?: boolean; // Whether we're in annotation mode
  onCommentChange?: () => void; // Callback when comments are added/updated/deleted
  className?: string;
}

const COMMENT_TYPES = [
  {
    value: 'note',
    label: 'Note',
    color: 'text-blue-400',
    bg: 'bg-blue-500/20',
    icon: MessageSquare,
  },
  {
    value: 'approval',
    label: 'Approval',
    color: 'text-green-400',
    bg: 'bg-green-500/20',
    icon: ThumbsUp,
  },
  {
    value: 'revision',
    label: 'Revision',
    color: 'text-amber-400',
    bg: 'bg-amber-500/20',
    icon: AlertCircle,
  },
  { value: 'blocker', label: 'Blocker', color: 'text-red-400', bg: 'bg-red-500/20', icon: X },
];

export function AnnotationOverlay({
  generationId,
  mediaType,
  currentTime = 0,
  onTimeClick,
  isEditing = false,
  onCommentChange,
  className,
}: AnnotationOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingPin, setPendingPin] = useState<Coordinates | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentType, setNewCommentType] = useState<
    'note' | 'approval' | 'revision' | 'blocker'
  >('note');
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [replyText, setReplyText] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Fetch comments
  const fetchComments = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch(
        `${apiUrl}/api/generations/${generationId}/comments?resolved=${showResolved}`
      );
      const data = await res.json();
      if (data.success) {
        setComments(data.comments);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [apiUrl, generationId, showResolved]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Handle click to place pin
  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isEditing || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      setPendingPin({ x, y });
      setSelectedComment(null);
    },
    [isEditing]
  );

  // Create comment
  const handleCreateComment = useCallback(async () => {
    if (!newCommentText.trim()) return;

    try {
      const res = await fetch(`${apiUrl}/api/generations/${generationId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newCommentText,
          timestamp: mediaType === 'video' ? currentTime : null,
          coordinates: pendingPin,
          type: newCommentType,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setComments(prev => [...prev, data.comment]);
        setNewCommentText('');
        setPendingPin(null);
        setNewCommentType('note');
        onCommentChange?.(); // Notify parent
      }
    } catch (error) {
      console.error('Failed to create comment:', error);
    }
  }, [
    apiUrl,
    generationId,
    newCommentText,
    pendingPin,
    currentTime,
    mediaType,
    newCommentType,
    onCommentChange,
  ]);

  // Reply to comment
  const handleReply = useCallback(
    async (parentId: string) => {
      if (!replyText.trim()) return;

      try {
        const res = await fetch(`${apiUrl}/api/generations/${generationId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: replyText,
            parentId,
          }),
        });

        const data = await res.json();
        if (data.success) {
          fetchComments(); // Refresh to get updated threads
          setReplyText('');
          onCommentChange?.(); // Notify parent
        }
      } catch (error) {
        console.error('Failed to reply:', error);
      }
    },
    [apiUrl, generationId, replyText, fetchComments, onCommentChange]
  );

  // Toggle resolved
  const handleToggleResolved = useCallback(
    async (commentId: string) => {
      try {
        const res = await fetch(`${apiUrl}/api/comments/${commentId}/toggle-resolved`, {
          method: 'POST',
        });

        const data = await res.json();
        if (data.success) {
          setComments(prev => prev.map(c => (c.id === commentId ? data.comment : c)));
          if (selectedComment?.id === commentId) {
            setSelectedComment(data.comment);
          }
          onCommentChange?.(); // Notify parent
        }
      } catch (error) {
        console.error('Failed to toggle resolved:', error);
      }
    },
    [apiUrl, selectedComment, onCommentChange]
  );

  // Delete comment
  const handleDelete = useCallback(
    async (commentId: string) => {
      try {
        const res = await fetch(`${apiUrl}/api/comments/${commentId}`, {
          method: 'DELETE',
        });

        const data = await res.json();
        if (data.success) {
          setComments(prev => prev.filter(c => c.id !== commentId));
          if (selectedComment?.id === commentId) {
            setSelectedComment(null);
          }
          onCommentChange?.(); // Notify parent
        }
      } catch (error) {
        console.error('Failed to delete comment:', error);
      }
    },
    [apiUrl, selectedComment, onCommentChange]
  );

  // Parse coordinates from JSON string
  const parseCoordinates = (coordsStr: string | null): Coordinates | null => {
    if (!coordsStr) return null;
    try {
      return JSON.parse(coordsStr);
    } catch {
      return null;
    }
  };

  // Format timestamp
  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTypeConfig = (type: string) => {
    return COMMENT_TYPES.find(t => t.value === type) || COMMENT_TYPES[0];
  };

  return (
    <div
      ref={containerRef}
      className={clsx('relative h-full w-full', className)}
      onClick={handleOverlayClick}
    >
      {/* Annotation pins */}
      <AnimatePresence>
        {comments.map(comment => {
          const coords = parseCoordinates(comment.coordinates);
          if (!coords) return null;

          const typeConfig = getTypeConfig(comment.type);
          const Icon = typeConfig.icon;

          return (
            <motion.button
              key={comment.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              onClick={e => {
                e.stopPropagation();
                setSelectedComment(comment);
                setPendingPin(null);
              }}
              className={clsx(
                'absolute z-10 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 transition-transform hover:scale-110',
                comment.resolved
                  ? 'border-gray-500/50 bg-gray-900/80 text-gray-400'
                  : `border-white/30 ${typeConfig.bg} ${typeConfig.color}`,
                selectedComment?.id === comment.id && 'ring-2 ring-white/50'
              )}
              style={{
                left: `${coords.x * 100}%`,
                top: `${coords.y * 100}%`,
              }}
            >
              {comment.resolved ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </motion.button>
          );
        })}

        {/* Pending pin (new comment) */}
        {pendingPin && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${pendingPin.x * 100}%`,
              top: `${pendingPin.y * 100}%`,
            }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-cyan-400 bg-cyan-500/20 text-cyan-300 shadow-lg shadow-cyan-500/20">
              <MessageSquare className="h-5 w-5" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New comment input (when pin is placed) */}
      <AnimatePresence>
        {pendingPin && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute z-30 w-72 rounded-xl border border-white/10 bg-zinc-900/95 p-3 shadow-xl backdrop-blur-sm"
            style={{
              left: `${Math.min(pendingPin.x * 100, 70)}%`,
              top: `${pendingPin.y * 100 + 5}%`,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Type selector */}
            <div className="mb-2 flex gap-1">
              {COMMENT_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => setNewCommentType(type.value as typeof newCommentType)}
                  className={clsx(
                    'flex-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors',
                    newCommentType === type.value
                      ? `${type.bg} ${type.color}`
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>

            <textarea
              value={newCommentText}
              onChange={e => setNewCommentText(e.target.value)}
              placeholder="Add your comment..."
              className="h-20 w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-500/50"
              autoFocus
            />

            {mediaType === 'video' && (
              <div className="mt-2 text-xs text-gray-400">@ {formatTimestamp(currentTime)}</div>
            )}

            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={() => setPendingPin(null)}
                className="rounded-lg px-3 py-1.5 text-xs text-gray-400 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateComment}
                disabled={!newCommentText.trim()}
                className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-medium text-black hover:bg-cyan-400 disabled:opacity-50"
              >
                Add Comment
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected comment detail */}
      <AnimatePresence>
        {selectedComment && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="absolute top-4 right-4 z-30 w-80 rounded-xl border border-white/10 bg-zinc-900/95 shadow-xl backdrop-blur-sm"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 p-3">
              <div className="flex items-center gap-2">
                <span
                  className={clsx('text-sm font-medium', getTypeConfig(selectedComment.type).color)}
                >
                  {getTypeConfig(selectedComment.type).label}
                </span>
                {selectedComment.timestamp !== null && (
                  <button
                    onClick={() => onTimeClick?.(selectedComment.timestamp!)}
                    className="rounded bg-white/10 px-2 py-0.5 text-xs text-gray-300 hover:bg-white/20"
                  >
                    @ {formatTimestamp(selectedComment.timestamp)}
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedComment(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-3">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-xs font-bold text-white">
                  {selectedComment.userName[0]}
                </div>
                <span className="text-sm text-white">{selectedComment.userName}</span>
                <span className="text-xs text-gray-500">
                  {new Date(selectedComment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-gray-300">{selectedComment.text}</p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 border-t border-white/10 p-3">
              <button
                onClick={() => handleToggleResolved(selectedComment.id)}
                className={clsx(
                  'flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  selectedComment.resolved
                    ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                    : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                )}
              >
                <Check className="h-3 w-3" />
                {selectedComment.resolved ? 'Reopen' : 'Resolve'}
              </button>
              <button
                onClick={() => handleDelete(selectedComment.id)}
                className="flex items-center gap-1 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/30"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            </div>

            {/* Replies */}
            {selectedComment.replies && selectedComment.replies.length > 0 && (
              <div className="border-t border-white/10 p-3">
                <h4 className="mb-2 text-xs font-medium text-gray-400">
                  Replies ({selectedComment.replies.length})
                </h4>
                <div className="space-y-2">
                  {selectedComment.replies.map(reply => (
                    <div key={reply.id} className="rounded-lg bg-white/5 p-2">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-xs font-medium text-white">{reply.userName}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(reply.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300">{reply.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reply input */}
            <div className="border-t border-white/10 p-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="Reply..."
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-500/50"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      handleReply(selectedComment.id);
                    }
                  }}
                />
                <button
                  onClick={() => handleReply(selectedComment.id)}
                  disabled={!replyText.trim()}
                  className="rounded-lg bg-white/10 p-2 text-gray-400 hover:bg-white/20 disabled:opacity-50"
                >
                  <Reply className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comments list toggle (bottom-right) */}
      {!isEditing && comments.length > 0 && (
        <div className="absolute right-4 bottom-4 z-20">
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900/80 px-3 py-1.5 text-xs text-gray-300 backdrop-blur-sm hover:bg-zinc-800"
          >
            <MessageSquare className="h-4 w-4" />
            {comments.length} comment{comments.length !== 1 ? 's' : ''}
            <ChevronDown
              className={clsx('h-3 w-3 transition-transform', showResolved && 'rotate-180')}
            />
          </button>
        </div>
      )}

      {/* Edit mode indicator */}
      {isEditing && (
        <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-cyan-400/30">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-cyan-500/20 px-4 py-1.5 text-xs font-medium text-cyan-300 backdrop-blur-sm">
            Click to add annotation
          </div>
        </div>
      )}
    </div>
  );
}

export default AnnotationOverlay;
