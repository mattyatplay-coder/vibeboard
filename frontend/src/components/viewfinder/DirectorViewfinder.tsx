'use client';

/**
 * Director's Viewfinder - Pro Creator Module
 *
 * Professional viewfinder with:
 * - Interactive DOF simulator (aperture + focal length)
 * - Live composite overlay (elements on reference)
 * - AR preview mode (WebXR camera feed)
 * - Real-time framing guides
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle,
    Aperture,
    Bookmark,
    BookmarkPlus,
    Camera,
    ChevronDown,
    ChevronRight,
    Copy,
    Download,
    Eye,
    EyeOff,
    Focus,
    Grid3X3,
    Image,
    Layers,
    Maximize2,
    Minimize2,
    Move,
    PanelLeftClose,
    PanelLeftOpen,
    Play,
    RefreshCw,
    Save,
    Settings,
    Share2,
    Smartphone,
    Target,
    Trash2,
    Upload,
    Video,
    X,
    Sliders,
    Sun,
    Circle,
    Check,
    Info,
    User,
    Loader2,
    Scissors,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Tooltip } from '@/components/ui/Tooltip';
import { LENS_PRESETS, LensPreset } from '@/data/LensPresets';

// Phase 7: Optical Physics Engine
import {
    calculateBlurRadius as calculateOpticalBlur,
    calculateDOF as calculateOpticalDOF,
    calculateFOV,
    calculateLayerTransform,
    SENSOR_DIAGONALS,
    COC_LIMITS,
} from '@/lib/opticalPhysics';
import { LayerCompositor, type ExtractedLayer } from './LayerCompositor';
import { DollyZoomSimulator } from './DollyZoomSimulator';
import { SceneDepthControls, type LayerConfig } from './SceneDepthControls';
import { CameraControlPanel } from '@/components/storyboard/CameraControlPanel';

// Global Viewfinder Store - enables "Remote Control" pattern for camera movements
import { useViewerTransformStyle, useViewfinderStore } from '@/lib/viewfinderStore';

// Backend API URL
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ============================================================================
// TYPES
// ============================================================================

interface ViewfinderElement {
    id: string;
    name: string;
    imageUrl: string;
    x: number; // 0-1 normalized
    y: number;
    scale: number;
    rotation: number;
    opacity: number;
    locked?: boolean;
}

interface DOFSettings {
    aperture: number; // f-stop: 1.4, 2.8, 4, 5.6, 8, 11, 16, 22
    focusDistance: number; // 0-1 normalized (near to far)
    focalLength: number; // mm
    sensorSize: 'full-frame' | 'aps-c' | 'micro-four-thirds';
}

interface FramingGuide {
    id: string;
    name: string;
    type: 'rule-of-thirds' | 'golden-ratio' | 'center' | 'diagonal' | 'custom';
    color: string;
    enabled: boolean;
}

interface DirectorViewfinderProps {
    projectId: string;
    referenceImageUrl?: string;
    elements?: ViewfinderElement[];
    initialLens?: LensPreset;
    onElementsChange?: (elements: ViewfinderElement[]) => void;
    onCapture?: (imageUrl: string) => void;
    embedded?: boolean;
    isOpen?: boolean;
    onClose?: () => void;
    fullscreen?: boolean; // When true, fill entire container without rounded corners
    pageSidebarCollapsed?: boolean; // State of the page's left sidebar
    onTogglePageSidebar?: () => void; // Callback to toggle page's left sidebar
    onCameraRecipeChange?: (recipe: CameraRecipe) => void; // Export camera settings for generation
}

// Camera Recipe - exported settings for generation prompts
export interface CameraRecipe {
    // Focus settings
    focusPoint: { x: number; y: number }; // Normalized click position (0-1)
    focusDistanceM: number;               // Distance in meters

    // Lens settings
    aperture: number;                     // f-stop
    focalLengthMm: number;                // mm
    sensorSize: DOFSettings['sensorSize'];

    // Calculated DOF
    depthOfField: {
        nearM: number;
        farM: number;
        totalM: number;
        hyperfocalM: number;
    };

    // For prompt injection
    promptSuffix: string;                 // e.g., "85mm f/1.8, shallow depth of field, bokeh"
    negativePromptSuffix: string;         // e.g., "blurry subject, out of focus main subject"
}

// ============================================================================
// CONSTANTS
// ============================================================================

const APERTURE_STOPS = [1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22];

const SENSOR_COC: Record<DOFSettings['sensorSize'], number> = {
    'full-frame': 0.03, // Circle of confusion in mm
    'aps-c': 0.019,
    'micro-four-thirds': 0.015,
};

// Crop factors for equivalent focal length calculation
const CROP_FACTORS: Record<DOFSettings['sensorSize'], number> = {
    'full-frame': 1.0,
    'aps-c': 1.5,
    'micro-four-thirds': 2.0,
};

// Diffraction-limited aperture (where diffraction starts to noticeably reduce sharpness)
const DIFFRACTION_LIMIT_APERTURE = 11; // f/11 is where most full-frame sensors start to show diffraction

// Sensor dimensions in mm for FOV calculations
const SENSOR_DIMENSIONS: Record<DOFSettings['sensorSize'], { width: number; height: number }> = {
    'full-frame': { width: 36, height: 24 },
    'aps-c': { width: 23.5, height: 15.6 },
    'micro-four-thirds': { width: 17.3, height: 13 },
};

// Default layer distances for 3-layer DOF simulation (in meters)
const DEFAULT_LAYER_DISTANCES = {
    foreground: 1.0,  // 1m - close objects
    background: 50.0, // 50m - far background (adjustable)
};

// Bokeh blade configurations for different lens types
// Number of diaphragm blades affects bokeh shape (more blades = rounder)
interface BokehSettings {
    bladeCount: number; // 5-15 blades typical
    rotation: number;   // blade rotation in degrees
    curvature: number;  // 0 = straight blades, 1 = fully curved (rounded aperture)
}

const BOKEH_PRESETS: Record<string, BokehSettings> = {
    'vintage': { bladeCount: 5, rotation: 36, curvature: 0 },       // Pentagon - classic vintage look
    'standard': { bladeCount: 7, rotation: 0, curvature: 0.2 },     // Heptagon - common modern lens
    'pro': { bladeCount: 9, rotation: 20, curvature: 0.5 },         // Nonagon - professional lenses
    'cinema': { bladeCount: 11, rotation: 0, curvature: 0.7 },      // Near-circular cinema lenses
    'perfect': { bladeCount: 15, rotation: 0, curvature: 1.0 },     // Perfectly circular (many blades)
};

// Complete DOF preset for saving/sharing
interface DOFPreset {
    id: string;
    name: string;
    description?: string;
    settings: DOFSettings;
    foregroundDistance: number;
    backgroundDistance: number;
    bokehPreset: keyof typeof BOKEH_PRESETS;
    createdAt: string;
}

// Built-in DOF presets for common cinematography looks
const BUILT_IN_DOF_PRESETS: DOFPreset[] = [
    {
        id: 'portrait-dreamy',
        name: 'Dreamy Portrait',
        description: '85mm f/1.4 - Classic portrait with creamy bokeh',
        settings: { aperture: 1.4, focusDistance: 0.03, focalLength: 85, sensorSize: 'full-frame' },
        foregroundDistance: 1.5,
        backgroundDistance: 30,
        bokehPreset: 'pro',
        createdAt: new Date().toISOString(),
    },
    {
        id: 'landscape-sharp',
        name: 'Sharp Landscape',
        description: '24mm f/11 - Deep focus for landscapes',
        settings: { aperture: 11, focusDistance: 0.2, focalLength: 24, sensorSize: 'full-frame' },
        foregroundDistance: 2,
        backgroundDistance: 200,
        bokehPreset: 'standard',
        createdAt: new Date().toISOString(),
    },
    {
        id: 'cinema-isolation',
        name: 'Cinematic Subject Isolation',
        description: '50mm f/2.0 - Film-like subject separation',
        settings: { aperture: 2, focusDistance: 0.05, focalLength: 50, sensorSize: 'full-frame' },
        foregroundDistance: 2,
        backgroundDistance: 50,
        bokehPreset: 'cinema',
        createdAt: new Date().toISOString(),
    },
    {
        id: 'vintage-character',
        name: 'Vintage Character',
        description: '35mm f/2.8 - Pentagon bokeh, classic feel',
        settings: { aperture: 2.8, focusDistance: 0.04, focalLength: 35, sensorSize: 'full-frame' },
        foregroundDistance: 1.0,
        backgroundDistance: 25,
        bokehPreset: 'vintage',
        createdAt: new Date().toISOString(),
    },
    {
        id: 'macro-extreme',
        name: 'Extreme Macro',
        description: '100mm f/4 - Ultra-close focus, razor-thin DOF',
        settings: { aperture: 4, focusDistance: 0.005, focalLength: 100, sensorSize: 'full-frame' },
        foregroundDistance: 0.3,
        backgroundDistance: 5,
        bokehPreset: 'pro',
        createdAt: new Date().toISOString(),
    },
    {
        id: 'telephoto-compression',
        name: 'Compressed Telephoto',
        description: '200mm f/2.8 - Strong background compression',
        settings: { aperture: 2.8, focusDistance: 0.15, focalLength: 200, sensorSize: 'full-frame' },
        foregroundDistance: 10,
        backgroundDistance: 100,
        bokehPreset: 'perfect',
        createdAt: new Date().toISOString(),
    },
];

// LocalStorage key for user presets
const DOF_PRESETS_STORAGE_KEY = 'vibeboard-dof-presets';

const DEFAULT_DOF_SETTINGS: DOFSettings = {
    aperture: 2.8,
    focusDistance: 0.5,
    focalLength: 50,
    sensorSize: 'full-frame',
};

const FRAMING_GUIDES: FramingGuide[] = [
    { id: 'thirds', name: 'Rule of Thirds', type: 'rule-of-thirds', color: '#ffffff40', enabled: true },
    { id: 'golden', name: 'Golden Ratio', type: 'golden-ratio', color: '#fbbf2440', enabled: false },
    { id: 'center', name: 'Center Cross', type: 'center', color: '#ef444440', enabled: false },
    { id: 'diagonal', name: 'Diagonals', type: 'diagonal', color: '#8b5cf640', enabled: false },
];

// Framing presets (based on dofsimulator.net)
interface FramingPreset {
    id: string;
    name: string;
    description: string;
    modelDistance: number;    // Distance to subject in meters
    modelScale: number;       // Scale factor (1.0 = full body fits in frame)
}

const FRAMING_PRESETS: FramingPreset[] = [
    { id: 'face', name: 'Face', description: 'Extreme close-up, face fills frame', modelDistance: 0.5, modelScale: 4.0 },
    { id: 'portrait', name: 'Portrait', description: 'Head and shoulders', modelDistance: 1.0, modelScale: 2.5 },
    { id: 'medium', name: 'Medium', description: 'Waist up, classic interview', modelDistance: 2.0, modelScale: 1.5 },
    { id: 'american', name: 'American', description: 'Mid-thigh up, Western framing', modelDistance: 3.0, modelScale: 1.2 },
    { id: 'full', name: 'Full', description: 'Full body visible', modelDistance: 5.0, modelScale: 1.0 },
    { id: 'wide', name: 'Wide', description: 'Full body with environment', modelDistance: 10.0, modelScale: 0.6 },
];

// Camera database with sensor specs (popular models)
interface CameraModel {
    id: string;
    brand: string;
    model: string;
    sensorSize: 'full-frame' | 'aps-c' | 'micro-four-thirds';
    sensorWidth: number;
    sensorHeight: number;
    cropFactor: number;
}

const CAMERA_DATABASE: CameraModel[] = [
    // Full Frame
    { id: 'sony-a7iv', brand: 'Sony', model: 'A7 IV', sensorSize: 'full-frame', sensorWidth: 35.7, sensorHeight: 23.8, cropFactor: 1.0 },
    { id: 'sony-fx3', brand: 'Sony', model: 'FX3', sensorSize: 'full-frame', sensorWidth: 35.6, sensorHeight: 23.8, cropFactor: 1.0 },
    { id: 'canon-r5', brand: 'Canon', model: 'EOS R5', sensorSize: 'full-frame', sensorWidth: 36.0, sensorHeight: 24.0, cropFactor: 1.0 },
    { id: 'nikon-z8', brand: 'Nikon', model: 'Z8', sensorSize: 'full-frame', sensorWidth: 35.9, sensorHeight: 23.9, cropFactor: 1.0 },
    { id: 'red-v-raptor', brand: 'RED', model: 'V-RAPTOR', sensorSize: 'full-frame', sensorWidth: 40.96, sensorHeight: 21.60, cropFactor: 0.88 },
    { id: 'arri-alexa35', brand: 'ARRI', model: 'ALEXA 35', sensorSize: 'full-frame', sensorWidth: 27.99, sensorHeight: 19.22, cropFactor: 1.29 },
    // APS-C
    { id: 'sony-a6700', brand: 'Sony', model: 'A6700', sensorSize: 'aps-c', sensorWidth: 23.5, sensorHeight: 15.6, cropFactor: 1.5 },
    { id: 'sony-fx30', brand: 'Sony', model: 'FX30', sensorSize: 'aps-c', sensorWidth: 23.4, sensorHeight: 15.6, cropFactor: 1.53 },
    { id: 'fuji-xh2s', brand: 'Fujifilm', model: 'X-H2S', sensorSize: 'aps-c', sensorWidth: 23.5, sensorHeight: 15.6, cropFactor: 1.5 },
    { id: 'canon-r7', brand: 'Canon', model: 'EOS R7', sensorSize: 'aps-c', sensorWidth: 22.3, sensorHeight: 14.8, cropFactor: 1.6 },
    // Micro Four Thirds
    { id: 'panasonic-gh6', brand: 'Panasonic', model: 'GH6', sensorSize: 'micro-four-thirds', sensorWidth: 17.3, sensorHeight: 13.0, cropFactor: 2.0 },
    { id: 'panasonic-gh7', brand: 'Panasonic', model: 'GH7', sensorSize: 'micro-four-thirds', sensorWidth: 17.3, sensorHeight: 13.0, cropFactor: 2.0 },
    { id: 'bmpcc-6k', brand: 'Blackmagic', model: 'BMPCC 6K', sensorSize: 'aps-c', sensorWidth: 23.1, sensorHeight: 12.99, cropFactor: 1.56 },
];

// ============================================================================
// DOF CALCULATION
// ============================================================================

/**
 * Calculate depth of field parameters
 * Based on physics: DOF = 2 * CoC * f-stop * (distance^2) / (focal_length^2)
 */
