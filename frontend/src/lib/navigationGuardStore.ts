/**
 * Navigation Guard Store
 *
 * Allows pages to signal they have active work in progress that shouldn't be interrupted.
 * The Sidebar and other navigation components can check this before allowing navigation.
 */

import { create } from 'zustand';

interface NavigationGuardState {
  // Whether navigation should be blocked
  isBlocked: boolean;

  // Message to show if user tries to navigate
  blockMessage: string;

  // Page that set the block
  blockingPage: string | null;

  // Actions
  setBlocked: (blocked: boolean, message?: string, page?: string) => void;
  clearBlock: () => void;

  // Confirmation callback for when user confirms they want to leave
  pendingNavigation: string | null;
  setPendingNavigation: (href: string | null) => void;

  // Modal state
  showConfirmModal: boolean;
  setShowConfirmModal: (show: boolean) => void;
}

export const useNavigationGuardStore = create<NavigationGuardState>((set) => ({
  isBlocked: false,
  blockMessage: 'You have unsaved work. Are you sure you want to leave?',
  blockingPage: null,
  pendingNavigation: null,
  showConfirmModal: false,

  setBlocked: (blocked, message, page) => set({
    isBlocked: blocked,
    blockMessage: message || 'You have unsaved work. Are you sure you want to leave?',
    blockingPage: page || null,
  }),

  clearBlock: () => set({
    isBlocked: false,
    blockMessage: 'You have unsaved work. Are you sure you want to leave?',
    blockingPage: null,
  }),

  setPendingNavigation: (href) => set({ pendingNavigation: href }),

  setShowConfirmModal: (show) => set({ showConfirmModal: show }),
}));

/**
 * Hook for pages to use for blocking navigation during active work
 */
export function useNavigationGuard(pageName: string) {
  const { setBlocked, clearBlock } = useNavigationGuardStore();

  return {
    blockNavigation: (message?: string) => setBlocked(true, message, pageName),
    allowNavigation: () => clearBlock(),
  };
}
