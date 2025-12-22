import * as fal from '@fal-ai/serverless-client';

// Configure Fal
fal.config({
  credentials: process.env.FAL_KEY || '',
});

export interface AudioGenerationOptions {
  prompt: string;
  duration?: number; // in seconds
}

export interface AudioGenerationResult {
  id: string;
  url?: string;
  status: 'success' | 'failed';
  error?: string;
}

export class AudioGenerator {
  async generateAudio(options: AudioGenerationOptions): Promise<AudioGenerationResult> {
    try {
      console.log(`Generating audio with prompt: ${options.prompt}`);

      const result: any = await fal.subscribe('fal-ai/stable-audio', {
        input: {
          prompt: options.prompt,
          seconds_total: options.duration || 10,
        },
        logs: true,
        onQueueUpdate: update => {
          if (update.status === 'IN_PROGRESS') {
            update.logs.map(log => log.message).forEach(console.log);
          }
        },
      });

      if (result.audio_file && result.audio_file.url) {
        return {
          id: Date.now().toString(), // Fal doesn't return ID in sync call usually, or we can use request_id if available
          url: result.audio_file.url,
          status: 'success',
        };
      }

      return {
        id: Date.now().toString(),
        status: 'failed',
        error: 'No audio URL returned',
      };
    } catch (error: any) {
      console.error('Audio generation failed:', error);
      return {
        id: Date.now().toString(),
        status: 'failed',
        error: error.message || 'Unknown error',
      };
    }
  }
}

export const audioGenerator = new AudioGenerator();
