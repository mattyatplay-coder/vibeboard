"use client";

import React from "react";
import { clsx } from "clsx";

interface DynamicRatioIconProps {
    ratio: string;
    className?: string;
    size?: "sm" | "md" | "lg";
}

/**
 * Dynamic Aspect Ratio Icon - Visual representation of aspect ratio
 * Shows a morphing rectangle that matches the current ratio
 */
export function DynamicRatioIcon({ ratio, className, size = "md" }: DynamicRatioIconProps) {
    // Size mappings
    const containerSizes = {
        sm: "w-4 h-4",
        md: "w-6 h-6",
        lg: "w-8 h-8",
    };

    // Map ratios to dimensions - these are relative to container
    const dimensions: Record<string, string> = {
        "16:9": "w-5 h-3",
        "9:16": "w-3 h-5",
        "1:1": "w-4 h-4",
        "4:3": "w-4 h-3",
        "3:4": "w-3 h-4",
        "21:9": "w-6 h-2.5",
        "2.35:1": "w-6 h-2.5",
        "3:2": "w-4.5 h-3",
        "2:3": "w-3 h-4.5",
    };

    // Fallback for unknown ratios - parse and calculate
    const getDimensionClass = () => {
        if (dimensions[ratio]) return dimensions[ratio];

        // Parse custom ratio like "2.35:1"
        const parts = ratio.split(":");
        if (parts.length === 2) {
            const w = parseFloat(parts[0]);
            const h = parseFloat(parts[1]);
            const aspectRatio = w / h;

            if (aspectRatio > 2) return "w-6 h-2.5"; // Ultra wide
            if (aspectRatio > 1.5) return "w-5 h-3"; // Wide
            if (aspectRatio > 0.9 && aspectRatio < 1.1) return "w-4 h-4"; // Square
            if (aspectRatio < 0.7) return "w-3 h-5"; // Tall portrait
            return "w-4 h-3"; // Standard
        }

        return "w-5 h-3"; // Default to 16:9-ish
    };

    return (
        <div className={clsx(
            "flex items-center justify-center",
            containerSizes[size],
            className
        )}>
            <div
                className={clsx(
                    "border-2 border-current rounded-[2px] transition-all duration-300 ease-out",
                    getDimensionClass()
                )}
            />
        </div>
    );
}

/**
 * Animated version with frame guides
 */
export function DynamicRatioIconAnimated({ ratio, className, size = "md" }: DynamicRatioIconProps) {
    const containerSizes = {
        sm: "w-5 h-5",
        md: "w-7 h-7",
        lg: "w-9 h-9",
    };

    const dimensions: Record<string, { w: string; h: string }> = {
        "16:9": { w: "80%", h: "45%" },
        "9:16": { w: "45%", h: "80%" },
        "1:1": { w: "65%", h: "65%" },
        "4:3": { w: "75%", h: "55%" },
        "3:4": { w: "55%", h: "75%" },
        "21:9": { w: "90%", h: "40%" },
        "2.35:1": { w: "90%", h: "40%" },
    };

    const getDimensions = () => {
        if (dimensions[ratio]) return dimensions[ratio];
        return { w: "80%", h: "45%" }; // Default
    };

    const dims = getDimensions();

    return (
        <div className={clsx(
            "relative flex items-center justify-center",
            containerSizes[size],
            className
        )}>
            {/* Main frame */}
            <div
                className="border-2 border-current rounded-[2px] transition-all duration-500 ease-out"
                style={{ width: dims.w, height: dims.h }}
            />

            {/* Corner brackets for camera feel */}
            <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-current opacity-40" />
            <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-current opacity-40" />
            <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-current opacity-40" />
            <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-current opacity-40" />
        </div>
    );
}
