'use client';

import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: '#1a1a1a',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#fff',
        },
        className: 'rounded-lg shadow-xl',
      }}
      theme="dark"
      richColors
      closeButton
    />
  );
}
