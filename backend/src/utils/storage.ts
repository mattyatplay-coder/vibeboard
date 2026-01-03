import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import { StoryboardError, ErrorCode } from '../types/storyboard.types';

// =============================================================================
// S3/R2 CLIENT CONFIGURATION
// =============================================================================

const getS3Client = (): S3Client => {
  const provider = process.env.STORAGE_PROVIDER || 's3';

  if (provider === 'r2') {
    // CloudFlare R2 configuration
    const accountId = process.env.R2_ACCOUNT_ID;
    if (!accountId) {
      throw new Error('R2_ACCOUNT_ID is required when using CloudFlare R2');
    }

    return new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }

  // Default AWS S3 configuration
  return new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
};

const getBucketName = (): string => {
  const provider = process.env.STORAGE_PROVIDER || 's3';

  if (provider === 'r2') {
    return process.env.R2_BUCKET_NAME || process.env.S3_BUCKET_NAME!;
  }

  return process.env.S3_BUCKET_NAME!;
};

const getCDNUrl = (): string | undefined => {
  const provider = process.env.STORAGE_PROVIDER || 's3';

  if (provider === 'r2') {
    return process.env.R2_CDN_URL;
  }

  return process.env.S3_CDN_URL;
};

// =============================================================================
// FILE VALIDATION
// =============================================================================

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/tiff',
  'image/bmp',
];
const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
];
const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
  'audio/mp3',
  'audio/ogg',
  'audio/aac',
  'audio/flac',
];
const ALLOWED_3D_TYPES = ['model/gltf-binary', 'model/gltf+json', 'application/octet-stream']; // .glb, .gltf
const ALLOWED_AI_TYPES = ['application/x-hdf', 'application/octet-stream']; // .safetensors, .ckpt, .pt
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'text/plain', 'application/json'];
const ALLOWED_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_AUDIO_TYPES,
  ...ALLOWED_3D_TYPES,
  ...ALLOWED_AI_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
];
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB (was 10MB)
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB (was 100MB)
const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_3D_SIZE = 200 * 1024 * 1024; // 200MB for .glb files
const MAX_AI_MODEL_SIZE = 2 * 1024 * 1024 * 1024; // 2GB for .safetensors/.ckpt

export const isVideoFile = (mimetype: string): boolean => {
  return ALLOWED_VIDEO_TYPES.includes(mimetype);
};

export const isImageFile = (mimetype: string): boolean => {
  return ALLOWED_IMAGE_TYPES.includes(mimetype);
};

export const isAudioFile = (mimetype: string): boolean => {
  return ALLOWED_AUDIO_TYPES.includes(mimetype);
};

export const is3DFile = (mimetype: string): boolean => {
  return ALLOWED_3D_TYPES.includes(mimetype);
};

export const isAIModelFile = (mimetype: string): boolean => {
  return ALLOWED_AI_TYPES.includes(mimetype);
};

export const getMaxSizeForType = (mimetype: string): number => {
  if (isVideoFile(mimetype)) return MAX_VIDEO_SIZE;
  if (isAudioFile(mimetype)) return MAX_AUDIO_SIZE;
  if (is3DFile(mimetype)) return MAX_3D_SIZE;
  if (isAIModelFile(mimetype)) return MAX_AI_MODEL_SIZE;
  if (isImageFile(mimetype)) return MAX_IMAGE_SIZE;
  return MAX_IMAGE_SIZE; // default fallback
};

export const validateMediaFile = (file: Express.Multer.File): void => {
  if (!ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    throw new StoryboardError(
      ErrorCode.INVALID_INPUT,
      `Invalid file type. Allowed types: ${ALLOWED_FILE_TYPES.join(', ')}`,
      400
    );
  }

  const maxSize = getMaxSizeForType(file.mimetype);
  if (file.size > maxSize) {
    throw new StoryboardError(
      ErrorCode.INVALID_INPUT,
      `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`,
      400
    );
  }
};

// Backwards compatibility alias
export const validateImageFile = validateMediaFile;

// =============================================================================
// IMAGE PROCESSING
// =============================================================================

