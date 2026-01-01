/**
 * Viewfinder Store - Global State for Optics Engine
 *
 * This store enables the "Remote Control" pattern where:
 * - Control Panel (CameraControlPanel) WRITES to this store
 * - Viewer (DirectorViewfinder) SUBSCRIBES to this store and applies CSS transforms
 *
 * This solves the "Broken Remote" problem where controls and viewer were not connected.
 *
 * NOTE: This is a 2D FLAT COMPOSITE simulation. Real 3D perspective transforms
 * would require WebGL or Three.js. The current implementation uses CSS blur/scale
 * to approximate optical effects.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================================
// TYPES
// ============================================================================

export type CameraMovementType = 'pan' | 'tilt' | 'zoom' | 'roll' | 'static';
export type CameraDirection = 'left' | 'right' | 'up' | 'down' | 'in' | 'out' | 'cw' | 'ccw';

export interface CameraMovement {
    type: CameraMovementType;
    direction?: CameraDirection;
    intensity?: number; // 1-10
}

export interface DOFSettings {
    aperture: number; // f-stop: 1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22
    focusDistance: number; // 0-1 normalized (near to far)
    focalLength: number; // mm
    sensorSize: 'full-frame' | 'aps-c' | 'micro-four-thirds';
}

export interface FocusPoint {
    x: number; // 0-1 normalized
    y: number; // 0-1 normalized
}

export interface ViewfinderState {
    // Camera movement state (from CameraControlPanel)
    cameraMovement: CameraMovement;

    // DOF settings (from DirectorViewfinder controls)
    dofSettings: DOFSettings;

    // Focus point (click-to-focus position)
    focusPoint: FocusPoint;

    // Layer distances (for 3-layer DOF simulation)
    foregroundDistance: number; // meters
    backgroundDistance: number; // meters

    // Calculated CSS transform values (derived from state)
    // These are what the Viewer reads to apply visual effects
    viewerTransform: {
        blur: number; // CSS blur filter value in pixels
        scale: number; // CSS scale transform value
        translateX: number; // CSS translateX in percentage
        translateY: number; // CSS translateY in percentage
        rotate: number; // CSS rotate in degrees
    };

    // Is the viewfinder enabled/visible
    isEnabled: boolean;

    // Actions
    setCameraMovement: (movement: CameraMovement) => void;
    setDOFSettings: (settings: Partial<DOFSettings>) => void;
    setFocusPoint: (point: FocusPoint) => void;
    setForegroundDistance: (distance: number) => void;
    setBackgroundDistance: (distance: number) => void;
    setEnabled: (enabled: boolean) => void;
    resetCameraMovement: () => void;
    resetAll: () => void;

    // Compute viewer transform from current state
    updateViewerTransform: () => void;
}

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_DOF_SETTINGS: DOFSettings = {
    aperture: 2.8,
    focusDistance: 0.5,
    focalLength: 50,
    sensorSize: 'full-frame',
};

const DEFAULT_FOCUS_POINT: FocusPoint = {
    x: 0.5,
    y: 0.5,
};

const DEFAULT_CAMERA_MOVEMENT: CameraMovement = {
    type: 'static',
};

const DEFAULT_VIEWER_TRANSFORM = {
    blur: 0,
    scale: 1,
    translateX: 0,
    translateY: 0,
    rotate: 0,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate blur amount based on aperture
 * Lower f-stop = more blur (shallower DOF)
 * Higher f-stop = less blur (deeper DOF)
 */
function calculateBlurFromAperture(aperture: number): number {
    // f/1.4 = max blur (10px), f/22 = no blur (0px)
    // Using inverse relationship: blur = maxBlur / (aperture / 1.4)
    const maxBlur = 10;
    const normalizedAperture = aperture / 1.4; // 1.0 to ~15.7
    return Math.max(0, maxBlur / normalizedAperture);
}

/**
 * Calculate scale based on zoom movement
 */
function calculateScaleFromZoom(movement: CameraMovement): number {
    if (movement.type !== 'zoom') return 1;

    const intensity = movement.intensity || 5;
    const scaleFactor = 0.02 * intensity; // 2% per intensity level

    if (movement.direction === 'in') {
        return 1 + scaleFactor;
    } else if (movement.direction === 'out') {
        return 1 - scaleFactor;
    }
    return 1;
}

/**
 * Calculate translation based on pan/tilt movement
 */
function calculateTranslationFromMovement(movement: CameraMovement): { x: number; y: number } {
    const intensity = movement.intensity || 5;
    const translatePercent = 2 * intensity; // 2% per intensity level

    let x = 0;
    let y = 0;

    if (movement.type === 'pan') {
        if (movement.direction === 'left') x = translatePercent;
        else if (movement.direction === 'right') x = -translatePercent;
    } else if (movement.type === 'tilt') {
        if (movement.direction === 'up') y = translatePercent;
        else if (movement.direction === 'down') y = -translatePercent;
    }

    return { x, y };
}

