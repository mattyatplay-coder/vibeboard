import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { ReplicateAdapter } from './generators/ReplicateAdapter';
import { FalAIAdapter } from './generators/FalAIAdapter';
import { v4 as uuidv4 } from 'uuid';

interface ProcessingResult {
  originalPath: string;
  processedPath: string;
  captionPath: string;
  caption: string;
  status: 'success' | 'failed';
  error?: string;
}

export class DatasetService {
  private replicateAdapter: ReplicateAdapter;
  private falAdapter: FalAIAdapter;
  private datasetsDir: string;

  constructor() {
    this.replicateAdapter = new ReplicateAdapter();
    this.falAdapter = new FalAIAdapter();
    this.datasetsDir = path.join(process.cwd(), 'datasets');

    if (!fs.existsSync(this.datasetsDir)) {
      fs.mkdirSync(this.datasetsDir, { recursive: true });
    }
  }

  /**
   * Calculates the average embedding for a set of reference images.
   */
  async calculateReferenceEmbedding(filePaths: string[]): Promise<number[] | null> {
    if (!filePaths || filePaths.length === 0) return null;

    console.log(
      `[DatasetService] Calculating reference embedding from ${filePaths.length} images...`
    );
    const embeddings: number[][] = [];

    for (const file of filePaths) {
      try {
        const faces = await this.replicateAdapter.getFaceEmbeddings(file);
        // Assume the reference image contains ONLY or MOSTLY the target person.
        // We take the largest face or just the first valid one.
        // InsightFace usually returns sorted by size or det_score.
        if (faces.length > 0) {
          embeddings.push(faces[0].embedding);
        }
      } catch (error) {
        console.error(`Failed to get embedding for reference ${file}:`, error);
      }
    }

    if (embeddings.length === 0) return null;

    // Average the embeddings
    const dim = embeddings[0].length;
    const avg = new Array(dim).fill(0);
    for (const emb of embeddings) {
      for (let i = 0; i < dim; i++) {
        avg[i] += emb[i];
      }
    }
    for (let i = 0; i < dim; i++) {
      avg[i] /= embeddings.length;
    }

    console.log(`[DatasetService] Reference embedding calculated (dim: ${dim})`);
    return avg;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    return dot / (Math.sqrt(magA) * Math.sqrt(magB));
  }

