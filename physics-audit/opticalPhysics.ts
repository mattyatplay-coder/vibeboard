/**
 * Optical Physics Engine for DOF Simulator
 *
 * Real blur calculations based on Circle of Confusion formula
 * Used for accurate depth-of-field simulation across sensor sizes
 */

// ============================================================================
// SENSOR SPECIFICATIONS
// ============================================================================

/**
 * Sensor diagonal measurements in millimeters
 * Used for FOV and CoC calculations
 */
export const SENSOR_DIAGONALS: Record<string, number> = {
    'full-frame': 43.27,      // 36mm × 24mm sensor
    'aps-c': 28.3,            // ~23.6mm × 15.6mm (Canon ~22.3mm × 14.9mm)
    'aps-c-canon': 27.04,     // Canon APS-C: 22.3mm × 14.9mm
    'super35': 28.0,          // Cinema standard
    'micro-four-thirds': 21.6, // 17.3mm × 13mm
    'one-inch': 15.86,        // 13.2mm × 8.8mm (Sony RX100, etc.)
    'iphone': 7.6,            // ~6.17mm × 4.55mm (iPhone main sensor)
    'medium-format': 67.0,    // ~53.4mm × 40mm (Hasselblad, Fuji GFX)
    'large-format-4x5': 150.0, // 4×5 inch sheet film
    'imax': 87.91,            // 70mm × 48.5mm IMAX 15/70
    'alexa-lf': 44.71,        // ARRI Alexa LF (36.70mm × 25.54mm)
    'red-monstro': 46.31,     // RED Monstro 8K VV (40.96mm × 21.60mm)
};

/**
 * Circle of Confusion limits in millimeters
 * The maximum blur spot size still perceived as "sharp"
 * Based on viewing distance and print size standards
 */
export const COC_LIMITS: Record<string, number> = {
    'full-frame': 0.030,      // Traditional 35mm standard
    'aps-c': 0.020,           // Proportional to sensor size
    'aps-c-canon': 0.019,
    'super35': 0.020,
    'micro-four-thirds': 0.015,
    'one-inch': 0.011,
    'iphone': 0.005,          // Very small sensor = tiny CoC
    'medium-format': 0.045,   // Larger sensor = larger acceptable CoC
    'large-format-4x5': 0.100,
    'imax': 0.060,
    'alexa-lf': 0.032,
    'red-monstro': 0.033,
};

/**
 * Sensor dimensions in millimeters [width, height]
 */
export const SENSOR_DIMENSIONS: Record<string, [number, number]> = {
    'full-frame': [36, 24],
    'aps-c': [23.6, 15.6],
    'aps-c-canon': [22.3, 14.9],
    'super35': [24.89, 14.0],
    'micro-four-thirds': [17.3, 13.0],
    'one-inch': [13.2, 8.8],
    'iphone': [6.17, 4.55],
    'medium-format': [53.4, 40.0],
    'large-format-4x5': [127, 102],
    'imax': [70, 48.5],
    'alexa-lf': [36.70, 25.54],
    'red-monstro': [40.96, 21.60],
};

// ============================================================================
// BLUR CALCULATIONS
// ============================================================================

export interface BlurCalculationParams {
    /** Focal length in millimeters */
    focalLengthMm: number;
    /** Aperture f-number (e.g., 1.4, 2.8, 5.6) */
    aperture: number;
    /** Distance to focused subject in meters */
    focusDistanceM: number;
    /** Distance to background/foreground element in meters */
    elementDistanceM: number;
    /** Sensor type key from SENSOR_DIAGONALS */
    sensorType: string;
    /** Optional: output image width in pixels for blur radius calculation */
    imageWidthPx?: number;
}

/**
 * Calculate the blur radius for an out-of-focus element
 *
 * Formula: Blur(mm) = C × |Sfocus - Sbg| / Sbg × f² / (N × (Sfocus - f))
 *
 * Where:
 * - C = Circle of Confusion (sensor-specific)
 * - Sfocus = focus distance in mm
 * - Sbg = background/element distance in mm
 * - f = focal length in mm
 * - N = f-number (aperture)
 *
 * @returns Blur radius in millimeters on the sensor, or pixels if imageWidthPx provided
 */