function calculateDOF(settings: DOFSettings): {
    nearFocus: number;
    farFocus: number;
    totalDOF: number;
    blurAmount: number; // 0-1 for visual representation
    hyperfocalDistance: number; // meters
    frontDOF: number; // DOF in front of focus point
    backDOF: number; // DOF behind focus point
    frontPercent: number; // percentage of DOF in front
    backPercent: number; // percentage of DOF behind
    equivalentFocalLength: number; // 35mm equivalent
    isDiffractionLimited: boolean; // true if aperture causes diffraction softening
    focusDistanceM: number; // actual focus distance in meters
} {
    const { aperture, focusDistance, focalLength, sensorSize } = settings;
    const coc = SENSOR_COC[sensorSize];
    const cropFactor = CROP_FACTORS[sensorSize];

    // Convert normalized focus distance to meters (0.5m to 100m range)
    const distanceM = 0.5 + focusDistance * 99.5;

    // Hyperfocal distance: H = f^2 / (N * c) + f (convert to meters)
    const hyperfocalMm = (focalLength * focalLength) / (aperture * coc) + focalLength;
    const hyperfocalDistance = hyperfocalMm / 1000; // Convert mm to meters

    // Near focus: Dn = H * s / (H + (s - f))
    const nearFocus = (hyperfocalMm * distanceM) / (hyperfocalMm + (distanceM - focalLength / 1000));

    // Far focus: Df = H * s / (H - (s - f))
    const denominator = hyperfocalMm - (distanceM - focalLength / 1000);
    const farFocus = denominator > 0 ? (hyperfocalMm * distanceM) / denominator : Infinity;

    // Total DOF
    const totalDOF = farFocus === Infinity ? Infinity : farFocus - nearFocus;

    // Front and back DOF
    const frontDOF = distanceM - nearFocus;
    const backDOF = farFocus === Infinity ? Infinity : farFocus - distanceM;

    // Calculate front/back percentages (classic ~1/3 front, 2/3 back rule varies with distance)
    let frontPercent = 0;
    let backPercent = 0;
    if (totalDOF !== Infinity && totalDOF > 0) {
        frontPercent = Math.round((frontDOF / totalDOF) * 100);
        backPercent = 100 - frontPercent;
    } else if (totalDOF === Infinity) {
        // When focused at or beyond hyperfocal, everything to infinity is sharp
        frontPercent = Math.round((frontDOF / (frontDOF + 1000)) * 100);
        backPercent = 100 - frontPercent;
    }

    // Equivalent focal length (35mm equivalent)
    const equivalentFocalLength = focalLength * cropFactor;

    // Diffraction check - adjusted for sensor size
    const diffractionLimit = DIFFRACTION_LIMIT_APERTURE / cropFactor;
    const isDiffractionLimited = aperture >= diffractionLimit;

    // Blur amount for visualization (inverse relationship with DOF)
    // Smaller aperture (higher f-stop) = more in focus = less blur
    const blurAmount = Math.min(1, (1.4 / aperture) * (focalLength / 50) * 0.5);

    return {
        nearFocus: Math.max(0, nearFocus),
        farFocus: Math.min(farFocus, 1000),
        totalDOF: Math.min(totalDOF, 1000),
        blurAmount,
        hyperfocalDistance,
        frontDOF: Math.max(0, frontDOF),
        backDOF: backDOF === Infinity ? Infinity : Math.max(0, backDOF),
        frontPercent,
        backPercent,
        equivalentFocalLength,
        isDiffractionLimited,
        focusDistanceM: distanceM,
    };
}

/**
 * Calculate blur diameter for an object at a given distance
 * Based on dofsimulator.net formula:
 *   blur = f/N × (s/(s-f) × ((d-f)/d) - 1)  for finite distance
 *   blur = f/N × (s/(s-f) - 1)               for infinite distance
 * Where: f = focal length (mm), N = f-stop, s = focus distance (mm), d = object distance (mm)
 *
 * Returns blur in pixels for CSS filter application
 */
function calculateBlurSize(
    focalLengthMm: number,
    aperture: number,
    focusDistanceM: number,
    objectDistanceM: number,
    sensorSize: DOFSettings['sensorSize'],
    viewportWidth: number = 800
): number {
    // If object is exactly at focus, no blur
    if (Math.abs(focusDistanceM - objectDistanceM) < 0.001) {
        return 0;
    }

    const f = focalLengthMm; // mm
    const N = aperture;
    const s = focusDistanceM * 1000; // convert to mm
    const d = objectDistanceM * 1000; // convert to mm

    // Blur on sensor using dofsimulator.net formula
    // blur = f/N × (s/(s-f) × ((d-f)/d) - 1)
    let blurOnSensorMm: number;
    if (d > 1000000) { // ~infinite distance (> 1km)
        blurOnSensorMm = (f / N) * (s / (s - f) - 1);
    } else {
        blurOnSensorMm = (f / N) * (s / (s - f) * ((d - f) / d) - 1);
    }

    // Take absolute value (blur is always positive)
    blurOnSensorMm = Math.abs(blurOnSensorMm);

    // Get sensor width
    const sensorWidth = SENSOR_DIMENSIONS[sensorSize].width;

    // Convert sensor blur to viewport pixels using dofsimulator.net formula:
    // blur_pixels = blur / sensor_width × viewport_width / 4
    const blurPixels = (blurOnSensorMm / sensorWidth) * viewportWidth / 4;

    // Clamp to reasonable maximum (50px) and minimum (0)
    return Math.min(50, Math.max(0, blurPixels));
}

/**
 * Calculate Angle of View (Field of View)
 * AOV = 2 × arctan(sensor_dimension / (2 × focal_length))
 * Returns both horizontal and vertical AOV in degrees
 */
function calculateAOV(
    focalLengthMm: number,
    sensorSize: DOFSettings['sensorSize']
): { horizontal: number; vertical: number; diagonal: number } {
    const sensor = SENSOR_DIMENSIONS[sensorSize];
    const diagonalMm = Math.sqrt(sensor.width * sensor.width + sensor.height * sensor.height);

    const horizontal = 2 * Math.atan(sensor.width / (2 * focalLengthMm)) * (180 / Math.PI);
    const vertical = 2 * Math.atan(sensor.height / (2 * focalLengthMm)) * (180 / Math.PI);
    const diagonal = 2 * Math.atan(diagonalMm / (2 * focalLengthMm)) * (180 / Math.PI);

    return {
        horizontal: Math.round(horizontal * 10) / 10,
        vertical: Math.round(vertical * 10) / 10,
        diagonal: Math.round(diagonal * 10) / 10,
    };
}

/**
 * Generate SVG polygon points for bokeh shape based on blade count
 * Uses polar coordinates to create regular polygons with optional curvature
 *
 * @param bladeCount - Number of aperture blades (5-15 typical)
 * @param size - Size of the bokeh shape in pixels
 * @param rotation - Rotation offset in degrees
 * @param curvature - 0 = straight edges (polygon), 1 = fully curved (circle)
 * @returns SVG path data string
 */