  /**
   * Extracts frames from a video file using ffmpeg.
   * Extract 1 frame every 2 seconds by default to avoid duplicates.
   */
  async extractFramesFromVideo(videoPath: string, outputDir: string): Promise<string[]> {
    const ffmpeg = require('fluent-ffmpeg');
    const framePaths: string[] = [];
    const baseName = path.basename(videoPath, path.extname(videoPath));

    console.log(`[DatasetService] Extracting frames from ${baseName}...`);

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .on('end', () => {
          console.log(`[DatasetService] Frame extraction complete for ${baseName}`);
          // Read the output dir to find generated frames
          const files = fs.readdirSync(outputDir);
          const frames = files
            .filter(f => f.startsWith(`${baseName}_frame_`) && f.endsWith('.png'))
            .map(f => path.join(outputDir, f));
          resolve(frames);
        })
        .on('error', (err: any) => {
          console.error('Error extracting frames:', err);
          reject(err);
        })
        .outputOptions('-vf', 'fps=0.5') // 1 frame every 2 seconds
        .output(path.join(outputDir, `${baseName}_frame_%d.png`))
        .run();
    });
  }

  /**
   * Curates the dataset by selecting the best images matching the reference identity.
   */
  async curateDataset(
    candidatePaths: string[],
    referenceEmbedding: number[] | null,
    limit: number = 75
  ): Promise<string[]> {
    if (!referenceEmbedding) {
      console.log(
        `[DatasetService] No reference embedding provided. Returning all ${candidatePaths.length} candidates (capped at ${limit}).`
      );
      return candidatePaths.slice(0, limit);
    }

    console.log(
      `[DatasetService] Curating ${candidatePaths.length} candidates against reference...`
    );
    const scores: { path: string; score: number; quality: number }[] = [];

    // Process in batches to avoid rate limits
    const BATCH_SIZE = 5;
    for (let i = 0; i < candidatePaths.length; i += BATCH_SIZE) {
      const batch = candidatePaths.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async filePath => {
          try {
            const debugName = path.basename(filePath);
            const faces = await this.replicateAdapter.getFaceEmbeddings(filePath);

            if (faces.length === 0) {
              // processing failed or no face found
              return;
            }

            // Find best match in this image
            let maxSim = -1;
            let bestFace = null;

            for (const face of faces) {
              const sim = this.cosineSimilarity(face.embedding, referenceEmbedding);
              if (sim > maxSim) {
                maxSim = sim;
                bestFace = face;
              }
            }

            if (bestFace && maxSim > 0.2) {
              // Minimum threshold to be considered same person at all
              // Score = Similarity * (Size/Confidence?)
              // InsightFace doesn't always give confidence, but we can use bbox size as a proxy for "good view"
              // Larger face = better training data usually.
              let sizeScore = 1.0;
              if (bestFace.bbox) {
                const [, , w, h] = bestFace.bbox;
                sizeScore = Math.min((w * h) / (512 * 512), 1.0); // Normalize roughly
              }

              // Weighted score: 70% Identity Match, 30% Image Quality/Size
              const finalScore = maxSim * 0.7 + sizeScore * 0.3;

              scores.push({ path: filePath, score: finalScore, quality: sizeScore });
              console.log(
                `[DatasetService] Candidate ${debugName}: Match=${maxSim.toFixed(2)}, Score=${finalScore.toFixed(2)}`
              );
            }
          } catch (e) {
            console.error(`Failed to score candidate ${filePath}`, e);
          }
        })
      );
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    // Pick top N
    const selected = scores.slice(0, limit).map(s => s.path);
    console.log(
      `[DatasetService] Selected top ${selected.length} from ${candidatePaths.length} candidates.`
    );

    return selected;
  }

  /**
   * Process a single image for the dataset
   */
  async processImage(
    filePath: string,
    datasetName: string,
    referenceEmbedding: number[] | null = null
  ): Promise<ProcessingResult> {
    const datasetPath = path.join(this.datasetsDir, datasetName);
    if (!fs.existsSync(datasetPath)) {
      fs.mkdirSync(datasetPath, { recursive: true });
    }

    const fileName = path.basename(filePath, path.extname(filePath));
    const outputImageName = `${fileName}.png`;
    const outputCaptionName = `${fileName}.txt`;
    const outputImagePath = path.join(datasetPath, outputImageName);
    const outputCaptionPath = path.join(datasetPath, outputCaptionName);

    try {
      console.log(`[DatasetService] Processing ${fileName}...`);

      // 1. Identity Check & Cropping (if reference provided)
      let processingBuffer: any = fs.readFileSync(filePath);

      if (referenceEmbedding) {
        console.log(`[DatasetService] verifying identity for ${fileName}...`);
        const faces = await this.replicateAdapter.getFaceEmbeddings(filePath);

        let bestMatch: { embedding: number[]; bbox?: number[] } | null = null;
        let maxSim = -1;

        for (const face of faces) {
          const sim = this.cosineSimilarity(face.embedding, referenceEmbedding);
          if (sim > maxSim) {
            maxSim = sim;
            bestMatch = face;
          }
        }

        // Threshold for InsightFace
        const MATCH_THRESHOLD = 0.35;

        if (!bestMatch || maxSim < MATCH_THRESHOLD) {
          throw new Error(`Identity mismatch during processing (Sim: ${maxSim.toFixed(3)})`);
        }

        console.log(`[DatasetService] Identity confirmed (Sim: ${maxSim.toFixed(3)}). Cropping...`);

        // Crop to BBox if available
        if (bestMatch.bbox) {
          const [x, y, w, h] = bestMatch.bbox;
          const meta = await sharp(processingBuffer as any).metadata();
          if (meta.width && meta.height) {
            // Add padding
            const padding = 0.5; // More padding for training context (hair/neck)
            const cx = x + w / 2;
            const cy = y + h / 2;
            const size = Math.max(w, h) * (1 + padding);

            let left = Math.max(0, Math.round(cx - size / 2));
            let top = Math.max(0, Math.round(cy - size / 2));
            let width = Math.min(meta.width - left, Math.round(size));
            let height = Math.min(meta.height - top, Math.round(size));

            processingBuffer = await sharp(processingBuffer as any)
              .extract({ left, top, width, height })
              .toBuffer();
          }
        }
      }

      // Write temp crop
      const tempCropPath = path.join(path.dirname(filePath), `temp_crop_${fileName}.png`);
      fs.writeFileSync(tempCropPath, processingBuffer);

      // 2. Background Removal (Segmentation)
      const segmentationResultUrl = await this.falAdapter.removeBackground(tempCropPath);

      // Clean up temp crop
      if (fs.existsSync(tempCropPath)) fs.unlinkSync(tempCropPath);

      // Download result
      const processedImageRes = await fetch(segmentationResultUrl);
      const processedBuffer = Buffer.from((await processedImageRes.arrayBuffer()) as any);

      // Save processed image (PNG)
      await sharp(processedBuffer as any).toFile(outputImagePath);

      // 3. Captioning (on the processed image result)
      const caption = await this.falAdapter.generateCaption(segmentationResultUrl);

      // Save caption
      fs.writeFileSync(outputCaptionPath, caption);

      return {
        originalPath: filePath,
        processedPath: outputImagePath,
        captionPath: outputCaptionPath,
        caption: caption,
        status: 'success',
      };
    } catch (error: any) {
      console.error(`[DatasetService] Error processing ${fileName}:`, error);
      return {
        originalPath: filePath,
        processedPath: '',
        captionPath: '',
        caption: '',
        status: 'failed',
        error: error.message,
      };
    }
  }
}
