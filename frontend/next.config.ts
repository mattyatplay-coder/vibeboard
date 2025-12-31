import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Optimize images
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
    ],
    // Use modern formats
    formats: ['image/avif', 'image/webp'],
    // Reduce image quality slightly for faster loads
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },

  // Experimental features for better performance
  experimental: {
    // Enable optimized package imports
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
      '@dnd-kit/utilities',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tooltip',
      'zustand',
    ],
  },

  // Turbopack config (Next.js 16 default bundler)
  turbopack: {},

  // Enable compression
  compress: true,

  // Power-user performance tweaks
  poweredByHeader: false,

  // Faster development builds
  onDemandEntries: {
    // period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 60 * 1000,
    // number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 5,
  },
};

export default nextConfig;
