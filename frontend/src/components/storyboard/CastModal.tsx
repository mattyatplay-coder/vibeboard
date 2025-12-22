'use client';

import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

interface CastModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export function CastModal({ isOpen, onClose, projectId }: CastModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative flex w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 rounded-full bg-black/5 p-1 text-gray-500 transition-colors hover:bg-black/10"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Content */}
            <div className="p-6 pt-12 text-center">
              {/* Avatar Grid Placeholder */}
              <div className="mb-6 grid grid-cols-3 gap-2 opacity-80">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`}
                      alt="Cast member"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>

              <h2 className="mb-2 text-xl font-bold text-gray-900">See your cast in Elements</h2>
              <p className="mb-8 text-sm text-gray-500">
                Check out this project's characters, major props, locations, and more, in the
                Elements section.
              </p>

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
                >
                  Got it
                </button>
                <Link
                  href={`/projects/${projectId}/elements`}
                  className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700"
                >
                  Explore Elements
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