export function calculateBlurRadius(params: BlurCalculationParams): number {
    const {
        focalLengthMm,
        aperture,
        focusDistanceM,
        elementDistanceM,
        sensorType,
        imageWidthPx,
    } = params;

    // Convert distances to millimeters
    const Sfocus = focusDistanceM * 1000;
    const Selement = elementDistanceM * 1000;
    const f = focalLengthMm;
    const N = aperture;

    // Get Circle of Confusion for sensor type
    const C = COC_LIMITS[sensorType] || COC_LIMITS['full-frame'];

    // Avoid division by zero
    if (Selement <= 0 || Sfocus <= f || Selement === Sfocus) {
        return 0;
    }

    // Calculate blur on sensor (mm)
    const blurMm = C * Math.abs(Sfocus - Selement) / Selement * (f * f) / (N * (Sfocus - f));

    // If image width provided, convert to pixels
    if (imageWidthPx) {
        const [sensorWidth] = SENSOR_DIMENSIONS[sensorType] || SENSOR_DIMENSIONS['full-frame'];
        const blurPx = (blurMm / sensorWidth) * imageWidthPx;
        return Math.max(0, blurPx);
    }

    return Math.max(0, blurMm);
}

/**
 * Calculate blur radius as a percentage of frame width
 * Useful for responsive UI rendering
 */
export function calculateBlurPercent(params: BlurCalculationParams): number {
    const blurMm = calculateBlurRadius({ ...params, imageWidthPx: undefined });
    const [sensorWidth] = SENSOR_DIMENSIONS[params.sensorType] || SENSOR_DIMENSIONS['full-frame'];
    return (blurMm / sensorWidth) * 100;
}

// ============================================================================
// DEPTH OF FIELD CALCULATIONS
// ============================================================================

export interface DOFCalculationParams {
    /** Focal length in millimeters */
    focalLengthMm: number;
    /** Aperture f-number */
    aperture: number;
    /** Distance to focused subject in meters */
    focusDistanceM: number;
    /** Sensor type key */
    sensorType: string;
}

export interface DOFResult {
    /** Near limit of acceptable sharpness in meters */
    nearLimitM: number;
    /** Far limit of acceptable sharpness in meters (Infinity if hyperfocal) */
    farLimitM: number;
    /** Total depth of field in meters */
    totalDOF: number;
    /** Hyperfocal distance in meters */
    hyperfocalM: number;
    /** Whether far limit extends to infinity */
    isHyperfocal: boolean;
}

/**
 * Calculate depth of field limits
 *
 * Hyperfocal distance: H = f² / (N × c) + f
 * Near limit: Dn = H × s / (H + (s - f))
 * Far limit: Df = H × s / (H - (s - f))
 */
export function calculateDOF(params: DOFCalculationParams): DOFResult {
    const { focalLengthMm, aperture, focusDistanceM, sensorType } = params;

    const f = focalLengthMm;
    const N = aperture;
    const s = focusDistanceM * 1000; // Convert to mm
    const c = COC_LIMITS[sensorType] || COC_LIMITS['full-frame'];

    // Hyperfocal distance in mm
    const H = (f * f) / (N * c) + f;
    const hyperfocalM = H / 1000;

    // Near limit
    const Dn = (H * s) / (H + (s - f));
    const nearLimitM = Dn / 1000;

    // Far limit
    const denominator = H - (s - f);
    let farLimitM: number;
    let isHyperfocal = false;

    if (denominator <= 0) {
        // Focus distance >= hyperfocal distance, far limit is infinity
        farLimitM = Infinity;
        isHyperfocal = true;
    } else {
        const Df = (H * s) / denominator;
        farLimitM = Df / 1000;
    }

    const totalDOF = isHyperfocal ? Infinity : farLimitM - nearLimitM;

    return {
        nearLimitM: Math.max(0, nearLimitM),
        farLimitM,
        totalDOF,
        hyperfocalM,
        isHyperfocal,
    };
}

// ============================================================================
// FIELD OF VIEW CALCULATIONS
// ============================================================================

export interface FOVCalculationParams {
    /** Focal length in millimeters */
    focalLengthMm: number;
    /** Sensor type key */
    sensorType: string;
}

export interface FOVResult {
    /** Diagonal field of view in degrees */
    diagonalDeg: number;
    /** Horizontal field of view in degrees */
    horizontalDeg: number;
    /** Vertical field of view in degrees */
    verticalDeg: number;
}

