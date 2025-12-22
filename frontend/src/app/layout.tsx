import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SessionProvider } from '@/context/SessionContext';

import { DebugConsole } from '@/components/debug/DebugConsole';
import { initVideoConsole } from '@/lib/video-console'; // Initialize interceptor
import { Toaster } from '@/components/ui/Toaster';

// Initialize console interception on client side
if (typeof window !== 'undefined') {
  initVideoConsole();
}

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'VibeBoard Studio',
  description: 'AI-Powered Cinematic Production Suite',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} ${inter.variable}`} suppressHydrationWarning>
        <SessionProvider>
          <div className="relative min-h-screen">
            <main id="main-content">{children}</main>
            <DebugConsole />
          </div>
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