function generateBokehPath(
    bladeCount: number,
    size: number,
    rotation: number = 0,
    curvature: number = 0
): string {
    const radius = size / 2;
    const centerX = radius;
    const centerY = radius;
    const angleStep = (2 * Math.PI) / bladeCount;
    const rotationRad = (rotation * Math.PI) / 180;

    if (curvature >= 0.95) {
        // Near-perfect circle - use actual circle
        return `M ${centerX + radius} ${centerY} A ${radius} ${radius} 0 1 1 ${centerX - radius} ${centerY} A ${radius} ${radius} 0 1 1 ${centerX + radius} ${centerY}`;
    }

    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < bladeCount; i++) {
        const angle = angleStep * i + rotationRad - Math.PI / 2; // Start from top
        points.push({
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
        });
    }

    if (curvature <= 0.05) {
        // Pure polygon - straight lines
        const pathParts = points.map((p, i) =>
            i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`
        );
        return pathParts.join(' ') + ' Z';
    }

    // Curved edges - use quadratic bezier curves
    // Control point is pushed inward based on curvature (less curvature = more inward = straighter)
    const pathParts: string[] = [];
    for (let i = 0; i < bladeCount; i++) {
        const current = points[i];
        const next = points[(i + 1) % bladeCount];

        // Midpoint for control point
        const midX = (current.x + next.x) / 2;
        const midY = (current.y + next.y) / 2;

        // Push control point outward from center based on curvature
        const distFromCenter = Math.sqrt(
            Math.pow(midX - centerX, 2) + Math.pow(midY - centerY, 2)
        );
        const dirX = (midX - centerX) / distFromCenter;
        const dirY = (midY - centerY) / distFromCenter;

        // Control point: at polygon edge (curvature=0) to circle edge (curvature=1)
        const controlDistance = distFromCenter + (radius - distFromCenter) * curvature;
        const controlX = centerX + dirX * controlDistance;
        const controlY = centerY + dirY * controlDistance;

        if (i === 0) {
            pathParts.push(`M ${current.x} ${current.y}`);
        }
        pathParts.push(`Q ${controlX} ${controlY} ${next.x} ${next.y}`);
    }

    return pathParts.join(' ');
}

/**
 * Bokeh Shape Component - renders a single bokeh orb with proper blade shape
 */
function BokehOrb({
    size,
    x,
    y,
    bladeCount,
    rotation,
    curvature,
    color = 'cyan',
    opacity = 0.3,
}: {
    size: number;
    x: string;
    y: string;
    bladeCount: number;
    rotation: number;
    curvature: number;
    color?: string;
    opacity?: number;
}) {
    const pathData = useMemo(
        () => generateBokehPath(bladeCount, size, rotation, curvature),
        [bladeCount, size, rotation, curvature]
    );

    // Create unique ID for this instance's clip path
    const clipId = useMemo(() => `bokeh-clip-${Math.random().toString(36).substr(2, 9)}`, []);

    return (
        <svg
            className="absolute"
            style={{
                left: x,
                top: y,
                width: size,
                height: size,
                transform: 'translate(-50%, -50%)',
            }}
            viewBox={`0 0 ${size} ${size}`}
        >
            <defs>
                <clipPath id={clipId}>
                    <path d={pathData} />
                </clipPath>
                <radialGradient id={`${clipId}-gradient`} cx="30%" cy="30%">
                    <stop offset="0%" stopColor={color} stopOpacity={opacity * 1.5} />
                    <stop offset="50%" stopColor={color} stopOpacity={opacity * 0.8} />
                    <stop offset="100%" stopColor={color} stopOpacity={opacity * 0.2} />
                </radialGradient>
            </defs>
            {/* Bokeh shape with gradient fill */}
            <path
                d={pathData}
                fill={`url(#${clipId}-gradient)`}
                stroke={color}
                strokeWidth={0.5}
                strokeOpacity={opacity * 0.5}
            />
            {/* Highlight edge for realism */}
            <path
                d={pathData}
                fill="none"
                stroke="white"
                strokeWidth={1}
                strokeOpacity={opacity * 0.3}
                strokeDasharray={`${size * 0.2} ${size * 0.8}`}
            />
        </svg>
    );
}

/**
 * Get lens compression description based on focal length
 */
function getLensCompressionDescription(focalLengthMm: number): string {
    if (focalLengthMm < 24) return 'Ultra-wide - exaggerated perspective, objects appear more distant';
    if (focalLengthMm < 35) return 'Wide - slight perspective exaggeration, good for environmental context';
    if (focalLengthMm < 60) return 'Normal - natural perspective similar to human vision';
    if (focalLengthMm < 100) return 'Short telephoto - slight compression, flattering for portraits';
    if (focalLengthMm < 200) return 'Telephoto - noticeable compression, subjects appear closer together';
    return 'Super telephoto - extreme compression, background appears very close to subject';
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Visual DOF preview with blur zones */
function DOFVisualizer({
    settings,
    className,
}: {
    settings: DOFSettings;
    className?: string;
}) {
    const dof = calculateDOF(settings);

    // Normalize positions for display (0-100%)
    const focusPos = settings.focusDistance * 100;
    const nearPos = Math.max(0, (dof.nearFocus / 100) * 100);
    const farPos = Math.min(100, (dof.farFocus / 100) * 100);

    return (
        <div className={clsx('relative h-8 rounded-lg bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800', className)}>
            {/* Out of focus zones (blurred) */}
            <div
                className="absolute inset-y-0 left-0 rounded-l-lg bg-gradient-to-r from-red-500/30 to-red-500/10"
                style={{ width: `${nearPos}%` }}
            />
            <div
                className="absolute inset-y-0 right-0 rounded-r-lg bg-gradient-to-l from-red-500/30 to-red-500/10"
                style={{ width: `${100 - farPos}%` }}
            />

            {/* In-focus zone */}
            <div
                className="absolute inset-y-0 bg-green-500/30 border-x border-green-500/50"
                style={{
                    left: `${nearPos}%`,
                    width: `${farPos - nearPos}%`,
                }}
            />

            {/* Focus point indicator */}
            <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white border-2 border-green-400 shadow-lg shadow-green-500/50"
                style={{ left: `${focusPos}%` }}
            />

            {/* Labels */}
            <div className="absolute -bottom-5 left-0 text-[9px] text-gray-500">Near</div>
            <div className="absolute -bottom-5 right-0 text-[9px] text-gray-500">Far</div>
            <div
                className="absolute -bottom-5 -translate-x-1/2 text-[9px] font-medium text-green-400"
                style={{ left: `${focusPos}%` }}
            >
                Focus
            </div>
        </div>
    );
}

/** Framing guide overlay SVG */
function FramingGuideOverlay({
    guide,
    width,
    height,
}: {
    guide: FramingGuide;
    width: number;
    height: number;
}) {
    if (!guide.enabled) return null;

    const renderGuide = () => {
        switch (guide.type) {
            case 'rule-of-thirds':
                return (
                    <>
                        {/* Vertical lines */}
                        <line x1={width / 3} y1={0} x2={width / 3} y2={height} stroke={guide.color} strokeWidth="1" />
                        <line x1={(width * 2) / 3} y1={0} x2={(width * 2) / 3} y2={height} stroke={guide.color} strokeWidth="1" />
                        {/* Horizontal lines */}
                        <line x1={0} y1={height / 3} x2={width} y2={height / 3} stroke={guide.color} strokeWidth="1" />
                        <line x1={0} y1={(height * 2) / 3} x2={width} y2={(height * 2) / 3} stroke={guide.color} strokeWidth="1" />
                        {/* Power points */}
                        <circle cx={width / 3} cy={height / 3} r={4} fill={guide.color} />
                        <circle cx={(width * 2) / 3} cy={height / 3} r={4} fill={guide.color} />
                        <circle cx={width / 3} cy={(height * 2) / 3} r={4} fill={guide.color} />
                        <circle cx={(width * 2) / 3} cy={(height * 2) / 3} r={4} fill={guide.color} />
                    </>
                );

            case 'golden-ratio':
                const phi = 1.618;
                const gx1 = width / phi;
                const gx2 = width - width / phi;
                const gy1 = height / phi;
                const gy2 = height - height / phi;
                return (
                    <>
                        <line x1={gx1} y1={0} x2={gx1} y2={height} stroke={guide.color} strokeWidth="1" />
                        <line x1={gx2} y1={0} x2={gx2} y2={height} stroke={guide.color} strokeWidth="1" />
                        <line x1={0} y1={gy1} x2={width} y2={gy1} stroke={guide.color} strokeWidth="1" />
                        <line x1={0} y1={gy2} x2={width} y2={gy2} stroke={guide.color} strokeWidth="1" />
                    </>
                );

            case 'center':
                return (
                    <>
                        <line x1={width / 2} y1={0} x2={width / 2} y2={height} stroke={guide.color} strokeWidth="1" strokeDasharray="5,5" />
                        <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke={guide.color} strokeWidth="1" strokeDasharray="5,5" />
                        <circle cx={width / 2} cy={height / 2} r={20} fill="none" stroke={guide.color} strokeWidth="2" />
                    </>
                );

            case 'diagonal':
                return (
                    <>
                        <line x1={0} y1={0} x2={width} y2={height} stroke={guide.color} strokeWidth="1" />
                        <line x1={width} y1={0} x2={0} y2={height} stroke={guide.color} strokeWidth="1" />
                    </>
                );

            default:
                return null;
        }
    };

    return (
        <svg className="absolute inset-0 pointer-events-none" width={width} height={height}>
            {renderGuide()}
        </svg>
    );
}

/**
 * 3-Layer DOF Scene Simulator
 * Renders foreground, subject, and background layers with accurate blur based on focus distance
 */
function DOFLayeredScene({
    settings,
    foregroundDistance,
    backgroundDistance,
    viewportWidth,
    viewportHeight,
    referenceImageUrl,
    bokehSettings,
    compositorLayers,
}: {
    settings: DOFSettings;
    foregroundDistance: number; // meters
    backgroundDistance: number; // meters
    viewportWidth: number;
    viewportHeight: number;
    referenceImageUrl?: string;
    bokehSettings: BokehSettings;
    compositorLayers?: LayerConfig[];
}) {
    // Calculate focus distance in meters
    const focusDistanceM = 0.5 + settings.focusDistance * 99.5;

    // Calculate blur for each layer
    const foregroundBlur = calculateBlurSize(
        settings.focalLength,
        settings.aperture,
        focusDistanceM,
        foregroundDistance,
        settings.sensorSize,
        viewportWidth
    );

    const subjectBlur = 0; // Subject is at focus - always sharp

    const backgroundBlur = calculateBlurSize(
        settings.focalLength,
        settings.aperture,
        focusDistanceM,
        backgroundDistance,
        settings.sensorSize,
        viewportWidth
    );

    // Calculate AOV for perspective simulation
    const aov = calculateAOV(settings.focalLength, settings.sensorSize);

    // Scale factor for layers (telephoto = larger background, wide = smaller)
    const perspectiveScale = 50 / settings.focalLength; // 50mm is neutral

    // Get layers by type from compositor
    const bgLayer = compositorLayers?.find(l => l.type === 'background' && l.isVisible);
    const subjectLayer = compositorLayers?.find(l => l.type === 'subject' && l.isVisible);
    const fgLayer = compositorLayers?.find(l => l.type === 'foreground' && l.isVisible);

    // Calculate blur for each actual layer (if compositor layers exist)
    const getLayerBlur = (layer: LayerConfig | undefined) => {
        if (!layer) return 0;
        return calculateBlurSize(
            settings.focalLength,
            settings.aperture,
            focusDistanceM,
            layer.distanceM,
            settings.sensorSize,
            viewportWidth
        );
    };

    const actualBgBlur = bgLayer ? getLayerBlur(bgLayer) : backgroundBlur;
    const actualSubjectBlur = subjectLayer ? getLayerBlur(subjectLayer) : 0;
    const actualFgBlur = fgLayer ? getLayerBlur(fgLayer) : foregroundBlur;

    // Helper to get layer transform style
    const getLayerTransform = (layer: LayerConfig | undefined, defaultScale: number = 1) => {
        if (!layer) return { transform: `scale(${defaultScale})`, transformOrigin: 'center' };
        const offsetX = layer.offsetX ?? 0;
        const offsetY = layer.offsetY ?? 0;
        const scale = layer.scale ?? 1;
        return {
            transform: `translate(${offsetX}%, ${offsetY}%) scale(${scale * defaultScale})`,
            transformOrigin: 'center',
        };
    };

    return (
        <div className="absolute inset-0 overflow-hidden">
            {/* Background Layer - furthest, most blur when shallow DOF */}
            <div
                className="absolute inset-0"
                style={{
                    filter: `blur(${actualBgBlur}px)`,
                    opacity: bgLayer?.opacity ?? 1,
                    ...getLayerTransform(bgLayer, 1 + (1 - perspectiveScale) * 0.1),
                }}
            >
                {bgLayer?.imageUrl ? (
                    <img
                        src={bgLayer.imageUrl}
                        alt="Background"
                        className="h-full w-full object-cover"
                    />
                ) : referenceImageUrl ? (
                    <img
                        src={referenceImageUrl}
                        alt="Background"
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="h-full w-full bg-gradient-to-b from-blue-900/30 via-purple-900/20 to-gray-900/40" />
                )}
                {/* Background bokeh elements - polygonal aperture shapes */}
                {settings.aperture <= 5.6 && actualBgBlur > 3 && (
                    <div className="absolute inset-0 overflow-hidden">
                        {[...Array(16)].map((_, i) => {
                            const seed = (i + 100) * 7919;
                            const pseudoRandom = (n: number) => ((seed * n) % 100) / 100;
                            const baseSize = actualBgBlur * 1.8 + pseudoRandom(1) * 35;
                            const xPos = 3 + pseudoRandom(2) * 94;
                            const yPos = 5 + pseudoRandom(3) * 60;
                            const opacity = 0.1 + pseudoRandom(4) * 0.2;
                            const colors = ['#fbbf24', '#fb923c', '#f472b6', '#c084fc', '#60a5fa'];
                            const color = colors[i % colors.length];

                            return (
                                <BokehOrb
                                    key={i}
                                    size={baseSize}
                                    x={`${xPos}%`}
                                    y={`${yPos}%`}
                                    bladeCount={bokehSettings.bladeCount}
                                    rotation={bokehSettings.rotation + pseudoRandom(5) * 40}
                                    curvature={bokehSettings.curvature}
                                    color={color}
                                    opacity={opacity}
                                />
                            );
                        })}
                    </div>
                )}
                {/* Background blur indicator */}
                <div className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-1 text-[9px] text-purple-400">
                    BG: {actualBgBlur.toFixed(1)}px blur @ {bgLayer?.distanceM.toFixed(1) ?? backgroundDistance}m
                </div>
            </div>

            {/* Subject Layer - at focus distance, sharp (or blurred if not at focus) */}
            <div
                className="absolute inset-0"
                style={{
                    filter: `blur(${actualSubjectBlur}px)`,
                    opacity: subjectLayer?.opacity ?? 1,
                    ...getLayerTransform(subjectLayer),
                }}
            >
                {subjectLayer?.imageUrl ? (
                    <img
                        src={subjectLayer.imageUrl}
                        alt="Subject"
                        className="h-full w-full object-contain"
                    />
                ) : (
                    /* Focus plane indicator - shown when no subject layer */
                    <div className="flex h-full w-full items-center justify-center">
                        <div className="relative flex h-[40%] w-[50%] items-center justify-center rounded-lg border-2 border-green-400/50 bg-green-400/5">
                            <div className="text-center">
                                <Target className="mx-auto h-8 w-8 text-green-400/60" />
                                <div className="mt-2 text-xs font-medium text-green-400/80">
                                    Subject @ {focusDistanceM.toFixed(1)}m
                                </div>
                                <div className="text-[9px] text-green-400/60">Sharp • In Focus</div>
                            </div>
                        </div>
                    </div>
                )}
                {/* Subject focus indicator */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-black/60 px-2 py-1 text-[9px] text-green-400">
                    FOCUS: {subjectLayer?.distanceM.toFixed(1) ?? focusDistanceM.toFixed(1)}m • {actualSubjectBlur < 1 ? 'Sharp' : `${actualSubjectBlur.toFixed(1)}px blur`}
                </div>
            </div>

            {/* Foreground Layer - closest, blur when shallow DOF */}
            {(fgLayer?.imageUrl || settings.aperture <= 4) && (
                <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                        filter: `blur(${actualFgBlur}px)`,
                        opacity: fgLayer?.opacity ?? 1,
                        ...getLayerTransform(fgLayer, 1 + perspectiveScale * 0.05),
                    }}
                >
                    {fgLayer?.imageUrl ? (
                        <img
                            src={fgLayer.imageUrl}
                            alt="Foreground"
                            className="h-full w-full object-contain"
                        />
                    ) : (
                        /* Foreground bokeh elements - polygonal aperture shapes */
                        settings.aperture <= 4 && actualFgBlur > 5 && (
                            <div className="absolute inset-0 overflow-hidden">
                                {[...Array(12)].map((_, i) => {
                                    const seed = i * 7919;
                                    const pseudoRandom = (n: number) => ((seed * n) % 100) / 100;
                                    const baseSize = actualFgBlur * 2.5 + pseudoRandom(1) * 50;
                                    const xPos = 5 + pseudoRandom(2) * 90;
                                    const yPos = 55 + pseudoRandom(3) * 40;
                                    const opacity = 0.15 + pseudoRandom(4) * 0.25;
                                    const colors = ['#22d3ee', '#a78bfa', '#fbbf24', '#f472b6', '#34d399'];
                                    const color = colors[i % colors.length];

                                    return (
                                        <BokehOrb
                                            key={i}
                                            size={baseSize}
                                            x={`${xPos}%`}
                                            y={`${yPos}%`}
                                            bladeCount={bokehSettings.bladeCount}
                                            rotation={bokehSettings.rotation + pseudoRandom(5) * 30}
                                            curvature={bokehSettings.curvature}
                                            color={color}
                                            opacity={opacity}
                                        />
                                    );
                                })}
                            </div>
                        )
                    )}
                    {/* Foreground blur indicator */}
                    <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-[9px] text-cyan-400">
                        FG: {actualFgBlur.toFixed(1)}px blur @ {fgLayer?.distanceM.toFixed(1) ?? foregroundDistance}m
                    </div>
                </div>
            )}

            {/* FOV Indicator Overlay */}
            <div className="absolute left-2 top-2 space-y-1 rounded bg-black/60 px-2 py-1.5">
                <div className="text-[9px] text-gray-400">Field of View</div>
                <div className="flex items-center gap-2">
                    <div className="text-xs font-mono text-amber-400">{aov.horizontal}°</div>
                    <span className="text-[8px] text-gray-500">horizontal</span>
                </div>
                <div className="text-[8px] text-gray-500">{getLensCompressionDescription(settings.focalLength).split(' - ')[0]}</div>
            </div>
        </div>
    );
}

/** Draggable element overlay for composite */
function DraggableElement({
    element,
    onUpdate,
    isSelected,
    onSelect,
    containerRef,
}: {
    element: ViewfinderElement;
    onUpdate: (updates: Partial<ViewfinderElement>) => void;
    isSelected: boolean;
    onSelect: () => void;
    containerRef: React.RefObject<HTMLDivElement>;
}) {
    const [isDragging, setIsDragging] = useState(false);
    const startPos = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent) => {
        if (element.locked) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
        onSelect();
        startPos.current = { x: e.clientX, y: e.clientY };
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const dx = (e.clientX - startPos.current.x) / rect.width;
            const dy = (e.clientY - startPos.current.y) / rect.height;
            startPos.current = { x: e.clientX, y: e.clientY };

            onUpdate({
                x: Math.max(0, Math.min(1, element.x + dx)),
                y: Math.max(0, Math.min(1, element.y + dy)),
            });
        };

        const handleMouseUp = () => setIsDragging(false);

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, element, onUpdate, containerRef]);

    return (
        <div
            className={clsx(
                'absolute cursor-move transition-all',
                isSelected && 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-transparent',
                element.locked && 'cursor-not-allowed opacity-70'
            )}
            style={{
                left: `${element.x * 100}%`,
                top: `${element.y * 100}%`,
                transform: `translate(-50%, -50%) scale(${element.scale}) rotate(${element.rotation}deg)`,
                opacity: element.opacity,
            }}
            onMouseDown={handleMouseDown}
        >
            <img
                src={element.imageUrl}
                alt={element.name}
                className="max-w-32 max-h-32 object-contain pointer-events-none"
                draggable={false}
            />
            {isSelected && !element.locked && (
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-cyan-500/90 text-[10px] text-white whitespace-nowrap">
                    {element.name}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// ACCORDION SECTION COMPONENT (defined outside to prevent re-creation on render)
// ============================================================================

type AccordionColor = 'cyan' | 'green' | 'amber' | 'purple';

interface AccordionSectionProps {
    id: string;
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
    color?: AccordionColor;
    isExpanded: boolean;
    onToggle: (id: string) => void;
}

const AccordionSection = React.memo(function AccordionSection({
    id,
    title,
    icon: Icon,
    children,
    color = 'cyan',
    isExpanded,
    onToggle,
}: AccordionSectionProps) {
    const colorMap: Record<AccordionColor, string> = {
        cyan: 'text-cyan-400',
        green: 'text-green-400',
        amber: 'text-amber-400',
        purple: 'text-purple-400',
    };
    const iconClass = colorMap[color] || colorMap.cyan;
    return (
        <div className="border-b border-white/5">
            <button
                onClick={() => onToggle(id)}
                className="flex w-full items-center justify-between px-3 py-2 text-left transition-colors hover:bg-white/5"
            >
                <div className="flex items-center gap-2">
                    <Icon className={clsx('h-3.5 w-3.5', iconClass)} />
                    <span className="text-xs font-medium text-gray-300">{title}</span>
                </div>
                {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                )}
            </button>
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden"
                    >
                        <div className="px-3 pb-3">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DirectorViewfinder({
    projectId,
    referenceImageUrl,
    elements = [],
    initialLens,
    onElementsChange,
    onCapture,
    embedded = false,
    isOpen = true,
    onClose,
    fullscreen = false,
    pageSidebarCollapsed = false,
    onTogglePageSidebar,
    onCameraRecipeChange,
}: DirectorViewfinderProps) {
    // State
    const [activeTab, setActiveTab] = useState<'dof' | 'composite' | 'ar'>('dof');
    const [dofSettings, setDofSettings] = useState<DOFSettings>({
        ...DEFAULT_DOF_SETTINGS,
        focalLength: initialLens?.focalMm || 50,
    });
    const [selectedLens, setSelectedLens] = useState<LensPreset | null>(initialLens || null);
    const [framingGuides, setFramingGuides] = useState<FramingGuide[]>(FRAMING_GUIDES);
    const [showGuides, setShowGuides] = useState(true);
    const [localElements, setLocalElements] = useState<ViewfinderElement[]>(elements);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [arActive, setArActive] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);

    // Manual layer upload refs
    const subjectInputRef = useRef<HTMLInputElement>(null);
    const backgroundInputRef = useRef<HTMLInputElement>(null);
    const foregroundInputRef = useRef<HTMLInputElement>(null);
    const [copied, setCopied] = useState(false);

    // 3-Layer DOF scene controls
    const [foregroundDistance, setForegroundDistance] = useState(DEFAULT_LAYER_DISTANCES.foreground);
    const [backgroundDistance, setBackgroundDistance] = useState(DEFAULT_LAYER_DISTANCES.background);
    const [showLayeredScene, setShowLayeredScene] = useState(true); // Toggle between old blur and new layered

    // Bokeh shape controls
    const [bokehPreset, setBokehPreset] = useState<keyof typeof BOKEH_PRESETS>('standard');
    const bokehSettings = useMemo(() => BOKEH_PRESETS[bokehPreset], [bokehPreset]);

    // DOF Presets state
    const [userPresets, setUserPresets] = useState<DOFPreset[]>([]);
    const [showPresetManager, setShowPresetManager] = useState(false);
    const [presetName, setPresetName] = useState('');
    const [presetSaved, setPresetSaved] = useState(false);

    // Framing & Camera selection
    const [selectedFraming, setSelectedFraming] = useState<FramingPreset | null>(FRAMING_PRESETS.find(f => f.id === 'medium') || null);
    const [selectedCamera, setSelectedCamera] = useState<CameraModel | null>(null);
    const [isExtractingLayers, setIsExtractingLayers] = useState(false);
    const [extractedLayers, setExtractedLayers] = useState<{ subject?: string; background?: string; foreground?: string } | null>(null);

    // Phase 7: Optical Lab Integration
    const [showDollyZoom, setShowDollyZoom] = useState(false);
    const [showSceneDepth, setShowSceneDepth] = useState(false);
    const [compositorLayers, setCompositorLayers] = useState<LayerConfig[]>([]);
    const [useOpticalPhysics, setUseOpticalPhysics] = useState(true); // Use real physics calculations
    const [canvasWidth, setCanvasWidth] = useState(800);

    // Sidebar & accordion state
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['aperture', 'scene']));

    // Click-to-focus state
    const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
    const [showFocusPeaking, setShowFocusPeaking] = useState(true);
    const [clickToFocusEnabled, setClickToFocusEnabled] = useState(true);

    // Global Viewfinder Store subscription - enables "Remote Control" pattern
    // CameraControlPanel writes to this store, DirectorViewfinder subscribes and applies transforms
    const globalViewerTransformStyle = useViewerTransformStyle();
    const globalCameraMovement = useViewfinderStore((state) => state.cameraMovement);
    const globalStoreEnabled = useViewfinderStore((state) => state.isEnabled);

    const toggleSection = useCallback((section: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(section)) {
                next.delete(section);
            } else {
                next.add(section);
            }
            return next;
        });
    }, []);

    // Load user presets from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(DOF_PRESETS_STORAGE_KEY);
            if (stored) {
                setUserPresets(JSON.parse(stored));
            }
        } catch (e) {
            console.warn('Failed to load DOF presets:', e);
        }
    }, []);

    // Save preset to localStorage
    const saveCurrentAsPreset = useCallback(() => {
        if (!presetName.trim()) return;

        const newPreset: DOFPreset = {
            id: `user-${Date.now()}`,
            name: presetName.trim(),
            settings: { ...dofSettings },
            foregroundDistance,
            backgroundDistance,
            bokehPreset,
            createdAt: new Date().toISOString(),
        };

        const updated = [...userPresets, newPreset];
        setUserPresets(updated);
        localStorage.setItem(DOF_PRESETS_STORAGE_KEY, JSON.stringify(updated));
        setPresetName('');
        setPresetSaved(true);
        setTimeout(() => setPresetSaved(false), 2000);
    }, [presetName, dofSettings, foregroundDistance, backgroundDistance, bokehPreset, userPresets]);

    // Delete user preset
    const deletePreset = useCallback((presetId: string) => {
        const updated = userPresets.filter(p => p.id !== presetId);
        setUserPresets(updated);
        localStorage.setItem(DOF_PRESETS_STORAGE_KEY, JSON.stringify(updated));
    }, [userPresets]);

    // Apply a preset
    const applyPreset = useCallback((preset: DOFPreset) => {
        setDofSettings(preset.settings);
        setForegroundDistance(preset.foregroundDistance);
        setBackgroundDistance(preset.backgroundDistance);
        setBokehPreset(preset.bokehPreset);
        // Also update lens if we have one that matches
        const matchingLens = LENS_PRESETS.find(l => l.focalMm === preset.settings.focalLength);
        if (matchingLens) {
            setSelectedLens(matchingLens);
        }
    }, []);

    // Export preset as JSON for sharing
    const exportPreset = useCallback(() => {
        const currentPreset: DOFPreset = {
            id: `export-${Date.now()}`,
            name: 'Exported DOF Settings',
            settings: { ...dofSettings },
            foregroundDistance,
            backgroundDistance,
            bokehPreset,
            createdAt: new Date().toISOString(),
        };
        const blob = new Blob([JSON.stringify(currentPreset, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `dof-preset-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [dofSettings, foregroundDistance, backgroundDistance, bokehPreset]);

    // Import preset from JSON file
    const importPreset = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target?.result as string) as DOFPreset;
                // Validate it has required fields
                if (imported.settings && imported.foregroundDistance !== undefined) {
                    applyPreset(imported);
                }
            } catch (err) {
                console.error('Failed to import preset:', err);
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset input
    }, [applyPreset]);

    // Calculate DOF
    const dofResult = useMemo(() => calculateDOF(dofSettings), [dofSettings]);

    // Calculate FOV/AOV
    const aovResult = useMemo(() => calculateAOV(dofSettings.focalLength, dofSettings.sensorSize), [dofSettings.focalLength, dofSettings.sensorSize]);

    // Apply framing preset - adjusts focus distance based on preset
    const applyFramingPreset = useCallback((preset: FramingPreset) => {
        setSelectedFraming(preset);
        // Convert model distance to normalized focus distance (0.5m to 100m range)
        const normalizedDistance = Math.max(0, Math.min(1, (preset.modelDistance - 0.5) / 99.5));
        setDofSettings(prev => ({ ...prev, focusDistance: normalizedDistance }));
    }, []);

    // Apply camera preset - updates sensor size
    const applyCameraPreset = useCallback((camera: CameraModel) => {
        setSelectedCamera(camera);
        setDofSettings(prev => ({ ...prev, sensorSize: camera.sensorSize }));
    }, []);

    // Extract layers from reference image using AI
    const extractLayersFromImage = useCallback(async () => {
        if (!referenceImageUrl) return;

        setIsExtractingLayers(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/viewfinder/extract-subject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: referenceImageUrl }),
            });
            const data = await response.json();
            if (data.success) {
                setExtractedLayers({
                    subject: data.subject?.imageUrl,
                    background: data.background?.imageUrl,
                });
            }
        } catch (error) {
            console.error('Failed to extract layers:', error);
        } finally {
            setIsExtractingLayers(false);
        }
    }, [referenceImageUrl]);

    // Manual layer upload handler
    const handleManualLayerUpload = useCallback(async (
        layerType: 'subject' | 'background' | 'foreground',
        file: File
    ) => {
        try {
            // Upload to backend using the temp upload endpoint
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${BACKEND_URL}/api/process/upload-temp`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Upload failed: ${response.status} - ${errorText}`);
                throw new Error(`Upload failed: ${response.status}`);
            }

            const data = await response.json();
            // The upload-temp endpoint returns fileUrl
            const rawUrl = data.fileUrl || data.url;

            if (!rawUrl) {
                throw new Error('No URL returned from upload');
            }

            // Prefix with backend URL if it's a relative path
            const imageUrl = rawUrl.startsWith('http') ? rawUrl : `${BACKEND_URL}${rawUrl}`;

            // Update extractedLayers state
            setExtractedLayers(prev => ({
                ...prev,
                [layerType]: imageUrl,
            }));

            console.log(`[Viewfinder] Manual ${layerType} layer uploaded:`, imageUrl);
        } catch (error) {
            console.error(`Failed to upload ${layerType} layer:`, error);
        }
    }, []);

    // Phase 7: Convert extracted layers to LayerConfig for compositor
    const initializeCompositorLayers = useCallback(() => {
        if (!extractedLayers) return;

        const layers: LayerConfig[] = [];

        // Convert focus distance slider (0-1) to meters
        const focusDistanceM = 0.5 + dofSettings.focusDistance * 99.5;

        if (extractedLayers.subject) {
            layers.push({
                id: 'subject-layer',
                name: 'Subject',
                imageUrl: extractedLayers.subject,
                distanceM: focusDistanceM, // Subject at focus distance
                type: 'subject',
                isVisible: true,
                isLocked: false,
                opacity: 1,
                zIndex: 1,
                offsetX: 0,
                offsetY: 0,
                scale: 1,
            });
        }

        if (extractedLayers.background) {
            layers.push({
                id: 'background-layer',
                name: 'Background',
                imageUrl: extractedLayers.background,
                distanceM: backgroundDistance,
                type: 'background',
                isVisible: true,
                isLocked: false,
                opacity: 1,
                zIndex: 0,
                offsetX: 0,
                offsetY: 0,
                scale: 1,
            });
        }

        // Add foreground layer (with image if manually uploaded, or placeholder)
        if (extractedLayers.foreground) {
            layers.push({
                id: 'foreground-layer',
                name: 'Foreground',
                imageUrl: extractedLayers.foreground,
                distanceM: foregroundDistance,
                type: 'foreground',
                isVisible: true,
                isLocked: false,
                opacity: 0.8,
                zIndex: 2,
                offsetX: 0,
                offsetY: 0,
                scale: 1,
            });
        } else {
            // Add placeholder for foreground (hidden by default)
            layers.push({
                id: 'foreground-layer',
                name: 'Foreground',
                imageUrl: '', // Empty until user adds content
                distanceM: foregroundDistance,
                type: 'foreground',
                isVisible: false,
                isLocked: false,
                opacity: 0.8,
                zIndex: 2,
                offsetX: 0,
                offsetY: 0,
                scale: 1,
            });
        }

        setCompositorLayers(layers);
        setShowSceneDepth(true);
    }, [extractedLayers, dofSettings.focusDistance, backgroundDistance, foregroundDistance]);

    // Auto-initialize compositor when layers are extracted or manually uploaded
    useEffect(() => {
        if (extractedLayers && (extractedLayers.subject || extractedLayers.background || extractedLayers.foreground)) {
            // Only auto-initialize if compositor is empty (first time layers are ready)
            if (compositorLayers.length === 0) {
                initializeCompositorLayers();
            } else {
                // Update existing compositor layers with new layer URLs
                setCompositorLayers(prev => {
                    const updated = [...prev];

                    if (extractedLayers.subject) {
                        const subjectIdx = updated.findIndex(l => l.type === 'subject');
                        if (subjectIdx >= 0) {
                            updated[subjectIdx] = { ...updated[subjectIdx], imageUrl: extractedLayers.subject };
                        }
                    }

                    if (extractedLayers.background) {
                        const bgIdx = updated.findIndex(l => l.type === 'background');
                        if (bgIdx >= 0) {
                            updated[bgIdx] = { ...updated[bgIdx], imageUrl: extractedLayers.background };
                        }
                    }

                    if (extractedLayers.foreground) {
                        const fgIdx = updated.findIndex(l => l.type === 'foreground');
                        if (fgIdx >= 0) {
                            updated[fgIdx] = { ...updated[fgIdx], imageUrl: extractedLayers.foreground, isVisible: true };
                        }
                    }

                    return updated;
                });
            }
        }
    }, [extractedLayers, compositorLayers.length, initializeCompositorLayers]);

    // Phase 7: Handle layer updates from SceneDepthControls
    const handleLayerUpdate = useCallback((layerId: string, updates: Partial<LayerConfig>) => {
        setCompositorLayers(prev =>
            prev.map(layer =>
                layer.id === layerId ? { ...layer, ...updates } : layer
            )
        );
    }, []);

    // Phase 7: Handle layer deletion
    const handleLayerDelete = useCallback((layerId: string) => {
        setCompositorLayers(prev => prev.filter(layer => layer.id !== layerId));
    }, []);

    // Phase 7: Handle layer reordering
    const handleLayerReorder = useCallback((newLayers: LayerConfig[]) => {
        setCompositorLayers(newLayers);
    }, []);

    // Phase 7: Camera settings for optical physics
    const cameraSettingsForPhysics = useMemo(() => ({
        focalLengthMm: dofSettings.focalLength,
        aperture: dofSettings.aperture,
        focusDistanceM: 0.5 + dofSettings.focusDistance * 99.5,
        sensorType: dofSettings.sensorSize,
    }), [dofSettings]);

    // Generate DOF prompt text from current settings
    const generateDOFPrompt = useCallback(() => {
        const parts: string[] = [];

        // Lens info with equivalent focal length for non-full-frame
        if (selectedLens) {
            if (dofSettings.sensorSize !== 'full-frame') {
                parts.push(`shot on ${selectedLens.focalLength} lens (${dofResult.equivalentFocalLength}mm equivalent)`);
            } else {
                parts.push(`shot on ${selectedLens.focalLength} lens`);
            }
            // Add key lens characteristics from the preset
            if (selectedLens.promptModifiers.length > 0) {
                const relevantMods = selectedLens.promptModifiers.filter(mod =>
                    mod.includes('depth of field') ||
                    mod.includes('bokeh') ||
                    mod.includes('perspective') ||
                    mod.includes('compression') ||
                    mod.includes('isolation')
                );
                if (relevantMods.length > 0) {
                    parts.push(...relevantMods.slice(0, 3));
                }
            }
        } else {
            if (dofSettings.sensorSize !== 'full-frame') {
                parts.push(`${dofSettings.focalLength}mm lens (${dofResult.equivalentFocalLength}mm equivalent)`);
            } else {
                parts.push(`${dofSettings.focalLength}mm lens`);
            }
        }

        // Aperture
        parts.push(`f/${dofSettings.aperture} aperture`);

        // DOF description based on aperture
        if (dofSettings.aperture <= 2.8) {
            parts.push('shallow depth of field');
            parts.push('creamy bokeh');
            parts.push('background blur');
        } else if (dofSettings.aperture <= 5.6) {
            parts.push('moderate depth of field');
        } else {
            parts.push('deep depth of field');
            parts.push('sharp throughout');
        }

        // Focus distance and DOF range
        parts.push(`focus at ${dofResult.focusDistanceM.toFixed(1)}m`);

        // Add DOF range info for context
        if (dofResult.totalDOF !== Infinity) {
            parts.push(`sharp from ${dofResult.nearFocus.toFixed(1)}m to ${dofResult.farFocus.toFixed(1)}m`);
        } else {
            parts.push(`sharp from ${dofResult.nearFocus.toFixed(1)}m to infinity`);
        }

        return parts.join(', ');
    }, [selectedLens, dofSettings, dofResult]);

    // Copy DOF prompt to clipboard
    const copyDOFPrompt = useCallback(async () => {
        const prompt = generateDOFPrompt();
        try {
            await navigator.clipboard.writeText(prompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy DOF prompt:', err);
        }
    }, [generateDOFPrompt]);

    // Sync lens preset with DOF focal length
    useEffect(() => {
        if (selectedLens) {
            setDofSettings(prev => ({ ...prev, focalLength: selectedLens.focalMm }));
        }
    }, [selectedLens]);

    // Update parent when elements change
    useEffect(() => {
        onElementsChange?.(localElements);
    }, [localElements, onElementsChange]);

    // Handle element updates
    const handleElementUpdate = useCallback((id: string, updates: Partial<ViewfinderElement>) => {
        setLocalElements(prev =>
            prev.map(el => (el.id === id ? { ...el, ...updates } : el))
        );
    }, []);

    // Toggle framing guide
    const toggleGuide = (guideId: string) => {
        setFramingGuides(prev =>
            prev.map(g => (g.id === guideId ? { ...g, enabled: !g.enabled } : g))
        );
    };

    // =========================================================================
    // CLICK-TO-FOCUS SYSTEM
    // =========================================================================

    /**
     * Snap-to-Grid for Composition Guides
     * When focus point is near a grid intersection (Rule of Thirds, Golden Ratio),
     * snap to that intersection for precise composition.
     */
    const snapToGrid = useCallback((x: number, y: number): { x: number; y: number; snapped: boolean } => {
        const SNAP_THRESHOLD = 0.05; // 5% of frame = snap zone

        // Get enabled guides
        const enabledGuides = framingGuides.filter(g => g.enabled);
        if (enabledGuides.length === 0 || !showGuides) {
            return { x, y, snapped: false };
        }

        // Collect all grid intersection points from enabled guides
        const gridPoints: Array<{ x: number; y: number }> = [];

        enabledGuides.forEach(guide => {
            switch (guide.type) {
                case 'rule-of-thirds':
                    // 4 intersection points at 1/3 and 2/3
                    gridPoints.push({ x: 1/3, y: 1/3 });
                    gridPoints.push({ x: 2/3, y: 1/3 });
                    gridPoints.push({ x: 1/3, y: 2/3 });
                    gridPoints.push({ x: 2/3, y: 2/3 });
                    break;
                case 'golden-ratio':
                    // Golden ratio ≈ 0.382 and 0.618
                    const phi = 1.618;
                    const gx1 = 1 / phi;      // ≈ 0.618
                    const gx2 = 1 - 1 / phi;  // ≈ 0.382
                    gridPoints.push({ x: gx1, y: gx2 });
                    gridPoints.push({ x: gx2, y: gx2 });
                    gridPoints.push({ x: gx1, y: gx1 });
                    gridPoints.push({ x: gx2, y: gx1 });
                    break;
                case 'center':
                    // Center point
                    gridPoints.push({ x: 0.5, y: 0.5 });
                    break;
                case 'diagonal':
                    // Diagonal crossings at center and quarters
                    gridPoints.push({ x: 0.5, y: 0.5 });
                    gridPoints.push({ x: 0.25, y: 0.25 });
                    gridPoints.push({ x: 0.75, y: 0.75 });
                    gridPoints.push({ x: 0.25, y: 0.75 });
                    gridPoints.push({ x: 0.75, y: 0.25 });
                    break;
            }
        });

        // Find closest grid point within threshold
        let closestPoint = { x, y };
        let closestDistance = Infinity;
        let snapped = false;

        gridPoints.forEach(point => {
            const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
            if (distance < SNAP_THRESHOLD && distance < closestDistance) {
                closestDistance = distance;
                closestPoint = point;
                snapped = true;
            }
        });

        return { ...closestPoint, snapped };
    }, [framingGuides, showGuides]);

    /**
     * Handle click on viewport to set focus point
     * Uses a simple depth estimation based on click position:
     * - Top of frame = far (background)
     * - Bottom of frame = near (foreground)
     * - This is a rough heuristic; with depth maps, we'd use actual depth values
     * - Snaps to composition grid when near an intersection
     */
    const handleViewportClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!clickToFocusEnabled || activeTab !== 'dof') return;

        const rect = e.currentTarget.getBoundingClientRect();
        let x = (e.clientX - rect.left) / rect.width;  // 0-1 normalized
        let y = (e.clientY - rect.top) / rect.height;  // 0-1 normalized

        // Snap to composition grid intersections if near them
        const snapResult = snapToGrid(x, y);
        x = snapResult.x;
        y = snapResult.y;

        // Set focus point for visual indicator
        setFocusPoint({ x, y });

        // Estimate focus distance based on vertical position
        // Top (y=0) = far background (50m), Bottom (y=1) = near foreground (1m)
        // This is a rough heuristic - ideally we'd use actual depth data
        const estimatedDistanceM = 1 + (1 - y) * 49; // 1m to 50m range

        // Convert to normalized focus distance (0.5m to 100m mapped to 0-1)
        const normalizedFocus = Math.max(0, Math.min(1, (estimatedDistanceM - 0.5) / 99.5));

        setDofSettings(prev => ({ ...prev, focusDistance: normalizedFocus }));

        console.log(`[Viewfinder] Click-to-focus: (${x.toFixed(2)}, ${y.toFixed(2)}) → ${estimatedDistanceM.toFixed(1)}m${snapResult.snapped ? ' [SNAPPED]' : ''}`);
    }, [clickToFocusEnabled, activeTab, snapToGrid]);

    /**
     * Generate Camera Recipe from current settings
     * This can be exported for use in generation prompts
     */
    const generateCameraRecipe = useCallback((): CameraRecipe => {
        const focusDistanceM = 0.5 + dofSettings.focusDistance * 99.5;

        // Generate prompt suffix based on settings
        const promptParts: string[] = [];
        promptParts.push(`${dofSettings.focalLength}mm`);
        promptParts.push(`f/${dofSettings.aperture}`);

        if (dofSettings.aperture <= 2.8) {
            promptParts.push('shallow depth of field');
            promptParts.push('bokeh background');
        } else if (dofSettings.aperture >= 11) {
            promptParts.push('deep focus');
            promptParts.push('sharp throughout');
        }

        // Negative prompt for protecting subject
        const negativeParts: string[] = [];
        if (dofSettings.aperture <= 4) {
            negativeParts.push('blurry subject');
            negativeParts.push('out of focus main subject');
        }

        return {
            focusPoint: focusPoint || { x: 0.5, y: 0.5 },
            focusDistanceM,
            aperture: dofSettings.aperture,
            focalLengthMm: dofSettings.focalLength,
            sensorSize: dofSettings.sensorSize,
            depthOfField: {
                nearM: dofResult.nearFocus,
                farM: dofResult.farFocus === Infinity ? 9999 : dofResult.farFocus,
                totalM: dofResult.totalDOF === Infinity ? 9999 : dofResult.totalDOF,
                hyperfocalM: dofResult.hyperfocalDistance,
            },
            promptSuffix: promptParts.join(', '),
            negativePromptSuffix: negativeParts.join(', '),
        };
    }, [dofSettings, dofResult, focusPoint]);

    // Notify parent when camera settings change
    useEffect(() => {
        if (onCameraRecipeChange) {
            const recipe = generateCameraRecipe();
            onCameraRecipeChange(recipe);
        }
    }, [dofSettings, focusPoint, generateCameraRecipe, onCameraRecipeChange]);

    /**
     * Export camera recipe to clipboard as JSON
     */
    const exportCameraRecipe = useCallback(async () => {
        const recipe = generateCameraRecipe();
        try {
            await navigator.clipboard.writeText(JSON.stringify(recipe, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy camera recipe:', err);
        }
    }, [generateCameraRecipe]);

    // Start AR camera
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: 1920, height: 1080 },
            });
            setCameraStream(stream);
            setArActive(true);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error('Camera access denied:', err);
        }
    };

    // Stop AR camera
    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setArActive(false);
    };

    // Capture current view with Technical Strip (professional metadata burn-in)
    const captureView = () => {
        if (!canvasRef.current || !containerRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size (add space for technical strip at bottom)
        const rect = containerRef.current.getBoundingClientRect();
        const stripHeight = 32; // Height of the technical metadata strip
        canvas.width = rect.width;
        canvas.height = rect.height + stripHeight;

        /**
         * Draw Technical Strip - Professional metadata burn-in
         * Shows: Focal Length | Aperture | Focus Distance | DOF | Date
         */
        const drawTechnicalStrip = () => {
            const y = rect.height; // Top of the strip

            // Black background strip
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, y, canvas.width, stripHeight);

            // Top border line
            ctx.strokeStyle = 'rgba(34, 211, 238, 0.3)'; // cyan-400/30
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();

            // Technical data
            const recipe = generateCameraRecipe();
            const date = new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            });

            const technicalData = [
                { label: 'LENS', value: `${dofSettings.focalLength}mm`, color: '#fbbf24' }, // amber
                { label: 'f/', value: `${dofSettings.aperture}`, color: '#22d3ee' }, // cyan
                { label: 'FOCUS', value: `${recipe.focusDistanceM.toFixed(1)}m`, color: '#4ade80' }, // green
                { label: 'DOF', value: recipe.depthOfField.totalM === Infinity ? '∞' : `${recipe.depthOfField.totalM.toFixed(1)}m`, color: '#ffffff' },
                { label: 'SENSOR', value: dofSettings.sensorSize === 'full-frame' ? 'FF' : dofSettings.sensorSize === 'aps-c' ? 'APS-C' : 'M4/3', color: '#a78bfa' }, // purple
                { label: '', value: date, color: '#6b7280' }, // gray
            ];

            // Calculate spacing
            const padding = 16;
            const itemWidth = (canvas.width - padding * 2) / technicalData.length;

            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.textBaseline = 'middle';

            technicalData.forEach((item, i) => {
                const x = padding + i * itemWidth;
                const centerY = y + stripHeight / 2;

                if (item.label) {
                    // Label in gray
                    ctx.fillStyle = '#6b7280';
                    ctx.fillText(item.label, x, centerY - 6);
                }

                // Value in color
                ctx.fillStyle = item.color;
                ctx.font = 'bold 11px "JetBrains Mono", monospace';
                ctx.fillText(item.value, x + (item.label ? 0 : 0), centerY + (item.label ? 6 : 0));
                ctx.font = '10px "JetBrains Mono", monospace';
            });

            // VibeBoard watermark (right side)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.font = '9px Inter, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText('VibeBoard Director\'s Viewfinder', canvas.width - padding, y + stripHeight / 2);
            ctx.textAlign = 'left';
        };

        // Draw reference image or video
        if (arActive && videoRef.current) {
            ctx.drawImage(videoRef.current, 0, 0, rect.width, rect.height);
            drawTechnicalStrip();
            const dataUrl = canvas.toDataURL('image/png');
            onCapture?.(dataUrl);
        } else if (referenceImageUrl) {
            const img = new window.Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                ctx.drawImage(img, 0, 0, rect.width, rect.height);

                // Draw elements on top
                let elementsLoaded = 0;
                const totalElements = localElements.length;

                const finalizeCapture = () => {
                    drawTechnicalStrip();
                    const dataUrl = canvas.toDataURL('image/png');
                    onCapture?.(dataUrl);
                };

                if (totalElements === 0) {
                    finalizeCapture();
                    return;
                }

                localElements.forEach(el => {
                    const elImg = new window.Image();
                    elImg.crossOrigin = 'anonymous';
                    elImg.onload = () => {
                        ctx.save();
                        ctx.globalAlpha = el.opacity;
                        ctx.translate(el.x * rect.width, el.y * rect.height);
                        ctx.rotate((el.rotation * Math.PI) / 180);
                        ctx.scale(el.scale, el.scale);
                        ctx.drawImage(elImg, -elImg.width / 2, -elImg.height / 2);
                        ctx.restore();

                        elementsLoaded++;
                        if (elementsLoaded === totalElements) {
                            finalizeCapture();
                        }
                    };
                    elImg.onerror = () => {
                        elementsLoaded++;
                        if (elementsLoaded === totalElements) {
                            finalizeCapture();
                        }
                    };
                    elImg.src = el.imageUrl;
                });
            };
            img.src = referenceImageUrl;
        }
    };

    // Get container dimensions
    const [dimensions, setDimensions] = useState({ width: 800, height: 450 });
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setDimensions({ width: rect.width, height: rect.height });
            }
        };
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    // Panel content - REDESIGNED: Side-by-side layout with collapsible sidebar
    const panelContent = (
        <div className="flex h-full bg-[#0a0a0a]">
            {/* ===== LEFT SIDE: VIEWFINDER (majority of space) ===== */}
            <div className="flex flex-1 flex-col">
                {/* Compact Header */}
                <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                    <div className="flex items-center gap-2">
                        {/* Page Sidebar Toggle - collapse/expand the references panel */}
                        {onTogglePageSidebar && (
                            <Tooltip content={pageSidebarCollapsed ? 'Show References' : 'Hide References'} side="bottom">
                                <button
                                    onClick={onTogglePageSidebar}
                                    className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                                >
                                    {pageSidebarCollapsed ? (
                                        <PanelLeftOpen className="h-4 w-4" />
                                    ) : (
                                        <PanelLeftClose className="h-4 w-4" />
                                    )}
                                </button>
                            </Tooltip>
                        )}
                        <Camera className="h-4 w-4 text-cyan-400" />
                        <h2 className="text-sm font-bold text-white">Director&apos;s Viewfinder</h2>
                        {/* Tab Pills - compact */}
                        <div className="ml-4 flex gap-1">
                            {[
                                { id: 'dof', icon: Focus, label: 'DOF' },
                                { id: 'composite', icon: Layers, label: 'Composite' },
                                { id: 'ar', icon: Smartphone, label: 'AR' },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                    className={clsx(
                                        'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all',
                                        activeTab === tab.id
                                            ? 'bg-cyan-500/20 text-cyan-400'
                                            : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
                                    )}
                                >
                                    <tab.icon className="h-3 w-3" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {/* Framing Guides Toggle */}
                        <Tooltip content="Toggle Guides" side="bottom">
                            <button
                                onClick={() => setShowGuides(!showGuides)}
                                className={clsx(
                                    'rounded-lg p-1.5 transition-colors',
                                    showGuides ? 'bg-white/10 text-white' : 'text-gray-500 hover:bg-white/5'
                                )}
                            >
                                <Grid3X3 className="h-3.5 w-3.5" />
                            </button>
                        </Tooltip>
                        {/* Sidebar Toggle */}
                        <Tooltip content={sidebarOpen ? 'Hide Controls' : 'Show Controls'} side="bottom">
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                            >
                                {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                            </button>
                        </Tooltip>
                        <Tooltip content={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'} side="bottom">
                            <button
                                onClick={() => setIsFullscreen(!isFullscreen)}
                                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                            >
                                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                            </button>
                        </Tooltip>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Viewport */}
                <div className="relative flex-1 overflow-hidden bg-black">
                    <div
                        ref={containerRef}
                        className="relative h-full w-full cursor-crosshair"
                        onClick={handleViewportClick}
                    >
                        {/* Global Camera Movement Transform Layer
                        This div applies transforms from the global viewfinderStore.
                        When CameraControlPanel (useGlobalStore=true) updates camera movement,
                        these CSS transforms are applied here - enabling the "Remote Control" pattern.
                        NOTE: This is a 2D FLAT COMPOSITE simulation, not true 3D perspective. */}
                        <div
                            className="absolute inset-0"
                            style={globalStoreEnabled ? globalViewerTransformStyle : undefined}
                        >
                            {/* DOF Tab - Use 3-Layer Scene or fallback */}
                            {activeTab === 'dof' && showLayeredScene ? (
                                <DOFLayeredScene
                                    settings={dofSettings}
                                    foregroundDistance={foregroundDistance}
                                    backgroundDistance={backgroundDistance}
                                    viewportWidth={dimensions.width}
                                    viewportHeight={dimensions.height}
                                    referenceImageUrl={referenceImageUrl}
                                    bokehSettings={bokehSettings}
                                    compositorLayers={compositorLayers}
                                />
                            ) : (
                                <>
                                    {/* Legacy single-blur mode or non-DOF tabs */}
                                    <div
                                        className="absolute inset-0"
                                        style={{
                                            filter: activeTab === 'dof' ? `blur(${dofResult.blurAmount * 10}px)` : 'none',
                                        }}
                                    >
                                        {/* Background Image/Video */}
                                        {arActive && activeTab === 'ar' ? (
                                            <video
                                                ref={videoRef}
                                                autoPlay
                                                playsInline
                                                muted
                                                className="h-full w-full object-cover"
                                            />
                                        ) : referenceImageUrl ? (
                                            <img
                                                src={referenceImageUrl}
                                                alt="Reference"
                                                className="h-full w-full object-contain"
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center text-gray-600">
                                                <div className="text-center">
                                                    <Image className="mx-auto h-16 w-16 opacity-50" />
                                                    <p className="mt-4 text-sm">No reference image</p>
                                                    <p className="text-xs text-gray-700">Drop an image or enable AR mode</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Composite Elements */}
                            {activeTab === 'composite' &&
                                localElements.map(el => (
                                    <DraggableElement
                                        key={el.id}
                                        element={el}
                                        onUpdate={updates => handleElementUpdate(el.id, updates)}
                                        isSelected={selectedElementId === el.id}
                                        onSelect={() => setSelectedElementId(el.id)}
                                        containerRef={containerRef as React.RefObject<HTMLDivElement>}
                                    />
                                ))}

                            {/* Framing Guides */}
                            {showGuides &&
                                framingGuides.map(guide => (
                                    <FramingGuideOverlay
                                        key={guide.id}
                                        guide={guide}
                                        width={dimensions.width}
                                        height={dimensions.height}
                                    />
                                ))}

                            {/* CLICK-TO-FOCUS: Focus Point Indicator with DOF Zones */}
                            {activeTab === 'dof' && clickToFocusEnabled && (
                                <>
                                    {/* DOF Zone Visualization - shows in-focus, acceptable, and blurred zones */}
                                    {showFocusPeaking && focusPoint && (
                                        <div className="pointer-events-none absolute inset-0">
                                            {/* Blurred zones (top and bottom) - shown with semi-transparent overlay */}
                                            <div
                                                className="absolute inset-x-0 top-0 bg-gradient-to-b from-red-500/20 to-transparent"
                                                style={{
                                                    height: `${Math.max(0, (focusPoint.y - 0.15) * 100)}%`,
                                                }}
                                            />
                                            <div
                                                className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-red-500/20 to-transparent"
                                                style={{
                                                    height: `${Math.max(0, (1 - focusPoint.y - 0.15) * 100)}%`,
                                                }}
                                            />
                                            {/* In-focus zone - highlighted with green tint */}
                                            <div
                                                className="absolute inset-x-0 border-y border-green-400/30 bg-green-400/5"
                                                style={{
                                                    top: `${Math.max(0, (focusPoint.y - 0.15) * 100)}%`,
                                                    height: `${Math.min(30, 30)}%`,
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Focus Point Reticle - appears where user clicked */}
                                    {focusPoint && (
                                        <div
                                            className="pointer-events-none absolute"
                                            style={{
                                                left: `${focusPoint.x * 100}%`,
                                                top: `${focusPoint.y * 100}%`,
                                                transform: 'translate(-50%, -50%)',
                                            }}
                                        >
                                            {/* Outer ring - pulsing */}
                                            <div className="absolute -inset-6 animate-ping rounded-full border border-green-400/50" />
                                            {/* Middle ring - static */}
                                            <div className="absolute -inset-4 rounded-full border-2 border-green-400/80" />
                                            {/* Inner crosshair */}
                                            <div className="absolute -inset-2 flex items-center justify-center">
                                                <div className="h-0.5 w-4 bg-green-400" />
                                            </div>
                                            <div className="absolute -inset-2 flex items-center justify-center">
                                                <div className="h-4 w-0.5 bg-green-400" />
                                            </div>
                                            {/* Focus distance label */}
                                            <div className="absolute left-6 top-0 whitespace-nowrap rounded bg-black/80 px-2 py-0.5 text-[10px] font-medium text-green-400">
                                                {dofResult.focusDistanceM.toFixed(1)}m
                                            </div>
                                            {/* DOF range label */}
                                            <div className="absolute left-6 top-5 whitespace-nowrap rounded bg-black/60 px-2 py-0.5 text-[9px] text-gray-400">
                                                {dofResult.nearFocus.toFixed(1)}m - {dofResult.farFocus === Infinity ? '∞' : `${dofResult.farFocus.toFixed(1)}m`}
                                            </div>
                                        </div>
                                    )}

                                    {/* Hint text when no focus point set */}
                                    {!focusPoint && (
                                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                            <div className="flex items-center gap-2 rounded-lg bg-black/60 px-4 py-2 text-sm text-gray-400">
                                                <Target className="h-4 w-4 text-green-400" />
                                                Click anywhere to focus
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Legacy DOF Focus Point Indicator - only in legacy mode without click-to-focus */}
                            {activeTab === 'dof' && !showLayeredScene && !clickToFocusEnabled && (
                                <div
                                    className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-green-400 shadow-lg shadow-green-500/30"
                                    style={{
                                        left: '50%',
                                        top: `${(1 - dofSettings.focusDistance) * 100}%`,
                                    }}
                                >
                                    <div className="absolute inset-0 animate-ping rounded-full border border-green-400 opacity-50" />
                                </div>
                            )}

                            {/* Camera Movement Indicator - shows when global store has active movement */}
                            {globalStoreEnabled && globalCameraMovement.type !== 'static' && (
                                <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-2 rounded-lg bg-black/70 px-3 py-1.5 text-xs text-cyan-400">
                                    <Move className="h-3.5 w-3.5" />
                                    <span className="uppercase tracking-wide">
                                        {globalCameraMovement.type} {globalCameraMovement.direction}
                                    </span>
                                    {globalCameraMovement.intensity && (
                                        <span className="text-gray-400">({globalCameraMovement.intensity})</span>
                                    )}
                                </div>
                            )}
                        </div>{/* End of Global Camera Movement Transform Layer */}
                    </div>

                    {/* Hidden canvas for capture */}
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Bottom Action Bar - compact */}
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
                        {/* Framing Guide Buttons */}
                        <div className="flex items-center gap-1">
                            {showGuides &&
                                framingGuides.map(guide => (
                                    <Tooltip key={guide.id} content={guide.name} side="top">
                                        <button
                                            onClick={() => toggleGuide(guide.id)}
                                            className={clsx(
                                                'h-5 w-5 rounded border transition-all',
                                                guide.enabled
                                                    ? 'border-white/30 bg-white/20'
                                                    : 'border-white/10 bg-transparent hover:border-white/20'
                                            )}
                                            style={{
                                                backgroundColor: guide.enabled ? guide.color.replace('40', '60') : undefined,
                                            }}
                                        />
                                    </Tooltip>
                                ))}
                        </div>

                        {/* DOF Stats Overlay - always visible */}
                        {activeTab === 'dof' && (
                            <div className="flex items-center gap-3 rounded-lg bg-black/60 px-3 py-1">
                                <div className="text-center">
                                    <div className="text-[8px] text-gray-500">Aperture</div>
                                    <div className="font-mono text-xs font-bold text-cyan-400">f/{dofSettings.aperture}</div>
                                </div>
                                <div className="h-4 w-px bg-white/10" />
                                <div className="text-center">
                                    <div className="text-[8px] text-gray-500">Focus</div>
                                    <div className="font-mono text-xs text-green-400">{dofResult.focusDistanceM.toFixed(1)}m</div>
                                </div>
                                <div className="h-4 w-px bg-white/10" />
                                <div className="text-center">
                                    <div className="text-[8px] text-gray-500">DOF</div>
                                    <div className="font-mono text-xs text-white">
                                        {dofResult.totalDOF === Infinity ? '∞' : `${dofResult.totalDOF.toFixed(1)}m`}
                                    </div>
                                </div>
                                <div className="h-4 w-px bg-white/10" />
                                <div className="text-center">
                                    <div className="text-[8px] text-gray-500">Lens</div>
                                    <div className="font-mono text-xs text-amber-400">{dofSettings.focalLength}mm</div>
                                </div>
                                {/* 2D Flat Composite note - manages user expectations */}
                                <div className="h-4 w-px bg-white/10" />
                                <Tooltip content="This is a 2D CSS simulation. Real 3D perspective transforms would require WebGL or Three.js." side="top">
                                    <div className="flex items-center gap-1 text-gray-500">
                                        <Info className="h-3 w-3" />
                                        <span className="text-[8px] uppercase tracking-wider">2D Sim</span>
                                    </div>
                                </Tooltip>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5">
                            {activeTab === 'dof' && (
                                <Tooltip content={copied ? 'Copied!' : 'Copy DOF prompt'} side="top">
                                    <button
                                        onClick={copyDOFPrompt}
                                        className={clsx(
                                            'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
                                            copied
                                                ? 'bg-green-500 text-white'
                                                : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30'
                                        )}
                                    >
                                        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                        {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                </Tooltip>
                            )}
                            <button
                                onClick={captureView}
                                disabled={!referenceImageUrl && !arActive}
                                className={clsx(
                                    'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
                                    referenceImageUrl || arActive
                                        ? 'bg-green-500 text-white hover:bg-green-400'
                                        : 'cursor-not-allowed bg-gray-700 text-gray-500'
                                )}
                            >
                                <Camera className="h-3.5 w-3.5" />
                                Capture
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {/* END LEFT SIDE */}

            {/* ===== RIGHT SIDE: COLLAPSIBLE CONTROL SIDEBAR ===== */}
            <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 320, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex w-80 shrink-0 flex-col overflow-hidden border-l border-white/10 bg-[#111]"
                    >
                        <div className="flex-1 overflow-y-auto">
                            {/* DOF Tab Controls */}
                            {activeTab === 'dof' && (
                                <>
                                    {/* DOF Visualizer - always visible at top */}
                                    <div className="border-b border-white/10 p-3">
                                        <DOFVisualizer settings={dofSettings} />
                                        {/* Diffraction Warning */}
                                        {dofResult.isDiffractionLimited && (
                                            <div className="mt-2 flex items-center gap-1.5 rounded bg-amber-500/10 px-2 py-1">
                                                <AlertTriangle className="h-3 w-3 flex-shrink-0 text-amber-400" />
                                                <span className="text-[9px] text-amber-300">Diffraction at f/{dofSettings.aperture}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* ACCORDION SECTIONS */}

                                    {/* Aperture & Focus */}
                                    <AccordionSection id="aperture" title="Aperture & Focus" icon={Aperture} color="cyan" isExpanded={expandedSections.has('aperture')} onToggle={toggleSection}>
                                        <div className="space-y-3">
                                            {/* Aperture */}
                                            <div>
                                                <div className="mb-1 flex items-center justify-between">
                                                    <span className="text-[10px] text-gray-500">Aperture</span>
                                                    <span className="font-mono text-xs font-bold text-white">f/{dofSettings.aperture}</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={0}
                                                    max={APERTURE_STOPS.length - 1}
                                                    value={APERTURE_STOPS.indexOf(dofSettings.aperture)}
                                                    onChange={e => setDofSettings(prev => ({ ...prev, aperture: APERTURE_STOPS[Number(e.target.value)] }))}
                                                    className="w-full accent-cyan-400"
                                                />
                                                {/* Digital blur simulation note - manages user expectations */}
                                                <p className="mt-1 text-[8px] leading-relaxed text-gray-600">
                                                    CSS blur simulation. Final generation uses <span className="text-cyan-400">Learn2Refocus</span> for photorealistic bokeh.
                                                </p>
                                            </div>
                                            {/* Focus Distance */}
                                            <div>
                                                <div className="mb-1 flex items-center justify-between">
                                                    <span className="text-[10px] text-gray-500">Focus</span>
                                                    <span className="font-mono text-xs text-green-400">
                                                        {(0.5 + dofSettings.focusDistance * 99.5).toFixed(1)}m
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={0}
                                                    max={100}
                                                    value={dofSettings.focusDistance * 100}
                                                    onChange={e => setDofSettings(prev => ({ ...prev, focusDistance: Number(e.target.value) / 100 }))}
                                                    className="w-full accent-green-400"
                                                />
                                            </div>
                                            {/* DOF Split indicator */}
                                            <div className="flex h-1.5 overflow-hidden rounded-full bg-gray-800">
                                                <div className="bg-cyan-500" style={{ width: `${dofResult.frontPercent}%` }} />
                                                <div className="w-px bg-white" />
                                                <div className="bg-purple-500" style={{ width: `${dofResult.backPercent}%` }} />
                                            </div>
                                            <div className="flex justify-between text-[8px] text-gray-600">
                                                <span>{dofResult.frontDOF.toFixed(1)}m front</span>
                                                <span>{dofResult.backDOF === Infinity ? '∞' : `${dofResult.backDOF.toFixed(1)}m`} back</span>
                                            </div>
                                        </div>
                                    </AccordionSection>

                                    {/* Focus Controls - Click-to-Focus, Peaking, Recipe Export */}
                                    <AccordionSection id="focus-controls" title="Focus Controls" icon={Target} color="green" isExpanded={expandedSections.has('focus-controls')} onToggle={toggleSection}>
                                        <div className="space-y-3">
                                            {/* Click-to-Focus Toggle */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Target className="h-3.5 w-3.5 text-green-400" />
                                                    <span className="text-[10px] text-gray-400">Click to Focus</span>
                                                </div>
                                                <button
                                                    onClick={() => setClickToFocusEnabled(!clickToFocusEnabled)}
                                                    className={clsx(
                                                        'rounded px-2 py-0.5 text-[9px] font-medium transition-all',
                                                        clickToFocusEnabled ? 'bg-green-500/20 text-green-300' : 'bg-white/5 text-gray-500'
                                                    )}
                                                >
                                                    {clickToFocusEnabled ? 'ON' : 'OFF'}
                                                </button>
                                            </div>

                                            {/* Focus Peaking Toggle */}
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Eye className="h-3.5 w-3.5 text-cyan-400" />
                                                    <span className="text-[10px] text-gray-400">DOF Zone Overlay</span>
                                                </div>
                                                <button
                                                    onClick={() => setShowFocusPeaking(!showFocusPeaking)}
                                                    className={clsx(
                                                        'rounded px-2 py-0.5 text-[9px] font-medium transition-all',
                                                        showFocusPeaking ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/5 text-gray-500'
                                                    )}
                                                >
                                                    {showFocusPeaking ? 'ON' : 'OFF'}
                                                </button>
                                            </div>

                                            {/* Current Focus Point Display */}
                                            {focusPoint && (
                                                <div className="rounded bg-white/5 p-2">
                                                    <div className="mb-1 text-[9px] text-gray-500">Current Focus Point</div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-mono text-xs text-green-400">
                                                            ({(focusPoint.x * 100).toFixed(0)}%, {(focusPoint.y * 100).toFixed(0)}%)
                                                        </span>
                                                        <span className="font-mono text-xs text-white">
                                                            {dofResult.focusDistanceM.toFixed(1)}m
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Clear Focus Button */}
                                            <button
                                                onClick={() => setFocusPoint(null)}
                                                disabled={!focusPoint}
                                                className={clsx(
                                                    'flex w-full items-center justify-center gap-1.5 rounded border py-1.5 text-[10px] font-medium transition-all',
                                                    focusPoint
                                                        ? 'border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20'
                                                        : 'cursor-not-allowed border-white/5 bg-white/5 text-gray-600'
                                                )}
                                            >
                                                <X className="h-3 w-3" />
                                                Clear Focus Point
                                            </button>

                                            {/* Export Camera Recipe */}
                                            <button
                                                onClick={exportCameraRecipe}
                                                className={clsx(
                                                    'flex w-full items-center justify-center gap-1.5 rounded border py-1.5 text-[10px] font-medium transition-all',
                                                    copied
                                                        ? 'border-green-500/50 bg-green-500/20 text-green-300'
                                                        : 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                                                )}
                                            >
                                                {copied ? <Check className="h-3 w-3" /> : <Share2 className="h-3 w-3" />}
                                                {copied ? 'Copied to Clipboard!' : 'Export Camera Recipe'}
                                            </button>

                                            {/* Recipe Preview */}
                                            <div className="rounded border border-white/10 bg-black/30 p-2">
                                                <div className="mb-1 text-[9px] text-gray-500">Prompt Suffix Preview</div>
                                                <div className="font-mono text-[9px] text-amber-300">
                                                    {generateCameraRecipe().promptSuffix || 'No specific DOF settings'}
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionSection>

                                    {/* Camera Motion - Global Store Remote Control */}
                                    <AccordionSection id="motion" title="Camera Motion" icon={Move} color="cyan" isExpanded={expandedSections.has('motion')} onToggle={toggleSection}>
                                        <div className="space-y-3">
                                            <div className="text-[9px] text-gray-500">
                                                Simulates camera movement with 2D CSS transforms.
                                            </div>
                                            <CameraControlPanel useGlobalStore={true} />
                                        </div>
                                    </AccordionSection>

                                    {/* Lens Selection */}
                                    <AccordionSection id="lens" title="Lens & Sensor" icon={Focus} color="amber" isExpanded={expandedSections.has('lens')} onToggle={toggleSection}>
                                        <div className="space-y-3">
                                            <div className="flex flex-wrap gap-1">
                                                {LENS_PRESETS.map(lens => (
                                                    <button
                                                        key={lens.id}
                                                        onClick={() => setSelectedLens(lens)}
                                                        className={clsx(
                                                            'rounded border px-2 py-1 text-[10px] transition-all',
                                                            selectedLens?.id === lens.id
                                                                ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-300'
                                                                : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                                                        )}
                                                    >
                                                        {lens.focalLength}
                                                    </button>
                                                ))}
                                            </div>
                                            {/* Sensor Size */}
                                            <div className="flex gap-1">
                                                {(['full-frame', 'aps-c', 'micro-four-thirds'] as const).map(size => (
                                                    <button
                                                        key={size}
                                                        onClick={() => setDofSettings(prev => ({ ...prev, sensorSize: size }))}
                                                        className={clsx(
                                                            'flex-1 rounded border px-1.5 py-1 text-[9px] transition-all',
                                                            dofSettings.sensorSize === size
                                                                ? 'border-amber-500/50 bg-amber-500/20 text-amber-300'
                                                                : 'border-white/10 bg-white/5 text-gray-500 hover:border-white/20'
                                                        )}
                                                    >
                                                        {size === 'full-frame' ? 'FF' : size === 'aps-c' ? 'APS-C' : 'M4/3'}
                                                    </button>
                                                ))}
                                            </div>
                                            {/* FOV Info */}
                                            <div className="flex items-center justify-between text-[9px]">
                                                <span className="text-gray-500">FOV: {aovResult.horizontal}° × {aovResult.vertical}°</span>
                                                <span className="text-gray-500">{dofResult.equivalentFocalLength}mm equiv.</span>
                                            </div>
                                        </div>
                                    </AccordionSection>

                                    {/* 3-Layer Scene */}
                                    <AccordionSection id="scene" title="Scene Layers" icon={Layers} color="purple" isExpanded={expandedSections.has('scene')} onToggle={toggleSection}>
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] text-gray-400">3-Layer Mode</span>
                                                <button
                                                    onClick={() => setShowLayeredScene(!showLayeredScene)}
                                                    className={clsx(
                                                        'rounded px-2 py-0.5 text-[9px] font-medium transition-all',
                                                        showLayeredScene ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-gray-500'
                                                    )}
                                                >
                                                    {showLayeredScene ? 'ON' : 'OFF'}
                                                </button>
                                            </div>
                                            {showLayeredScene && (
                                                <>
                                                    <div>
                                                        <div className="mb-1 flex justify-between text-[9px]">
                                                            <span className="text-cyan-400">Foreground</span>
                                                            <span className="text-white">{foregroundDistance.toFixed(1)}m</span>
                                                        </div>
                                                        <input
                                                            type="range"
                                                            min={0.3}
                                                            max={10}
                                                            step={0.1}
                                                            value={foregroundDistance}
                                                            onChange={e => setForegroundDistance(Number(e.target.value))}
                                                            className="w-full accent-cyan-400"
                                                        />
                                                    </div>
                                                    <div>
                                                        <div className="mb-1 flex justify-between text-[9px]">
                                                            <span className="text-purple-400">Background</span>
                                                            <span className="text-white">{backgroundDistance >= 100 ? '∞' : `${backgroundDistance.toFixed(0)}m`}</span>
                                                        </div>
                                                        <input
                                                            type="range"
                                                            min={5}
                                                            max={200}
                                                            step={5}
                                                            value={backgroundDistance}
                                                            onChange={e => setBackgroundDistance(Number(e.target.value))}
                                                            className="w-full accent-purple-400"
                                                        />
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </AccordionSection>

                                    {/* Bokeh Shape */}
                                    <AccordionSection id="bokeh" title="Bokeh Shape" icon={Circle} color="amber" isExpanded={expandedSections.has('bokeh')} onToggle={toggleSection}>
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap gap-1">
                                                {(Object.keys(BOKEH_PRESETS) as Array<keyof typeof BOKEH_PRESETS>).map(preset => (
                                                    <button
                                                        key={preset}
                                                        onClick={() => setBokehPreset(preset)}
                                                        className={clsx(
                                                            'flex items-center gap-1 rounded border px-1.5 py-1 text-[9px] transition-all',
                                                            bokehPreset === preset
                                                                ? 'border-amber-500/50 bg-amber-500/20 text-amber-300'
                                                                : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                                                        )}
                                                    >
                                                        <svg width="10" height="10" viewBox="0 0 24 24">
                                                            <path
                                                                d={generateBokehPath(BOKEH_PRESETS[preset].bladeCount, 24, BOKEH_PRESETS[preset].rotation, BOKEH_PRESETS[preset].curvature)}
                                                                fill="currentColor"
                                                            />
                                                        </svg>
                                                        <span className="capitalize">{preset}</span>
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="text-[8px] text-gray-600">{bokehSettings.bladeCount} blades</div>
                                        </div>
                                    </AccordionSection>

                                    {/* DOF Presets */}
                                    <AccordionSection id="presets" title="Quick Presets" icon={Bookmark} color="green" isExpanded={expandedSections.has('presets')} onToggle={toggleSection}>
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap gap-1">
                                                {BUILT_IN_DOF_PRESETS.map(preset => (
                                                    <Tooltip key={preset.id} content={preset.description || preset.name} side="left">
                                                        <button
                                                            onClick={() => applyPreset(preset)}
                                                            className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[8px] text-gray-400 transition-all hover:border-green-500/30 hover:text-green-300"
                                                        >
                                                            {preset.name.split(' ')[0]}
                                                        </button>
                                                    </Tooltip>
                                                ))}
                                            </div>
                                            {/* Save/Load controls */}
                                            <div className="flex gap-1">
                                                <input
                                                    type="text"
                                                    value={presetName}
                                                    onChange={e => setPresetName(e.target.value)}
                                                    placeholder="Save as..."
                                                    className="min-w-0 flex-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-[9px] text-white placeholder:text-gray-600 focus:border-green-500/50 focus:outline-none"
                                                />
                                                <button
                                                    onClick={saveCurrentAsPreset}
                                                    disabled={!presetName.trim()}
                                                    className={clsx(
                                                        'rounded px-2 py-1 text-[9px] transition-all',
                                                        presetSaved ? 'bg-green-500 text-white' : presetName.trim() ? 'bg-green-500/20 text-green-300' : 'bg-white/5 text-gray-600'
                                                    )}
                                                >
                                                    {presetSaved ? '✓' : 'Save'}
                                                </button>
                                            </div>
                                            {userPresets.length > 0 && (
                                                <div className="max-h-20 space-y-1 overflow-y-auto">
                                                    {userPresets.map(preset => (
                                                        <div key={preset.id} className="flex items-center justify-between rounded bg-white/5 px-2 py-1">
                                                            <button onClick={() => applyPreset(preset)} className="text-[9px] text-white hover:text-green-300">
                                                                {preset.name}
                                                            </button>
                                                            <button onClick={() => deletePreset(preset.id)} className="text-gray-500 hover:text-red-400">
                                                                <Trash2 className="h-2.5 w-2.5" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="flex gap-1">
                                                <button onClick={exportPreset} className="flex-1 rounded border border-white/10 bg-white/5 py-1 text-[8px] text-gray-400 hover:text-cyan-300">
                                                    Export
                                                </button>
                                                <label className="flex flex-1 cursor-pointer items-center justify-center rounded border border-white/10 bg-white/5 py-1 text-[8px] text-gray-400 hover:text-purple-300">
                                                    Import
                                                    <input type="file" accept=".json" onChange={importPreset} className="hidden" />
                                                </label>
                                            </div>
                                        </div>
                                    </AccordionSection>

                                    {/* Framing Presets (Phase 6) */}
                                    <AccordionSection id="framing" title="Framing Presets" icon={User} color="cyan" isExpanded={expandedSections.has('framing')} onToggle={toggleSection}>
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-3 gap-1">
                                                {FRAMING_PRESETS.map(preset => (
                                                    <Tooltip key={preset.id} content={preset.description} side="left">
                                                        <button
                                                            onClick={() => applyFramingPreset(preset)}
                                                            className={clsx(
                                                                'rounded border px-2 py-1.5 text-[9px] font-medium transition-all',
                                                                selectedFraming?.id === preset.id
                                                                    ? 'border-cyan-500/50 bg-cyan-500/20 text-cyan-300'
                                                                    : 'border-white/10 bg-white/5 text-gray-400 hover:border-cyan-500/30 hover:text-cyan-300'
                                                            )}
                                                        >
                                                            {preset.name}
                                                        </button>
                                                    </Tooltip>
                                                ))}
                                            </div>
                                            {selectedFraming && (
                                                <div className="rounded bg-cyan-500/10 px-2 py-1.5 text-[9px] text-cyan-300">
                                                    <div className="font-medium">{selectedFraming.name}</div>
                                                    <div className="text-cyan-400/70">{selectedFraming.description}</div>
                                                    <div className="mt-1 text-[8px] text-gray-500">
                                                        Subject @ {selectedFraming.modelDistance}m • Scale: {selectedFraming.modelScale}×
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </AccordionSection>

                                    {/* Camera Selection (Phase 6) */}
                                    <AccordionSection id="camera" title="Camera Model" icon={Camera} color="amber" isExpanded={expandedSections.has('camera')} onToggle={toggleSection}>
                                        <div className="space-y-2">
                                            <select
                                                value={selectedCamera?.id || ''}
                                                onChange={e => {
                                                    const cam = CAMERA_DATABASE.find(c => c.id === e.target.value);
                                                    if (cam) applyCameraPreset(cam);
                                                }}
                                                className="w-full rounded border border-white/10 bg-white/5 px-2 py-1.5 text-[10px] text-white focus:border-amber-500/50 focus:outline-none"
                                            >
                                                <option value="">-- Select Camera --</option>
                                                <optgroup label="Full Frame">
                                                    {CAMERA_DATABASE.filter(c => c.sensorSize === 'full-frame').map(cam => (
                                                        <option key={cam.id} value={cam.id}>
                                                            {cam.brand} {cam.model}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                                <optgroup label="APS-C / Super 35">
                                                    {CAMERA_DATABASE.filter(c => c.sensorSize === 'aps-c').map(cam => (
                                                        <option key={cam.id} value={cam.id}>
                                                            {cam.brand} {cam.model}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                                <optgroup label="Micro Four Thirds">
                                                    {CAMERA_DATABASE.filter(c => c.sensorSize === 'micro-four-thirds').map(cam => (
                                                        <option key={cam.id} value={cam.id}>
                                                            {cam.brand} {cam.model}
                                                        </option>
                                                    ))}
                                                </optgroup>
                                            </select>
                                            {selectedCamera && (
                                                <div className="rounded bg-amber-500/10 px-2 py-1.5 text-[9px]">
                                                    <div className="font-medium text-amber-300">{selectedCamera.brand} {selectedCamera.model}</div>
                                                    <div className="mt-1 grid grid-cols-2 gap-x-4 text-[8px] text-gray-400">
                                                        <div>Sensor: {selectedCamera.sensorWidth}×{selectedCamera.sensorHeight}mm</div>
                                                        <div>Crop: {selectedCamera.cropFactor}×</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </AccordionSection>

                                    {/* Layer Separation (AI or Manual) */}
                                    <AccordionSection id="layers-ai" title="Layer Separation" icon={Scissors} color="purple" isExpanded={expandedSections.has('layers-ai')} onToggle={toggleSection}>
                                        <div className="space-y-3">
                                            {/* Hidden file inputs for manual upload */}
                                            <input
                                                ref={subjectInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleManualLayerUpload('subject', file);
                                                    e.target.value = '';
                                                }}
                                            />
                                            <input
                                                ref={backgroundInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleManualLayerUpload('background', file);
                                                    e.target.value = '';
                                                }}
                                            />
                                            <input
                                                ref={foregroundInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleManualLayerUpload('foreground', file);
                                                    e.target.value = '';
                                                }}
                                            />

                                            {/* Manual Upload Section */}
                                            <div className="rounded border border-white/10 bg-white/5 p-2">
                                                <p className="mb-2 text-[9px] font-medium text-white">Manual Upload</p>
                                                <p className="mb-2 text-[8px] text-gray-500">
                                                    Upload pre-separated layers (PNG with transparency recommended)
                                                </p>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {/* Subject Layer */}
                                                    <button
                                                        onClick={() => subjectInputRef.current?.click()}
                                                        className={clsx(
                                                            'group relative overflow-hidden rounded border-2 border-dashed p-2 text-center transition-all',
                                                            extractedLayers?.subject
                                                                ? 'border-green-500/50 bg-green-500/10'
                                                                : 'border-white/20 hover:border-green-500/50 hover:bg-green-500/10'
                                                        )}
                                                    >
                                                        {extractedLayers?.subject ? (
                                                            <img src={extractedLayers.subject} alt="Subject" className="mx-auto h-12 w-full rounded object-cover" />
                                                        ) : (
                                                            <Upload className="mx-auto h-4 w-4 text-gray-500 group-hover:text-green-400" />
                                                        )}
                                                        <div className="mt-1 text-[8px] text-green-400">Subject</div>
                                                    </button>

                                                    {/* Background Layer */}
                                                    <button
                                                        onClick={() => backgroundInputRef.current?.click()}
                                                        className={clsx(
                                                            'group relative overflow-hidden rounded border-2 border-dashed p-2 text-center transition-all',
                                                            extractedLayers?.background
                                                                ? 'border-purple-500/50 bg-purple-500/10'
                                                                : 'border-white/20 hover:border-purple-500/50 hover:bg-purple-500/10'
                                                        )}
                                                    >
                                                        {extractedLayers?.background ? (
                                                            <img src={extractedLayers.background} alt="Background" className="mx-auto h-12 w-full rounded object-cover" />
                                                        ) : (
                                                            <Upload className="mx-auto h-4 w-4 text-gray-500 group-hover:text-purple-400" />
                                                        )}
                                                        <div className="mt-1 text-[8px] text-purple-400">Background</div>
                                                    </button>
                                                </div>

                                                {/* Optional Foreground Layer */}
                                                <button
                                                    onClick={() => foregroundInputRef.current?.click()}
                                                    className={clsx(
                                                        'group mt-2 w-full overflow-hidden rounded border-2 border-dashed p-2 text-center transition-all',
                                                        extractedLayers?.foreground
                                                            ? 'border-amber-500/50 bg-amber-500/10'
                                                            : 'border-white/20 hover:border-amber-500/50 hover:bg-amber-500/10'
                                                    )}
                                                >
                                                    {extractedLayers?.foreground ? (
                                                        <img src={extractedLayers.foreground} alt="Foreground" className="mx-auto h-10 w-full rounded object-cover" />
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-1">
                                                            <Upload className="h-3 w-3 text-gray-500 group-hover:text-amber-400" />
                                                            <span className="text-[8px] text-gray-500 group-hover:text-amber-400">+ Foreground (optional)</span>
                                                        </div>
                                                    )}
                                                </button>
                                            </div>

                                            {/* Divider */}
                                            <div className="flex items-center gap-2">
                                                <div className="h-px flex-1 bg-white/10" />
                                                <span className="text-[8px] text-gray-600">OR</span>
                                                <div className="h-px flex-1 bg-white/10" />
                                            </div>

                                            {/* AI Extraction */}
                                            <div className="rounded border border-white/10 bg-white/5 p-2">
                                                <p className="mb-2 text-[9px] font-medium text-white">AI Extraction</p>
                                                <p className="mb-2 text-[8px] text-gray-500">
                                                    Automatically separate subject from background using AI ($0.06)
                                                </p>
                                                <button
                                                    onClick={extractLayersFromImage}
                                                    disabled={!referenceImageUrl || isExtractingLayers}
                                                    className={clsx(
                                                        'flex w-full items-center justify-center gap-2 rounded py-2 text-[10px] font-medium transition-all',
                                                        referenceImageUrl && !isExtractingLayers
                                                            ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                                                            : 'cursor-not-allowed bg-white/5 text-gray-600'
                                                    )}
                                                >
                                                    {isExtractingLayers ? (
                                                        <>
                                                            <Loader2 className="h-3 w-3 animate-spin" />
                                                            Extracting...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Scissors className="h-3 w-3" />
                                                            Auto-Extract from Reference
                                                        </>
                                                    )}
                                                </button>
                                                {!referenceImageUrl && (
                                                    <p className="mt-1 text-center text-[8px] text-gray-600">
                                                        Load a reference image first
                                                    </p>
                                                )}
                                            </div>

                                            {/* Layer Status & Scene Depth Button */}
                                            {(extractedLayers?.subject || extractedLayers?.background) && (
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-1 text-[9px] text-green-400">
                                                        <Check className="h-3 w-3" />
                                                        {extractedLayers.subject && extractedLayers.background
                                                            ? 'Both layers ready'
                                                            : extractedLayers.subject
                                                                ? 'Subject layer loaded'
                                                                : 'Background layer loaded'}
                                                    </div>
                                                    <button
                                                        onClick={initializeCompositorLayers}
                                                        className="flex w-full items-center justify-center gap-2 rounded bg-cyan-500/20 py-1.5 text-[9px] font-medium text-cyan-300 transition-all hover:bg-cyan-500/30"
                                                    >
                                                        <Layers className="h-3 w-3" />
                                                        Open in Scene Depth Editor
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </AccordionSection>

                                    {/* Phase 7: Scene Depth Controls */}
                                    {compositorLayers.length > 0 && (
                                        <AccordionSection id="scene-depth" title="Scene Depth" icon={Layers} color="cyan" isExpanded={expandedSections.has('scene-depth')} onToggle={toggleSection}>
                                            <SceneDepthControls
                                                layers={compositorLayers}
                                                cameraSettings={cameraSettingsForPhysics}
                                                canvasWidth={canvasWidth}
                                                onLayerUpdate={handleLayerUpdate}
                                                onLayerDelete={handleLayerDelete}
                                                onLayerReorder={handleLayerReorder}
                                                onFocusDistanceChange={(distM) => {
                                                    // Convert meters back to 0-1 normalized
                                                    const normalized = (distM - 0.5) / 99.5;
                                                    setDofSettings(prev => ({ ...prev, focusDistance: Math.max(0, Math.min(1, normalized)) }));
                                                }}
                                                isExpanded={expandedSections.has('scene-depth')}
                                            />
                                        </AccordionSection>
                                    )}

                                    {/* Phase 7: Dolly Zoom Simulator */}
                                    <AccordionSection id="dolly-zoom" title="Dolly Zoom" icon={Move} color="amber" isExpanded={expandedSections.has('dolly-zoom')} onToggle={toggleSection}>
                                        <DollyZoomSimulator
                                            focalLengthMm={dofSettings.focalLength}
                                            distanceM={selectedFraming?.modelDistance || 2.0}
                                            subjectHeightM={1.7}
                                            sensorType={dofSettings.sensorSize}
                                            onFocalLengthChange={(focalMm) => {
                                                setDofSettings(prev => ({ ...prev, focalLength: focalMm }));
                                                // Update lens preset if one matches
                                                const matchingLens = LENS_PRESETS.find(l => l.focalMm === focalMm);
                                                if (matchingLens) setSelectedLens(matchingLens);
                                            }}
                                            onDistanceChange={(distM) => {
                                                // Find matching framing preset or create custom
                                                const matching = FRAMING_PRESETS.find(f => Math.abs(f.modelDistance - distM) < 0.5);
                                                if (matching) {
                                                    setSelectedFraming(matching);
                                                }
                                                // Update Focus Distance to track subject (Fix for "Broken Remote")
                                                const normalized = Math.max(0, Math.min(1, (distM - 0.5) / 99.5));
                                                setDofSettings(prev => ({ ...prev, focusDistance: normalized }));
                                            }}
                                            referenceImageUrl={referenceImageUrl}
                                            isExpanded={expandedSections.has('dolly-zoom')}
                                        />
                                    </AccordionSection>
                                </>
                            )}

                            {/* Composite Tab Controls */}
                            {activeTab === 'composite' && (
                                <div className="p-3">
                                    {selectedElementId && localElements.find(el => el.id === selectedElementId) && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-medium text-white">
                                                    {localElements.find(el => el.id === selectedElementId)?.name}
                                                </span>
                                                <button
                                                    onClick={() => setSelectedElementId(null)}
                                                    className="text-[10px] text-gray-500 hover:text-white"
                                                >
                                                    Deselect
                                                </button>
                                            </div>

                                            {/* Scale */}
                                            <div>
                                                <div className="mb-1 flex items-center justify-between">
                                                    <span className="text-[10px] text-gray-500">Scale</span>
                                                    <span className="font-mono text-xs text-cyan-400">
                                                        {Math.round((localElements.find(el => el.id === selectedElementId)?.scale || 1) * 100)}%
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={10}
                                                    max={300}
                                                    value={(localElements.find(el => el.id === selectedElementId)?.scale || 1) * 100}
                                                    onChange={e =>
                                                        handleElementUpdate(selectedElementId, { scale: Number(e.target.value) / 100 })
                                                    }
                                                    className="w-full accent-cyan-400"
                                                />
                                            </div>

                                            {/* Rotation */}
                                            <div>
                                                <div className="mb-1 flex items-center justify-between">
                                                    <span className="text-[10px] text-gray-500">Rotation</span>
                                                    <span className="font-mono text-xs text-purple-400">
                                                        {localElements.find(el => el.id === selectedElementId)?.rotation || 0}°
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={-180}
                                                    max={180}
                                                    value={localElements.find(el => el.id === selectedElementId)?.rotation || 0}
                                                    onChange={e =>
                                                        handleElementUpdate(selectedElementId, { rotation: Number(e.target.value) })
                                                    }
                                                    className="w-full accent-purple-400"
                                                />
                                            </div>

                                            {/* Opacity */}
                                            <div>
                                                <div className="mb-1 flex items-center justify-between">
                                                    <span className="text-[10px] text-gray-500">Opacity</span>
                                                    <span className="font-mono text-xs text-amber-400">
                                                        {Math.round((localElements.find(el => el.id === selectedElementId)?.opacity || 1) * 100)}%
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min={10}
                                                    max={100}
                                                    value={(localElements.find(el => el.id === selectedElementId)?.opacity || 1) * 100}
                                                    onChange={e =>
                                                        handleElementUpdate(selectedElementId, { opacity: Number(e.target.value) / 100 })
                                                    }
                                                    className="w-full accent-amber-400"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {!selectedElementId && localElements.length > 0 && (
                                        <div className="text-center text-[10px] text-gray-500">
                                            Select an element to edit
                                        </div>
                                    )}

                                    {localElements.length === 0 && (
                                        <div className="rounded-lg border border-dashed border-white/20 p-4 text-center">
                                            <Layers className="mx-auto h-6 w-6 text-gray-600" />
                                            <p className="mt-2 text-[10px] text-gray-500">No elements added</p>
                                            <p className="text-[9px] text-gray-600">Drag from Element library</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* AR Tab Controls */}
                            {activeTab === 'ar' && (
                                <div className="p-3">
                                    <div className="flex flex-col items-center gap-3">
                                        {!arActive ? (
                                            <button
                                                onClick={startCamera}
                                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-cyan-400"
                                            >
                                                <Video className="h-4 w-4" />
                                                Start Camera
                                            </button>
                                        ) : (
                                            <button
                                                onClick={stopCamera}
                                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-red-400"
                                            >
                                                <X className="h-4 w-4" />
                                                Stop Camera
                                            </button>
                                        )}

                                        {arActive && (
                                            <div className="text-center text-[10px] text-gray-500">
                                                Point camera at your set to preview framing
                                            </div>
                                        )}

                                        {!arActive && (
                                            <div className="text-center text-[10px] text-gray-500">
                                                Use AR mode to preview framing on your physical set
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    // Render based on mode
    if (embedded) {
        // Fullscreen mode: fill entire container with no rounded corners
        if (fullscreen) {
            return (
                <div className="h-full w-full bg-[#0a0a0a]">
                    {panelContent}
                </div>
            );
        }
        // Normal embedded mode
        return (
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={clsx(
                    'overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl',
                    isFullscreen ? 'fixed inset-4 z-50' : 'h-[95vh] w-[85vw] max-w-[1400px]'
                )}
            >
                {panelContent}
            </motion.div>
        );
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={clsx(
                            'overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl',
                            isFullscreen ? 'h-[95vh] w-[95vw]' : 'h-[90vh] w-[90vw] max-w-[1600px]'
                        )}
                    >
                        {panelContent}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

export default DirectorViewfinder;
