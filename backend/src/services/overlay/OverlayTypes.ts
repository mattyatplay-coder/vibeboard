/**
 * OverlayTypes - Type definitions for the overlay track system
 *
 * Supports:
 * - Lower thirds (name/title overlays)
 * - Subscribe animations
 * - Custom graphics (PNG/WebM sequences)
 * - Text overlays with styling
 */

// ═══════════════════════════════════════════════════════════════════════════
// OVERLAY BASE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type OverlayType = 'lower_third' | 'subscribe' | 'custom_graphic' | 'text' | 'watermark';

export type OverlayPosition =
    | 'top-left'
    | 'top-center'
    | 'top-right'
    | 'center-left'
    | 'center'
    | 'center-right'
    | 'bottom-left'
    | 'bottom-center'
    | 'bottom-right';

export type AnimationType = 'none' | 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'scale' | 'bounce';

// ═══════════════════════════════════════════════════════════════════════════
// OVERLAY ITEM
// ═══════════════════════════════════════════════════════════════════════════

export interface OverlayItem {
    id: string;
    type: OverlayType;
    /** Start time in seconds */
    startTime: number;
    /** Duration in seconds (0 = until end of video) */
    duration: number;
    /** Position on screen */
    position: OverlayPosition;
    /** Animation for entry */
    animationIn: AnimationType;
    /** Animation for exit */
    animationOut: AnimationType;
    /** Animation duration in seconds */
    animationDuration: number;
    /** Opacity 0-1 */
    opacity: number;
    /** Scale multiplier (1 = 100%) */
    scale: number;
    /** Type-specific data */
    data: LowerThirdData | SubscribeData | CustomGraphicData | TextOverlayData | WatermarkData;
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPE-SPECIFIC DATA
// ═══════════════════════════════════════════════════════════════════════════

export interface LowerThirdData {
    /** Primary name/title */
    name: string;
    /** Secondary text (title, role, etc.) */
    subtitle?: string;
    /** Style preset */
    style: LowerThirdStyle;
    /** Custom colors */
    primaryColor?: string;
    secondaryColor?: string;
    textColor?: string;
    /** Font family */
    fontFamily?: string;
}

export type LowerThirdStyle =
    | 'minimal'      // Clean white text, subtle background
    | 'modern'       // Gradient background, bold text
    | 'news'         // TV news style bar
    | 'tech'         // Techy, blue accents
    | 'gaming'       // RGB/neon style
    | 'elegant'      // Serif font, luxury feel
    | 'creator'      // YouTube creator style
    | 'custom';      // User-defined colors

export interface SubscribeData {
    /** Style of subscribe animation */
    style: SubscribeStyle;
    /** Channel name to display */
    channelName?: string;
    /** Include bell animation */
    showBell: boolean;
    /** Custom subscribe button color */
    buttonColor?: string;
}

export type SubscribeStyle =
    | 'classic'      // Standard YouTube red button
    | 'animated'     // Bouncing/attention-grabbing
    | 'minimal'      // Subtle corner reminder
    | 'popup'        // Full popup with stats
    | 'custom';

export interface CustomGraphicData {
    /** URL to graphic file (PNG, WebM, or GIF) */
    url: string;
    /** Original filename */
    filename: string;
    /** Is this an animated graphic (WebM/GIF)? */
    isAnimated: boolean;
    /** Maintain aspect ratio */
    maintainAspectRatio: boolean;
    /** Custom width (pixels or percentage) */
    width?: string;
    /** Custom height (pixels or percentage) */
    height?: string;
}

export interface TextOverlayData {
    /** Text content */
    text: string;
    /** Font size in pixels */
    fontSize: number;
    /** Font family */
    fontFamily: string;
    /** Font weight */
    fontWeight: 'normal' | 'bold' | 'black';
    /** Text color */
    color: string;
    /** Background color (optional) */
    backgroundColor?: string;
    /** Text shadow */
    shadow?: boolean;
    /** Outline/stroke */
    outline?: {
        color: string;
        width: number;
    };
    /** Padding in pixels */
    padding?: number;
    /** Border radius */
    borderRadius?: number;
}

export interface WatermarkData {
    /** URL to watermark image */
    url: string;
    /** Opacity override (0-1) */
    opacity: number;
    /** Size as percentage of video width */
    sizePercent: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// OVERLAY TRACK
// ═══════════════════════════════════════════════════════════════════════════

export interface OverlayTrack {
    id: string;
    projectId: string;
    sceneChainId?: string;
    /** Ordered list of overlays */
    overlays: OverlayItem[];
    /** Global settings */
    settings: OverlayTrackSettings;
}

export interface OverlayTrackSettings {
    /** Default animation duration */
    defaultAnimationDuration: number;
    /** Default opacity */
    defaultOpacity: number;
    /** Safe area margins (pixels from edge) */
    safeAreaMargin: number;
    /** Lower third default duration */
    lowerThirdDefaultDuration: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERATION REQUESTS
// ═══════════════════════════════════════════════════════════════════════════

export interface GenerateLowerThirdRequest {
    name: string;
    subtitle?: string;
    style: LowerThirdStyle;
    customColors?: {
        primary?: string;
        secondary?: string;
        text?: string;
    };
    width?: number;
    height?: number;
}

export interface GenerateLowerThirdResult {
    /** URL to generated PNG */
    url: string;
    /** Width in pixels */
    width: number;
    /** Height in pixels */
    height: number;
}

export interface CompositeOverlayRequest {
    /** Source video URL */
    videoUrl: string;
    /** Overlay track to apply */
    overlayTrack: OverlayTrack;
    /** Output format */
    outputFormat?: 'mp4' | 'webm';
    /** Output quality (crf for h264, lower = better) */
    quality?: number;
}

export interface CompositeOverlayResult {
    /** URL to output video */
    url: string;
    /** Duration in seconds */
    duration: number;
    /** Processing time in ms */
    processingTime: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// PRESET TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

export interface OverlayPreset {
    id: string;
    name: string;
    description: string;
    category: 'lower_third' | 'subscribe' | 'social' | 'branding';
    /** Preview image URL */
    previewUrl?: string;
    /** Template overlay item */
    template: Partial<OverlayItem>;
}

// Built-in presets
export const LOWER_THIRD_PRESETS: Record<LowerThirdStyle, {
    name: string;
    description: string;
    colors: { primary: string; secondary: string; text: string };
    fontFamily: string;
}> = {
    minimal: {
        name: 'Minimal',
        description: 'Clean white text with subtle background',
        colors: { primary: 'rgba(0,0,0,0.7)', secondary: 'transparent', text: '#ffffff' },
        fontFamily: 'Inter, sans-serif',
    },
    modern: {
        name: 'Modern',
        description: 'Gradient background with bold text',
        colors: { primary: '#6366f1', secondary: '#8b5cf6', text: '#ffffff' },
        fontFamily: 'Inter, sans-serif',
    },
    news: {
        name: 'News',
        description: 'TV news style horizontal bar',
        colors: { primary: '#dc2626', secondary: '#1e40af', text: '#ffffff' },
        fontFamily: 'Roboto Condensed, sans-serif',
    },
    tech: {
        name: 'Tech',
        description: 'Modern tech review style',
        colors: { primary: '#0ea5e9', secondary: '#0284c7', text: '#ffffff' },
        fontFamily: 'SF Pro Display, sans-serif',
    },
    gaming: {
        name: 'Gaming',
        description: 'RGB neon gamer aesthetic',
        colors: { primary: '#10b981', secondary: '#8b5cf6', text: '#ffffff' },
        fontFamily: 'Orbitron, sans-serif',
    },
    elegant: {
        name: 'Elegant',
        description: 'Luxury serif typography',
        colors: { primary: '#78716c', secondary: '#d4af37', text: '#ffffff' },
        fontFamily: 'Playfair Display, serif',
    },
    creator: {
        name: 'Creator',
        description: 'YouTube creator style',
        colors: { primary: '#ff0000', secondary: '#282828', text: '#ffffff' },
        fontFamily: 'YouTube Sans, Roboto, sans-serif',
    },
    custom: {
        name: 'Custom',
        description: 'User-defined colors and fonts',
        colors: { primary: '#000000', secondary: '#333333', text: '#ffffff' },
        fontFamily: 'Inter, sans-serif',
    },
};

export const SUBSCRIBE_PRESETS: Record<SubscribeStyle, {
    name: string;
    description: string;
    buttonColor: string;
}> = {
    classic: {
        name: 'Classic',
        description: 'Standard YouTube red subscribe button',
        buttonColor: '#ff0000',
    },
    animated: {
        name: 'Animated',
        description: 'Attention-grabbing bounce animation',
        buttonColor: '#ff0000',
    },
    minimal: {
        name: 'Minimal',
        description: 'Subtle corner reminder',
        buttonColor: '#ffffff',
    },
    popup: {
        name: 'Popup',
        description: 'Full popup with subscriber count',
        buttonColor: '#ff0000',
    },
    custom: {
        name: 'Custom',
        description: 'Custom colors and style',
        buttonColor: '#6366f1',
    },
};

// Default overlay track settings
export const DEFAULT_OVERLAY_SETTINGS: OverlayTrackSettings = {
    defaultAnimationDuration: 0.3,
    defaultOpacity: 1,
    safeAreaMargin: 48,
    lowerThirdDefaultDuration: 5,
};
