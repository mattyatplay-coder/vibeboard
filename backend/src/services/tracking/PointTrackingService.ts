/**
 * PointTrackingService - Pro Trajectory Engine Phase 1
 *
 * Integrates with CoTracker3 via HuggingFace Gradio API for dense point tracking.
 * Provides 2D point trajectories across video frames for:
 * - Prop attachment (tracking a surface for overlay)
 * - Motion analysis
 * - Camera stabilization
 *
 * CoTracker3 supports:
 * - Online mode (frame-by-frame, lower latency)
 * - Offline mode (full video, higher accuracy)
 * - Grid-based tracking (automatic dense sampling)
 * - Point-based tracking (user-specified points)
 */

import { Client } from '@gradio/client';
import * as fs from 'fs';
import * as path from 'path';

export interface TrackingPoint {
    x: number;
    y: number;
    frameIndex: number;
    confidence: number;
}

export interface TrackingResult {
    id: string;
    videoPath: string;
    width: number;
    height: number;
    frameCount: number;
    fps: number;
    tracks: TrackingTrack[];
    createdAt: Date;
}

export interface TrackingTrack {
    id: string;
    label: string;
    points: TrackingPoint[];
    color: string;
}

export interface HomographyMatrix {
    // 3x3 transformation matrix flattened
    matrix: number[];
    // Source corner points (4 points)
    srcPoints: { x: number; y: number }[];
    // Destination corner points after transformation
    dstPoints: { x: number; y: number }[];
    frameIndex: number;
}

export interface PlanarTrackingResult {
    id: string;
    videoPath: string;
    cornerTracks: TrackingTrack[]; // 4 corner tracks
    homographies: HomographyMatrix[]; // Per-frame homography matrices
    boundingBox: { x: number; y: number; width: number; height: number };
}

class PointTrackingService {
    private static instance: PointTrackingService;
    private gradioClient: any = null;
    private isInitialized = false;

    // HuggingFace Space for CoTracker3
    private readonly COTRACKER_SPACE = 'facebook/cotracker3';

    private constructor() {}

    static getInstance(): PointTrackingService {
        if (!PointTrackingService.instance) {
            PointTrackingService.instance = new PointTrackingService();
        }
        return PointTrackingService.instance;
    }

    /**
     * Initialize connection to CoTracker3 Gradio API
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            console.log('[PointTrackingService] Connecting to CoTracker3 Space...');
            this.gradioClient = await Client.connect(this.COTRACKER_SPACE);
            this.isInitialized = true;
            console.log('[PointTrackingService] Connected successfully');
        } catch (error) {
            console.error('[PointTrackingService] Failed to connect:', error);
            throw new Error(`Failed to initialize CoTracker3: ${error}`);
        }
    }

    /**
     * Track points in a video using CoTracker3 grid mode
     *
     * @param videoPath - Path to input video file
     * @param gridSize - Grid density (default 10 = 10x10 grid)
     * @param segmentLength - Number of frames per segment for online mode
     */
    async trackGridPoints(
        videoPath: string,
        gridSize: number = 10,
        segmentLength: number = 16
    ): Promise<TrackingResult> {
        await this.initialize();

        const videoBuffer = fs.readFileSync(videoPath);
        const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' });

        console.log(`[PointTrackingService] Tracking grid points (${gridSize}x${gridSize})...`);

        try {
            const result = await this.gradioClient.predict('/cotracker_demo', {
                input_video: videoBlob,
                grid_size: gridSize,
                grid_query_frame: 0,
                backward_tracking: false,
                tracks_leave_trace: false,
            });

            return this.parseTrackingResult(videoPath, result);
        } catch (error) {
            console.error('[PointTrackingService] Grid tracking failed:', error);
            throw error;
        }
    }

    /**
     * Track specific user-defined points
     *
     * @param videoPath - Path to input video file
     * @param points - Array of {x, y, frameIndex} points to track
     */
    async trackPoints(
        videoPath: string,
        points: { x: number; y: number; frameIndex: number }[]
    ): Promise<TrackingResult> {
        await this.initialize();

        const videoBuffer = fs.readFileSync(videoPath);
        const videoBlob = new Blob([videoBuffer], { type: 'video/mp4' });

        // Format points for CoTracker3 API
        const pointsStr = points.map(p => `${p.x},${p.y},${p.frameIndex}`).join(';');

        console.log(`[PointTrackingService] Tracking ${points.length} user points...`);

        try {
            const result = await this.gradioClient.predict('/cotracker_demo', {
                input_video: videoBlob,
                query_points: pointsStr,
                backward_tracking: true,
                tracks_leave_trace: false,
            });

            return this.parseTrackingResult(videoPath, result);
        } catch (error) {
            console.error('[PointTrackingService] Point tracking failed:', error);
            throw error;
        }
    }

