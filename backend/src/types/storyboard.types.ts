// =============================================================================
// STORYBOARD SYSTEM TYPES
// =============================================================================

// Re-export Prisma types
// Manually defined Enums (matching Prisma schema strings)
export enum ElementType {
    CHARACTER = 'CHARACTER',
    PROP = 'PROP',
    ENVIRONMENT = 'ENVIRONMENT',
    STYLE_REFERENCE = 'STYLE_REFERENCE'
}

export enum ViewType {
    FRONT = 'FRONT',
    SIDE = 'SIDE',
    BACK = 'BACK',
    THREE_QUARTER = 'THREE_QUARTER',
    TOP = 'TOP',
    BOTTOM = 'BOTTOM',
    CUSTOM = 'CUSTOM'
}

export enum ProjectStatus {
    DRAFT = 'DRAFT',
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
    ARCHIVED = 'ARCHIVED'
}

export enum ShotStatus {
    PENDING = 'PENDING',
    QUEUED = 'QUEUED',
    GENERATING = 'GENERATING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED'
}

export enum EngineType {
    KLING_O1 = 'KLING_O1',
    KLING_1_5 = 'KLING_1_5',
    KLING_2_5 = 'KLING_2_5',
    VEO_3 = 'VEO_3',
    VEO_2 = 'VEO_2',
    SORA_2 = 'SORA_2',
    SORA_2_PRO = 'SORA_2_PRO',
    WAN_2_5 = 'WAN_2_5',
    WAN_2_2 = 'WAN_2_2',
    LUMA_DREAM = 'LUMA_DREAM',
    LTX_VIDEO = 'LTX_VIDEO',
    HUNYUAN = 'HUNYUAN',
    MINIMAX = 'MINIMAX'
}

export enum JobStatus {
    PENDING = 'PENDING',
    IN_QUEUE = 'IN_QUEUE',
    PROCESSING = 'PROCESSING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED',
    CANCELLED = 'CANCELLED'
}

// =============================================================================
// ELEMENT LIBRARY TYPES
// =============================================================================

export interface ElementView {
    id: string;
    elementId: string;
    viewType: ViewType;
    imageUrl: string;
    storageKey: string;
    order: number;
    createdAt: Date;
}