/**
 * Calculate field of view angles
 *
 * FOV = 2 × arctan(dimension / (2 × focalLength))
 */
export function calculateFOV(params: FOVCalculationParams): FOVResult {
    const { focalLengthMm, sensorType } = params;

    const diagonal = SENSOR_DIAGONALS[sensorType] || SENSOR_DIAGONALS['full-frame'];
    const [width, height] = SENSOR_DIMENSIONS[sensorType] || SENSOR_DIMENSIONS['full-frame'];

    const diagonalDeg = 2 * Math.atan(diagonal / (2 * focalLengthMm)) * (180 / Math.PI);
    const horizontalDeg = 2 * Math.atan(width / (2 * focalLengthMm)) * (180 / Math.PI);
    const verticalDeg = 2 * Math.atan(height / (2 * focalLengthMm)) * (180 / Math.PI);

    return {
        diagonalDeg,
        horizontalDeg,
        verticalDeg,
    };
}

/**
 * Calculate 35mm equivalent focal length for a given sensor
 * Useful for comparing lens behavior across different cameras
 */
export function calculate35mmEquivalent(focalLengthMm: number, sensorType: string): number {
    const diagonal = SENSOR_DIAGONALS[sensorType] || SENSOR_DIAGONALS['full-frame'];
    const fullFrameDiagonal = SENSOR_DIAGONALS['full-frame'];
    const cropFactor = fullFrameDiagonal / diagonal;
    return focalLengthMm * cropFactor;
}

/**
 * Calculate crop factor for a sensor type
 */
export function getCropFactor(sensorType: string): number {
    const diagonal = SENSOR_DIAGONALS[sensorType] || SENSOR_DIAGONALS['full-frame'];
    return SENSOR_DIAGONALS['full-frame'] / diagonal;
}

// ============================================================================
// DOLLY ZOOM CALCULATIONS
// ============================================================================

export interface DollyZoomParams {
    /** Initial focal length in mm */
    initialFocalMm: number;
    /** Final focal length in mm */
    finalFocalMm: number;
    /** Initial camera-to-subject distance in meters */
    initialDistanceM: number;
    /** Subject height in meters (for framing reference) */
    subjectHeightM: number;
    /** Sensor type key */
    sensorType: string;
}

export interface DollyZoomResult {
    /** Required camera distance at final focal length to maintain framing */
    finalDistanceM: number;
    /** Change in distance (positive = move away) */
    distanceChangeM: number;
    /** Background scale factor (>1 = larger, <1 = smaller) */
    backgroundScale: number;
    /** Perspective compression description */
    compressionDescription: string;
}

/**
 * Calculate dolly zoom parameters to maintain subject framing
 *
 * The "Hitchcock effect" - dolly + zoom to change perspective while
 * keeping subject the same size in frame.
 *
 * Formula: d2 = d1 × (f2 / f1)
 * Background scale: scale = f2 / f1
 */
export function calculateDollyZoom(params: DollyZoomParams): DollyZoomResult {
    const { initialFocalMm, finalFocalMm, initialDistanceM } = params;

    // Calculate new distance to maintain subject size
    const focalRatio = finalFocalMm / initialFocalMm;
    const finalDistanceM = initialDistanceM * focalRatio;
    const distanceChangeM = finalDistanceM - initialDistanceM;

    // Background appears to scale by focal ratio
    const backgroundScale = focalRatio;

    // Describe the compression effect
    let compressionDescription: string;
    if (focalRatio > 1.2) {
        compressionDescription = 'Strong compression - background appears closer and larger';
    } else if (focalRatio > 1) {
        compressionDescription = 'Mild compression - subtle background enlargement';
    } else if (focalRatio > 0.8) {
        compressionDescription = 'Mild expansion - subtle background reduction';
    } else {
        compressionDescription = 'Strong expansion - background appears smaller and farther';
    }

    return {
        finalDistanceM,
        distanceChangeM,
        backgroundScale,
        compressionDescription,
    };
}

/**
 * Calculate camera distance needed to achieve a target subject size in frame
 *
 * Used for framing presets (Face, Portrait, Medium, Full, etc.)
 *
 * @param subjectHeightM - Real-world subject height in meters
 * @param targetFramePercent - Target percentage of frame height (0-1)
 * @param focalLengthMm - Lens focal length
 * @param sensorType - Sensor type for FOV calculation
 * @returns Required distance in meters
 */
