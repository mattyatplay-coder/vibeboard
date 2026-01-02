'use client';

import { StudioShell } from '@/components/layout/StudioShell';
import { SessionProvider } from '@/context/SessionContext';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <StudioShell>
        {children}
      </StudioShell>
    </SessionProvider>
  );
}