export interface Element {
    id: string;
    userId: string;
    name: string;
    description?: string;
    type: ElementType;
    tags?: string[];
    metadata?: Record<string, any>;
    views: ElementView[];
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateElementRequest {
    name: string;
    description?: string;
    type: ElementType;
    tags?: string[];
    metadata?: Record<string, any>;
    projectId?: string;
}

export interface UpdateElementRequest {
    name?: string;
    description?: string;
    tags?: string[];
    metadata?: Record<string, any>;
    sessionId?: string | null;
}

export interface ElementListFilters {
    type?: ElementType;
    search?: string;
    projectId?: string;
}

// =============================================================================
// STORYBOARD PROJECT TYPES
// =============================================================================

export interface StoryboardProject {
    id: string;
    userId: string;
    name: string;
    description?: string;
    status: ProjectStatus;
    totalShots: number;
    totalDuration: number;
    metadata?: Record<string, any>;
    shots?: Shot[];
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateProjectRequest {
    name: string;
    description?: string;
    metadata?: Record<string, any>;
}

export interface UpdateProjectRequest {
    name?: string;
    description?: string;
    status?: ProjectStatus;
    metadata?: Record<string, any>;
}

export interface ProjectListFilters {
    status?: ProjectStatus;
}

// =============================================================================
// SHOT TYPES
// =============================================================================

export interface ShotElement {
    id: string;
    shotId: string;
    elementId: string;
    order: number;
    metadata?: Record<string, any>;
    element: Element;
    createdAt: Date;
}

export interface Shot {
    id: string;
    projectId: string;
    index: number;
    name: string;
    description?: string;
    prompt: string;
    negativePrompt?: string;
    duration: number;
    aspectRatio: string;
    engine: EngineType;
    status: ShotStatus;
    cfgScale?: number;
    steps?: number;
    seed?: number;
    motionScale?: number;
    startFrameUrl?: string;
    endFrameUrl?: string;
    startFrameKey?: string;
    endFrameKey?: string;
    outputVideoUrl?: string;
    outputVideoKey?: string;
    thumbnailUrl?: string;
    generationJobId?: string;
    errorMessage?: string;
    retryCount: number;
    cost?: number;
    metadata?: Record<string, any>;
    elements?: ShotElement[];
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
}

export interface CreateShotRequest {
    projectId: string;
    name: string;
    description?: string;
    prompt: string;
    negativePrompt?: string;
    duration?: number;
    aspectRatio?: string;
    engine?: EngineType;
    cfgScale?: number;
    steps?: number;
    seed?: number;
    motionScale?: number;
    elementIds?: string[];
    metadata?: Record<string, any>;
}

export interface UpdateShotRequest {
    name?: string;
    description?: string;
    prompt?: string;
    negativePrompt?: string;
    duration?: number;
    aspectRatio?: string;
    engine?: EngineType;
    cfgScale?: number;
    steps?: number;
    seed?: number;
    motionScale?: number;
    status?: ShotStatus;
    metadata?: Record<string, any>;
}

export interface ReorderShotsRequest {
    shotIds: string[];
}

// =============================================================================
// VIDEO GENERATION TYPES
// =============================================================================

export interface GenerateVideoRequest {
    shotId: string;
    engine?: EngineType;
    cfgScale?: number;
    steps?: number;
    seed?: number;
    motionScale?: number;
}

export interface RegenerateVideoRequest {
    changeSeed?: boolean;
    newSeed?: number;
}

export interface GenerationJob {
    id: string;
    shotId: string;
    engine: EngineType;
    status: JobStatus;
    externalJobId?: string;
    webhookUrl?: string;
    progress?: number;
    errorMessage?: string;
    outputUrl?: string;
    cost?: number;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
    completedAt?: Date;
}

export interface GenerationStatusResponse {
    shotId: string;
    status: ShotStatus;
    progress?: number;
    outputVideoUrl?: string;
    thumbnailUrl?: string;
    cost?: number;
    errorMessage?: string;
}

export interface WebhookPayload {
    jobId: string;
    shotId: string;
    status: 'completed' | 'failed';
    outputUrl?: string;
    errorMessage?: string;
    cost?: number;
}

// =============================================================================
// ELEMENT REFERENCE FOR GENERATION
// =============================================================================

export interface ElementReferenceView {
    viewType: ViewType;
    imageUrl: string;
}

export interface ElementReference {
    elementId: string;
    name: string;
    type: ElementType;
    views: ElementReferenceView[];
}

// =============================================================================
// ENGINE-SPECIFIC TYPES
// =============================================================================

export interface KlingGenerationConfig {
    prompt: string;
    negativePrompt?: string;
    duration: number;
    aspectRatio: string;
    cfgScale?: number;
    seed?: number;
    mode?: 'std' | 'pro';
    elementReferences?: ElementReference[];
    startFrame?: string; // Base64 or URL
    endFrame?: string;   // Base64 or URL
}

export interface VeoGenerationConfig {
    prompt: string;
    duration: number;
    aspectRatio: string;
    seed?: number;
    elementReferences?: ElementReference[];
}

export interface SoraGenerationConfig {
    prompt: string;
    duration: number;
    aspectRatio: string;
    seed?: number;
}

export interface WanGenerationConfig {
    prompt: string;
    negativePrompt?: string;
    duration: number;
    aspectRatio: string;
    cfgScale?: number;
    steps?: number;
    seed?: number;
    startFrame?: string;
}

export interface LumaGenerationConfig {
    prompt: string;
    duration: number;
    aspectRatio?: string;
    loop?: boolean;
    startFrame?: string;
}

export interface LTXGenerationConfig {
    prompt: string;
    negativePrompt?: string;
    duration: number;
    width: number;
    height: number;
    cfgScale?: number;
    steps?: number;
    seed?: number;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

export enum ErrorCode {
    // Validation errors
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    INVALID_INPUT = 'INVALID_INPUT',
    MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

    // Resource errors
    NOT_FOUND = 'NOT_FOUND',
    ALREADY_EXISTS = 'ALREADY_EXISTS',
    RESOURCE_LIMIT_EXCEEDED = 'RESOURCE_LIMIT_EXCEEDED',

    // Permission errors
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',

    // Storage errors
    UPLOAD_FAILED = 'UPLOAD_FAILED',
    DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
    STORAGE_ERROR = 'STORAGE_ERROR',

    // Generation errors
    GENERATION_FAILED = 'GENERATION_FAILED',
    ENGINE_ERROR = 'ENGINE_ERROR',
    INVALID_ENGINE = 'INVALID_ENGINE',

    // System errors
    DATABASE_ERROR = 'DATABASE_ERROR',
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

export class StoryboardError extends Error {
    constructor(
        public code: ErrorCode,
        message: string,
        public statusCode: number = 500,
        public details?: any
    ) {
        super(message);
        this.name = 'StoryboardError';
    }
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: ErrorCode;
        message: string;
        details?: any;
    };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination?: {
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    };
}

// =============================================================================
// REQUEST CONTEXT
// =============================================================================

export interface AuthUser {
    id: string;
    email: string;
    name?: string;
}

export interface RequestContext {
    user: AuthUser;
}

// =============================================================================
// USAGE TRACKING
// =============================================================================

export interface UsageRecord {
    id: string;
    userId: string;
    engine: EngineType;
    action: string;
    cost: number;
    duration?: number;
    success: boolean;
    metadata?: Record<string, any>;
    createdAt: Date;
}

export interface UsageSummary {
    totalCost: number;
    totalGenerations: number;
    byEngine: Record<EngineType, {
        count: number;
        cost: number;
    }>;
    period: {
        start: Date;
        end: Date;
    };
}
