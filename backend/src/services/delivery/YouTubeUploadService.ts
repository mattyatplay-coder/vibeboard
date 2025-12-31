/**
 * YouTubeUploadService - YouTube Data API v3 Integration
 *
 * Handles:
 * - OAuth2 authentication and token management
 * - Video upload to YouTube via videos.insert
 * - Metadata generation for viral titles, descriptions, tags
 * - Thumbnail upload
 */

import { google, youtube_v3 } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../../prisma';
import { LLMService } from '../LLMService';

// =============================================================================
// TYPES
// =============================================================================

export interface YouTubeCredentials {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
}

export interface YouTubeTokens {
    access_token: string;
    refresh_token: string;
    expiry_date: number;
}

export interface VideoMetadata {
    title: string;
    description: string;
    tags: string[];
    categoryId: string;  // YouTube category ID (e.g., "22" for People & Blogs)
    privacyStatus: 'private' | 'unlisted' | 'public';
    madeForKids: boolean;
}

export interface GeneratedMetadata {
    titles: string[];        // 5 viral title options
    description: string;     // SEO-optimized description with chapters
    tags: string[];          // Relevant tags
    recommendedTitle: string; // AI's top pick
}

export interface UploadProgress {
    stage: 'preparing' | 'uploading' | 'processing' | 'complete' | 'failed';
    progress: number;  // 0-100
    message: string;
    videoId?: string;
    error?: string;
}

export interface UploadResult {
    success: boolean;
    videoId?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    error?: string;
}

// YouTube Category IDs
export const YOUTUBE_CATEGORIES = {
    'Film & Animation': '1',
    'Autos & Vehicles': '2',
    'Music': '10',
    'Pets & Animals': '15',
    'Sports': '17',
    'Travel & Events': '19',
    'Gaming': '20',
    'People & Blogs': '22',
    'Comedy': '23',
    'Entertainment': '24',
    'News & Politics': '25',
    'Howto & Style': '26',
    'Education': '27',
    'Science & Technology': '28',
    'Nonprofits & Activism': '29',
} as const;

// =============================================================================
// SERVICE CLASS
// =============================================================================

export class YouTubeUploadService {
    private static instance: YouTubeUploadService;
    private oauth2Client: InstanceType<typeof google.auth.OAuth2> | null = null;
    private youtube: youtube_v3.Youtube | null = null;
    private llmService: LLMService;

    private constructor() {
        this.llmService = new LLMService('grok');
    }

    static getInstance(): YouTubeUploadService {
        if (!YouTubeUploadService.instance) {
            YouTubeUploadService.instance = new YouTubeUploadService();
        }
        return YouTubeUploadService.instance;
    }

    // =========================================================================
    // OAUTH2 AUTHENTICATION
    // =========================================================================

    /**
     * Initialize OAuth2 client with credentials
     */
    initializeOAuth(credentials: YouTubeCredentials): void {
        this.oauth2Client = new google.auth.OAuth2(
            credentials.clientId,
            credentials.clientSecret,
            credentials.redirectUri
        );
    }

