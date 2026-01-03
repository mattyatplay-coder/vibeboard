'use client';

import { motion } from 'framer-motion';

/**
 * Studio Page Transition Template
 *
 * Creates a cinematic cross-dissolve effect between pages.
 * Uses spring physics for organic, weighty movement.
 * The blur effect adds "depth of field" during transition.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -10, filter: 'blur(10px)' }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
        mass: 0.5,
      }}
      className="h-full min-h-0 w-full flex-1"
    >
      {children}
    </motion.div>
  );
}