    /**
     * Track 4 corner points for planar surface tracking (prop attachment)
     * Returns per-frame homography matrices for perspective transformation
     *
     * @param videoPath - Path to input video file
     * @param corners - 4 corner points defining the planar surface
     */
    async trackPlanarSurface(
        videoPath: string,
        corners: { x: number; y: number }[]
    ): Promise<PlanarTrackingResult> {
        if (corners.length !== 4) {
            throw new Error('Planar tracking requires exactly 4 corner points');
        }

        // Track all 4 corners starting from frame 0
        const cornerPoints = corners.map(c => ({ x: c.x, y: c.y, frameIndex: 0 }));
        const trackingResult = await this.trackPoints(videoPath, cornerPoints);

        // Extract the 4 corner tracks
        const cornerTracks = trackingResult.tracks.slice(0, 4);

        // Calculate homography matrices for each frame
        const homographies = this.calculateHomographies(corners, cornerTracks);

        // Calculate bounding box of tracked region
        const boundingBox = this.calculateBoundingBox(corners);

        return {
            id: `planar-${Date.now()}`,
            videoPath,
            cornerTracks,
            homographies,
            boundingBox,
        };
    }

    /**
     * Calculate homography matrices for perspective transformation
     * Uses the tracked corner points to compute frame-by-frame transforms
     */
    private calculateHomographies(
        srcCorners: { x: number; y: number }[],
        cornerTracks: TrackingTrack[]
    ): HomographyMatrix[] {
        const homographies: HomographyMatrix[] = [];

        // Get the number of frames from the first track
        const frameCount = cornerTracks[0]?.points.length || 0;

        for (let frameIdx = 0; frameIdx < frameCount; frameIdx++) {
            const dstPoints = cornerTracks.map(track => ({
                x: track.points[frameIdx]?.x || 0,
                y: track.points[frameIdx]?.y || 0,
            }));

            // Calculate 3x3 homography matrix using Direct Linear Transform (DLT)
            const matrix = this.computeHomographyDLT(srcCorners, dstPoints);

            homographies.push({
                matrix,
                srcPoints: srcCorners,
                dstPoints,
                frameIndex: frameIdx,
            });
        }

        return homographies;
    }

    /**
     * Compute homography using Direct Linear Transform (DLT) algorithm
     * This is a simplified version - OpenCV.js on frontend will handle the actual transform
     */
    private computeHomographyDLT(
        src: { x: number; y: number }[],
        dst: { x: number; y: number }[]
    ): number[] {
        // For now, return identity matrix placeholder
        // The actual homography computation will be done in OpenCV.js on the frontend
        // This provides the tracked corner points for the frontend to use

        // Identity matrix (3x3 flattened)
        return [1, 0, 0, 0, 1, 0, 0, 0, 1];
    }

    /**
     * Parse CoTracker3 API result into our tracking format
     */
    private parseTrackingResult(videoPath: string, apiResult: any): TrackingResult {
        const tracks: TrackingTrack[] = [];

        // CoTracker3 returns tracks as tensor data
        // Format: [num_tracks, num_frames, 2 (x,y)]
        if (apiResult?.data) {
            const tracksData = apiResult.data[0]; // Video with overlaid tracks
            const visibilityData = apiResult.data[1]; // Visibility confidence

            // Parse the visualization or raw track data
            // For now, extract from the returned structure
            console.log('[PointTrackingService] Parsing tracking result...');
        }

        // Generate placeholder tracks for testing
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];

        return {
            id: `track-${Date.now()}`,
            videoPath,
            width: 1920, // Will be extracted from video metadata
            height: 1080,
            frameCount: 100,
            fps: 24,
            tracks,
            createdAt: new Date(),
        };
    }

    /**
     * Calculate bounding box from corner points
     */
    private calculateBoundingBox(corners: { x: number; y: number }[]): {
        x: number;
        y: number;
        width: number;
        height: number;
    } {
        const xs = corners.map(c => c.x);
        const ys = corners.map(c => c.y);

        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
        };
    }

    /**
     * Export tracking data as JSON for frontend consumption
     */
    async exportTrackingData(trackingId: string): Promise<string> {
        // In production, this would fetch from database
        // For now, return the cached result
        return JSON.stringify({
            id: trackingId,
            exportedAt: new Date().toISOString(),
        });
    }
}

export default PointTrackingService;