export const processImage = async (
  buffer: Buffer,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
  } = {}
): Promise<Buffer> => {
  const { maxWidth = 1024, maxHeight = 1024, quality = 90, format = 'jpeg' } = options;

  try {
    let image = sharp(buffer);

    // Get metadata to check orientation
    const metadata = await image.metadata();

    // Resize if needed
    if (
      (metadata.width && metadata.width > maxWidth) ||
      (metadata.height && metadata.height > maxHeight)
    ) {
      image = image.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Convert to desired format
    if (format === 'jpeg') {
      image = image.jpeg({ quality });
    } else if (format === 'png') {
      image = image.png({ quality });
    } else if (format === 'webp') {
      image = image.webp({ quality });
    }

    return await image.toBuffer();
  } catch (error) {
    throw new StoryboardError(ErrorCode.STORAGE_ERROR, 'Failed to process image', 500, error);
  }
};

// =============================================================================
// UPLOAD FUNCTIONS
// =============================================================================

export const uploadFile = async (
  file: Express.Multer.File,
  folder: string = 'uploads'
): Promise<{ url: string; key: string }> => {
  try {
    validateMediaFile(file);

    const s3Client = getS3Client();
    const bucketName = getBucketName();
    const cdnUrl = getCDNUrl();

    // Generate unique filename
    const ext = file.originalname.split('.').pop();
    const filename = `${uuidv4()}.${ext}`;
    const key = `${folder}/${filename}`;

    // Process image (skip for videos)
    const isVideo = isVideoFile(file.mimetype);
    const fileBuffer = isVideo ? file.buffer : await processImage(file.buffer);

    const provider = process.env.STORAGE_PROVIDER || 's3';

    if (provider === 'local') {
      const fs = require('fs');
      const path = require('path');

      const uploadDir = path.join(process.cwd(), 'uploads', folder);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, fileBuffer);

      const baseUrl = process.env.API_URL || 'http://localhost:3001';
      const url = `${baseUrl}/uploads/${folder}/${filename}`;

      return { url, key: `${folder}/${filename}` };
    }

    // Upload to S3/R2
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: fileBuffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      })
    );

    // Generate URL
    let url: string;
    if (cdnUrl) {
      url = `${cdnUrl}/${key}`;
    } else {
      if (provider === 'r2') {
        const accountId = process.env.R2_ACCOUNT_ID;
        url = `https://${accountId}.r2.cloudflarestorage.com/${bucketName}/${key}`;
      } else {
        const region = process.env.AWS_REGION || 'us-east-1';
        url = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
      }
    }

    return { url, key };
  } catch (error) {
    if (error instanceof StoryboardError) {
      throw error;
    }
    throw new StoryboardError(ErrorCode.UPLOAD_FAILED, 'Failed to upload file', 500, error);
  }
};

export const uploadFiles = async (
  files: Express.Multer.File[],
  folder: string = 'uploads'
): Promise<Array<{ url: string; key: string }>> => {
  return Promise.all(files.map(file => uploadFile(file, folder)));
};

// =============================================================================
// DELETE FUNCTIONS
// =============================================================================

export const deleteFile = async (key: string): Promise<void> => {
  try {
    const provider = process.env.STORAGE_PROVIDER || 's3';

    if (provider === 'local') {
      const fs = require('fs');
      const path = require('path');
      const filePath = path.join(process.cwd(), 'uploads', key);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return;
    }

    const s3Client = getS3Client();
    const bucketName = getBucketName();

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key,
      })
    );
  } catch (error) {
    // Don't throw error if file doesn't exist
    console.error('Failed to delete file:', error);
  }
};

export const deleteFiles = async (keys: string[]): Promise<void> => {
  await Promise.all(keys.map(key => deleteFile(key)));
};

// =============================================================================
// SIGNED URL GENERATION
// =============================================================================

export const getPresignedUrl = async (key: string, expiresIn: number = 3600): Promise<string> => {
  try {
    const provider = process.env.STORAGE_PROVIDER || 's3';

    if (provider === 'local') {
      const baseUrl = process.env.API_URL || 'http://localhost:3001';
      return `${baseUrl}/uploads/${key}`;
    }

    const s3Client = getS3Client();
    const bucketName = getBucketName();

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    throw new StoryboardError(ErrorCode.STORAGE_ERROR, 'Failed to generate signed URL', 500, error);
  }
};