export function calculateDistanceForFraming(
    subjectHeightM: number,
    targetFramePercent: number,
    focalLengthMm: number,
    sensorType: string
): number {
    const [, sensorHeight] = SENSOR_DIMENSIONS[sensorType] || SENSOR_DIMENSIONS['full-frame'];

    // Target image height on sensor
    const targetSensorHeight = sensorHeight * targetFramePercent;

    // Using similar triangles: distance = (subjectHeight × focalLength) / targetSensorHeight
    const distanceM = (subjectHeightM * focalLengthMm) / targetSensorHeight / 1000;

    return distanceM;
}

/**
 * Calculate subject size in frame given distance and focal length
 *
 * @returns Percentage of frame height (0-1)
 */
export function calculateSubjectFrameSize(
    subjectHeightM: number,
    distanceM: number,
    focalLengthMm: number,
    sensorType: string
): number {
    const [, sensorHeight] = SENSOR_DIMENSIONS[sensorType] || SENSOR_DIMENSIONS['full-frame'];

    // Image height on sensor
    const imageSensorHeight = (subjectHeightM * focalLengthMm) / (distanceM * 1000);

    // Percentage of frame
    return Math.min(1, imageSensorHeight / sensorHeight);
}

// ============================================================================
// LAYER COMPOSITING TRANSFORMS
// ============================================================================

export interface LayerTransformParams {
    /** Layer's distance from camera in meters */
    layerDistanceM: number;
    /** Focus distance in meters */
    focusDistanceM: number;
    /** Focal length in mm */
    focalLengthMm: number;
    /** Aperture f-number */
    aperture: number;
    /** Sensor type */
    sensorType: string;
    /** Canvas width in pixels */
    canvasWidthPx: number;
}

export interface LayerTransform {
    /** Blur radius in pixels */
    blurPx: number;
    /** Scale factor relative to focus plane (1 = same size) */
    scale: number;
    /** Is this layer in front of focus (true) or behind (false) */
    isForeground: boolean;
    /** Distance from focus plane in meters */
    distanceFromFocusM: number;
}

/**
 * Calculate transform parameters for a compositing layer
 */
export function calculateLayerTransform(params: LayerTransformParams): LayerTransform {
    const {
        layerDistanceM,
        focusDistanceM,
        focalLengthMm,
        aperture,
        sensorType,
        canvasWidthPx,
    } = params;

    const blurPx = calculateBlurRadius({
        focalLengthMm,
        aperture,
        focusDistanceM,
        elementDistanceM: layerDistanceM,
        sensorType,
        imageWidthPx: canvasWidthPx,
    });

    // Scale based on distance (closer = larger)
    // Using basic perspective: scale ∝ 1/distance
    const scale = focusDistanceM / layerDistanceM;

    const isForeground = layerDistanceM < focusDistanceM;
    const distanceFromFocusM = Math.abs(layerDistanceM - focusDistanceM);

    return {
        blurPx,
        scale,
        isForeground,
        distanceFromFocusM,
    };
}

// ============================================================================
// PRESETS & CONSTANTS
// ============================================================================

/**
 * Standard framing presets with typical distances
 * Based on cinematography conventions for 50mm on full-frame
 */
export const STANDARD_FRAMING_DISTANCES = {
    'extreme-close-up': 0.3, // Eyes/mouth fill frame
    'close-up': 0.5,         // Face fills frame
    'medium-close-up': 0.8,  // Head and shoulders
    'medium': 1.2,           // Waist up
    'medium-wide': 2.0,      // Knees up (American shot)
    'wide': 3.0,             // Full body with headroom
    'very-wide': 5.0,        // Full body + environment
    'extreme-wide': 10.0,    // Establishing shot
};

/**
 * Common aperture stops
 */
export const APERTURE_STOPS = [
    1.0, 1.2, 1.4, 1.8, 2.0, 2.4, 2.8, 3.5, 4.0, 4.5, 5.6, 6.3, 8, 9, 11, 13, 16, 22, 32
];

/**
 * Common focal lengths in mm
 */
export const FOCAL_LENGTHS = [
    14, 16, 18, 20, 24, 28, 35, 40, 50, 55, 70, 85, 100, 135, 200, 300, 400, 600
];
