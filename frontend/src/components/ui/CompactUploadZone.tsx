'use client';

import React from 'react';
import { useDropzone, DropzoneOptions } from 'react-dropzone';
import { Upload, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

interface CompactUploadZoneProps {
  onDrop: DropzoneOptions['onDrop'];
  accept?: DropzoneOptions['accept'];
  isUploading?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * CompactUploadZone - Minimal Upload Button
 *
 * Replaces the massive dashed upload zone with a small button.
 * The entire grid area becomes a subtle drop zone instead.
 *
 * @example
 * <CompactUploadZone
 *   onDrop={handleDrop}
 *   accept={{ 'image/*': [], 'video/*': [] }}
 *   isUploading={uploading}
 * />
 */
export const CompactUploadZone = ({
  onDrop,
  accept = { 'image/*': [], 'video/*': [] },
  isUploading = false,
  disabled = false,
  className,
}: CompactUploadZoneProps) => {
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept,
    noClick: true,
    disabled,
  });

  return (
    <div {...getRootProps()} className={className}>
      <input {...getInputProps()} />

      <motion.button
        onClick={open}
        disabled={disabled || isUploading}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={clsx(
          'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
          'border border-white/10 bg-white/5 text-zinc-300',
          'hover:border-white/20 hover:bg-white/10 hover:text-white',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isDragActive && 'border-violet-500/30 bg-violet-500/10 text-violet-300'
        )}
      >
        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, rotate: 0 }}
              animate={{ opacity: 1, rotate: 360 }}
              exit={{ opacity: 0 }}
              transition={{ rotate: { duration: 1, repeat: Infinity, ease: 'linear' } }}
            >
              <Loader2 size={16} />
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Upload size={16} />
            </motion.div>
          )}
        </AnimatePresence>
        <span>{isUploading ? 'Uploading...' : 'Upload'}</span>
      </motion.button>
    </div>
  );
};

/**
 * GlobalDropOverlay - Full-screen drop indicator
 *
 * Shows when files are being dragged anywhere on the page.
 * Use with a global drag listener.
 */
export const GlobalDropOverlay = ({ isActive }: { isActive: boolean }) => {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-4 z-50 flex items-center justify-center rounded-2xl border-2 border-dashed border-violet-500 bg-zinc-950/90 backdrop-blur-sm"
        >
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/20">
              <Upload size={32} className="text-violet-400" />
            </div>
            <p className="text-lg font-semibold text-white">Drop to Ingest</p>
            <p className="mt-1 text-sm text-zinc-500">Release to upload files</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CompactUploadZone;