/**
 * Calculate rotation based on roll movement
 */
function calculateRotationFromRoll(movement: CameraMovement): number {
    if (movement.type !== 'roll') return 0;

    const intensity = movement.intensity || 5;
    const rotateDegrees = 2 * intensity; // 2 degrees per intensity level

    if (movement.direction === 'cw') {
        return rotateDegrees;
    } else if (movement.direction === 'ccw') {
        return -rotateDegrees;
    }
    return 0;
}

// ============================================================================
// STORE
// ============================================================================

export const useViewfinderStore = create<ViewfinderState>()(
    persist(
        (set, get) => ({
            cameraMovement: DEFAULT_CAMERA_MOVEMENT,
            dofSettings: DEFAULT_DOF_SETTINGS,
            focusPoint: DEFAULT_FOCUS_POINT,
            foregroundDistance: 1.0,
            backgroundDistance: 50.0,
            viewerTransform: DEFAULT_VIEWER_TRANSFORM,
            isEnabled: true,

            setCameraMovement: (movement) => {
                set({ cameraMovement: movement });
                get().updateViewerTransform();
            },

            setDOFSettings: (settings) => {
                set((state) => ({
                    dofSettings: { ...state.dofSettings, ...settings },
                }));
                get().updateViewerTransform();
            },

            setFocusPoint: (point) => {
                set({ focusPoint: point });
            },

            setForegroundDistance: (distance) => {
                set({ foregroundDistance: distance });
            },

            setBackgroundDistance: (distance) => {
                set({ backgroundDistance: distance });
            },

            setEnabled: (enabled) => {
                set({ isEnabled: enabled });
            },

            resetCameraMovement: () => {
                set({ cameraMovement: DEFAULT_CAMERA_MOVEMENT });
                get().updateViewerTransform();
            },

            resetAll: () => {
                set({
                    cameraMovement: DEFAULT_CAMERA_MOVEMENT,
                    dofSettings: DEFAULT_DOF_SETTINGS,
                    focusPoint: DEFAULT_FOCUS_POINT,
                    foregroundDistance: 1.0,
                    backgroundDistance: 50.0,
                    viewerTransform: DEFAULT_VIEWER_TRANSFORM,
                });
            },

            updateViewerTransform: () => {
                const { cameraMovement, dofSettings } = get();

                // Calculate each transform component
                const blur = calculateBlurFromAperture(dofSettings.aperture);
                const scale = calculateScaleFromZoom(cameraMovement);
                const translation = calculateTranslationFromMovement(cameraMovement);
                const rotate = calculateRotationFromRoll(cameraMovement);

                set({
                    viewerTransform: {
                        blur,
                        scale,
                        translateX: translation.x,
                        translateY: translation.y,
                        rotate,
                    },
                });
            },
        }),
        {
            name: 'vibeboard-viewfinder',
            // Only persist certain fields, not the computed viewerTransform
            partialize: (state) => ({
                dofSettings: state.dofSettings,
                focusPoint: state.focusPoint,
                foregroundDistance: state.foregroundDistance,
                backgroundDistance: state.backgroundDistance,
                isEnabled: state.isEnabled,
            }),
        }
    )
);

// ============================================================================
// SELECTOR HOOKS
// ============================================================================

/**
 * Get CSS style object for applying transforms to the viewer
 * Usage in DirectorViewfinder:
 *   const viewerStyle = useViewerTransformStyle();
 *   <div style={viewerStyle}>...</div>
 */
export function useViewerTransformStyle(): React.CSSProperties {
    const { viewerTransform, isEnabled } = useViewfinderStore();

    if (!isEnabled) {
        return {};
    }

    return {
        filter: viewerTransform.blur > 0 ? `blur(${viewerTransform.blur}px)` : undefined,
        transform: `scale(${viewerTransform.scale}) translateX(${viewerTransform.translateX}%) translateY(${viewerTransform.translateY}%) rotate(${viewerTransform.rotate}deg)`,
        transformOrigin: 'center center',
        transition: 'all 0.3s ease-out',
    };
}

/**
 * Get movement type description for display
 */
export function getMovementDescription(movement: CameraMovement): string {
    if (movement.type === 'static') return 'Static';

    const typeLabels: Record<CameraMovementType, string> = {
        pan: 'Pan',
        tilt: 'Tilt',
        zoom: 'Zoom',
        roll: 'Roll',
        static: 'Static',
    };

    const directionLabels: Record<CameraDirection, string> = {
        left: 'Left',
        right: 'Right',
        up: 'Up',
        down: 'Down',
        in: 'In',
        out: 'Out',
        cw: 'CW',
        ccw: 'CCW',
    };

    const typeLabel = typeLabels[movement.type];
    const dirLabel = movement.direction ? directionLabels[movement.direction] : '';
    const intensity = movement.intensity || 5;

    return `${typeLabel} ${dirLabel} (${intensity})`;
}
