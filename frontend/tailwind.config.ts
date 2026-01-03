import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
    darkMode: "class",
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            // Elastic Studio Breakpoints
            screens: {
                '3xl': '1920px', // Pro Display / Ultrawide breakpoint
                '4xl': '2560px', // 4K / Large external monitor
            },
            colors: {
                // Base Palette - Midnight
                background: "#09090b", // Zinc-950 - slightly warmer than pure black
                surface: "#18181b",    // Zinc-900
                elevated: "#27272a",   // Zinc-800

                // Legacy support
                foreground: "var(--foreground)",

                // Accent Colors - Neon
                creative: {
                    DEFAULT: "#8b5cf6", // Violet-500
                    foreground: "#ddd6fe",
                    glow: "rgba(139, 92, 246, 0.5)"
                },
                technical: {
                    DEFAULT: "#22d3ee", // Cyan-400
                    foreground: "#cffafe",
                    glow: "rgba(34, 211, 238, 0.5)"
                },
                warning: {
                    DEFAULT: "#f59e0b", // Amber-500
                    glow: "rgba(245, 158, 11, 0.5)"
                },
            },
            fontFamily: {
                sans: ["var(--font-inter)", ...defaultTheme.fontFamily.sans],
                mono: ["var(--font-jetbrains-mono)", ...defaultTheme.fontFamily.mono],
            },
            boxShadow: {
                'neon-violet': '0 0 20px -5px rgba(139, 92, 246, 0.4)',
                'neon-cyan': '0 0 15px -3px rgba(34, 211, 238, 0.4)',
                'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'glass-gradient': 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
            },
            // Kinetic Animations
            keyframes: {
                shimmer: {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(100%)' },
                },
            },
            animation: {
                shimmer: 'shimmer 1.5s infinite',
            },
        },
    },
    plugins: [],
};
export default config;