    /**
     * Get OAuth2 authorization URL for user consent
     */
    getAuthUrl(): string {
        if (!this.oauth2Client) {
            throw new Error('OAuth2 client not initialized. Call initializeOAuth first.');
        }

        const scopes = [
            'https://www.googleapis.com/auth/youtube.upload',
            'https://www.googleapis.com/auth/youtube',
            'https://www.googleapis.com/auth/youtube.readonly',
        ];

        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent', // Force consent screen to get refresh token
        });
    }

    /**
     * Exchange authorization code for tokens
     */
    async getTokensFromCode(code: string): Promise<YouTubeTokens> {
        if (!this.oauth2Client) {
            throw new Error('OAuth2 client not initialized');
        }

        const { tokens } = await this.oauth2Client.getToken(code);

        if (!tokens.access_token || !tokens.refresh_token) {
            throw new Error('Failed to obtain tokens from authorization code');
        }

        return {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: tokens.expiry_date || Date.now() + 3600 * 1000,
        };
    }

    /**
     * Set tokens and initialize YouTube API client
     */
    setTokens(tokens: YouTubeTokens): void {
        if (!this.oauth2Client) {
            throw new Error('OAuth2 client not initialized');
        }

        this.oauth2Client.setCredentials({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: tokens.expiry_date,
        });

        this.youtube = google.youtube({
            version: 'v3',
            auth: this.oauth2Client,
        });
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return this.youtube !== null && this.oauth2Client !== null;
    }

    /**
     * Get authenticated user's channel info
     */
    async getChannelInfo(): Promise<{ id: string; title: string; thumbnailUrl: string } | null> {
        if (!this.youtube) {
            throw new Error('YouTube client not initialized');
        }

        try {
            const response = await this.youtube.channels.list({
                part: ['snippet', 'contentDetails'],
                mine: true,
            });

            const channel = response.data.items?.[0];
            if (!channel) return null;

            return {
                id: channel.id || '',
                title: channel.snippet?.title || '',
                thumbnailUrl: channel.snippet?.thumbnails?.default?.url || '',
            };
        } catch (error) {
            console.error('[YouTube] Failed to get channel info:', error);
            return null;
        }
    }

    // =========================================================================
    // METADATA GENERATION
    // =========================================================================

    /**
     * Generate viral metadata using LLM
     */
    async generateMetadata(
        concept: string,
        archetype: string,
        hook: string,
        scriptSummary?: string
    ): Promise<GeneratedMetadata> {
        const prompt = `You are a YouTube SEO expert and viral content strategist.

Generate optimized metadata for a YouTube video with the following details:

CONCEPT: ${concept}
CHANNEL ARCHETYPE: ${archetype}
THE HOOK: ${hook}
${scriptSummary ? `SCRIPT SUMMARY: ${scriptSummary}` : ''}

Generate the following in JSON format:

{
    "titles": [
        // 5 viral title options, each under 70 characters
        // Use proven patterns: numbers, curiosity gaps, emotional hooks
        // Examples: "I Tried X for 30 Days...", "The $1000 Mistake That...", "Why Nobody Talks About..."
    ],
    "description": "SEO-optimized description with:\n- Strong first 2 sentences (shown in search)\n- Timestamps/chapters if applicable\n- Call to action\n- Relevant keywords naturally integrated\n- About 150-300 words",
    "tags": [
        // 10-15 relevant tags for discovery
        // Mix of broad and specific
    ],
    "recommendedTitle": "The single best title from the 5 options with explanation of why"
}

Return ONLY valid JSON, no markdown or explanation.`;

        try {
            const result = await this.llmService.generate({
                prompt,
                temperature: 0.7,
            });

            // Parse the JSON response
            const jsonMatch = result.content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in LLM response');
            }

            const metadata = JSON.parse(jsonMatch[0]) as GeneratedMetadata;

            // Validate and sanitize
            return {
                titles: metadata.titles?.slice(0, 5) || [],
                description: metadata.description || '',
                tags: metadata.tags?.slice(0, 15) || [],
                recommendedTitle: metadata.recommendedTitle || metadata.titles?.[0] || concept,
            };
        } catch (error) {
            console.error('[YouTube] Metadata generation failed:', error);

            // Return fallback metadata
            return {
                titles: [concept, `${hook} - ${concept}`, `Watch: ${concept}`],
                description: `${hook}\n\n${concept}\n\nGenerated with VibeBoard AI Video Studio.`,
                tags: ['video', 'content', archetype.toLowerCase()],
                recommendedTitle: concept,
            };
        }
    }

    // =========================================================================
    // VIDEO UPLOAD
    // =========================================================================

    /**
     * Upload video to YouTube
     */
    async uploadVideo(
        videoPath: string,
        metadata: VideoMetadata,
        thumbnailPath?: string,
        onProgress?: (progress: UploadProgress) => void
    ): Promise<UploadResult> {
        if (!this.youtube) {
            throw new Error('YouTube client not initialized. Please authenticate first.');
        }

        // Validate video file exists
        if (!fs.existsSync(videoPath)) {
            return { success: false, error: `Video file not found: ${videoPath}` };
        }

        const fileSize = fs.statSync(videoPath).size;

        try {
            // Stage 1: Preparing
            onProgress?.({
                stage: 'preparing',
                progress: 0,
                message: 'Preparing video for upload...',
            });

            // Create readable stream for upload
            const videoStream = fs.createReadStream(videoPath);

            // Stage 2: Uploading
            onProgress?.({
                stage: 'uploading',
                progress: 10,
                message: 'Uploading video to YouTube...',
            });

            // Perform the upload
            const response = await this.youtube.videos.insert({
                part: ['snippet', 'status'],
                requestBody: {
                    snippet: {
                        title: metadata.title.substring(0, 100), // YouTube limit
                        description: metadata.description.substring(0, 5000),
                        tags: metadata.tags.slice(0, 500), // YouTube limit
                        categoryId: metadata.categoryId,
                    },
                    status: {
                        privacyStatus: metadata.privacyStatus,
                        selfDeclaredMadeForKids: metadata.madeForKids,
                    },
                },
                media: {
                    body: videoStream,
                },
            });

            const videoId = response.data.id;

            if (!videoId) {
                throw new Error('Upload succeeded but no video ID returned');
            }

            // Stage 3: Processing
            onProgress?.({
                stage: 'processing',
                progress: 80,
                message: 'Video uploaded, YouTube is processing...',
                videoId,
            });

            // Upload thumbnail if provided
            if (thumbnailPath && fs.existsSync(thumbnailPath)) {
                try {
                    await this.uploadThumbnail(videoId, thumbnailPath);
                } catch (thumbError) {
                    console.error('[YouTube] Thumbnail upload failed:', thumbError);
                    // Don't fail the whole upload for thumbnail
                }
            }

            // Stage 4: Complete
            onProgress?.({
                stage: 'complete',
                progress: 100,
                message: 'Upload complete!',
                videoId,
            });

            return {
                success: true,
                videoId,
                videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
                thumbnailUrl: response.data.snippet?.thumbnails?.high?.url ?? undefined,
            };

        } catch (error: any) {
            console.error('[YouTube] Upload failed:', error);

            onProgress?.({
                stage: 'failed',
                progress: 0,
                message: 'Upload failed',
                error: error.message || 'Unknown error',
            });

            return {
                success: false,
                error: error.message || 'Upload failed',
            };
        }
    }

    /**
     * Upload custom thumbnail for a video
     */
    async uploadThumbnail(videoId: string, thumbnailPath: string): Promise<boolean> {
        if (!this.youtube) {
            throw new Error('YouTube client not initialized');
        }

        if (!fs.existsSync(thumbnailPath)) {
            throw new Error(`Thumbnail file not found: ${thumbnailPath}`);
        }

        try {
            const thumbnailStream = fs.createReadStream(thumbnailPath);

            await this.youtube.thumbnails.set({
                videoId,
                media: {
                    body: thumbnailStream,
                },
            });

            return true;
        } catch (error) {
            console.error('[YouTube] Thumbnail upload failed:', error);
            throw error;
        }
    }

    // =========================================================================
    // VIDEO MANAGEMENT
    // =========================================================================

    /**
     * Get list of uploaded videos
     */
    async getUploadedVideos(maxResults: number = 10): Promise<youtube_v3.Schema$Video[]> {
        if (!this.youtube) {
            throw new Error('YouTube client not initialized');
        }

        try {
            // First get the uploads playlist ID
            const channelResponse = await this.youtube.channels.list({
                part: ['contentDetails'],
                mine: true,
            });

            const uploadsPlaylistId = channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

            if (!uploadsPlaylistId) {
                return [];
            }

            // Get videos from uploads playlist
            const playlistResponse = await this.youtube.playlistItems.list({
                part: ['snippet', 'contentDetails'],
                playlistId: uploadsPlaylistId,
                maxResults,
            });

            // Get video details
            const videoIds = playlistResponse.data.items
                ?.map(item => item.contentDetails?.videoId)
                .filter(Boolean) as string[];

            if (!videoIds.length) return [];

            const videoResponse = await this.youtube.videos.list({
                part: ['snippet', 'status', 'statistics'],
                id: videoIds,
            });

            return videoResponse.data.items || [];
        } catch (error) {
            console.error('[YouTube] Failed to get uploaded videos:', error);
            return [];
        }
    }

    /**
     * Update video metadata
     */
    async updateVideoMetadata(
        videoId: string,
        updates: Partial<VideoMetadata>
    ): Promise<boolean> {
        if (!this.youtube) {
            throw new Error('YouTube client not initialized');
        }

        try {
            const updateBody: any = {};

            if (updates.title || updates.description || updates.tags || updates.categoryId) {
                updateBody.snippet = {};
                if (updates.title) updateBody.snippet.title = updates.title;
                if (updates.description) updateBody.snippet.description = updates.description;
                if (updates.tags) updateBody.snippet.tags = updates.tags;
                if (updates.categoryId) updateBody.snippet.categoryId = updates.categoryId;
            }

            if (updates.privacyStatus) {
                updateBody.status = { privacyStatus: updates.privacyStatus };
            }

            await this.youtube.videos.update({
                part: Object.keys(updateBody),
                requestBody: {
                    id: videoId,
                    ...updateBody,
                },
            });

            return true;
        } catch (error) {
            console.error('[YouTube] Failed to update video:', error);
            return false;
        }
    }

    /**
     * Delete a video
     */
    async deleteVideo(videoId: string): Promise<boolean> {
        if (!this.youtube) {
            throw new Error('YouTube client not initialized');
        }

        try {
            await this.youtube.videos.delete({ id: videoId });
            return true;
        } catch (error) {
            console.error('[YouTube] Failed to delete video:', error);
            return false;
        }
    }
}

export default YouTubeUploadService;
