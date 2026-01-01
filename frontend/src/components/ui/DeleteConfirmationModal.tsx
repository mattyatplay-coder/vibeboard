'use client';

/**
 * DeleteConfirmationModal
 *
 * A reusable Radix AlertDialog-based confirmation modal that replaces
 * the browser's native confirm() dialog with a styled, accessible modal.
 *
 * UX-003: Provides a consistent, professional delete confirmation experience.
 */

import React from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  itemName?: string; // Name of the item being deleted
  isDestructive?: boolean;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Delete Item',
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  itemName,
  isDestructive = true,
}: DeleteConfirmationModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <AlertDialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <AlertDialog.Portal forceMount>
            <AlertDialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
              />
            </AlertDialog.Overlay>
            <AlertDialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2 }}
                className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-zinc-900 p-6 shadow-2xl"
              >
                {/* Icon and Title */}
                <div className="mb-4 flex items-start gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                    isDestructive ? 'bg-red-500/20' : 'bg-amber-500/20'
                  }`}>
                    {isDestructive ? (
                      <Trash2 className="h-6 w-6 text-red-400" />
                    ) : (
                      <AlertTriangle className="h-6 w-6 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <AlertDialog.Title className="text-lg font-semibold text-white">
                      {title}
                    </AlertDialog.Title>
                    {itemName && (
                      <p className="mt-1 text-sm text-gray-400">
                        <span className="font-medium text-white">&ldquo;{itemName}&rdquo;</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <AlertDialog.Description className="mb-6 text-sm text-gray-400">
                  {description || 'This action cannot be undone. Are you sure you want to continue?'}
                </AlertDialog.Description>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <AlertDialog.Cancel asChild>
                    <button
                      className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10"
                    >
                      {cancelLabel}
                    </button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action asChild>
                    <button
                      onClick={handleConfirm}
                      className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
                        isDestructive
                          ? 'bg-red-500 hover:bg-red-600'
                          : 'bg-amber-500 hover:bg-amber-600'
                      }`}
                    >
                      {confirmLabel}
                    </button>
                  </AlertDialog.Action>
                </div>
              </motion.div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        )}
      </AnimatePresence>
    </AlertDialog.Root>
  );
}

export default DeleteConfirmationModal;
