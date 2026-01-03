import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(process.cwd(), 'uploads');

// Ensure upload directory exists - SAFELY
try {
  if (!fs.existsSync(uploadDir)) {
    // Only try to create if it doesn't look like a broken symlink
    // lstatSync throws if file doesn't exist, returns stats if it does (even broken symlink)
    try {
      const stats = fs.lstatSync(uploadDir);
      if (stats.isSymbolicLink()) {
        console.warn('[Upload] Uploads is a broken symlink. Skipping mkdir.');
      } else {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
    } catch (e) {
      // File truly doesn't exist
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }
} catch (err) {
  console.warn('[Upload] Failed to create upload directory:', err);
}

// Pro file types - expanded MIME support
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

const ALL_ALLOWED_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_AUDIO_TYPES,
  ...ALLOWED_3D_TYPES,
  ...ALLOWED_AI_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
];

// Size limits by type
const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_3D_SIZE = 200 * 1024 * 1024; // 200MB
const MAX_AI_MODEL_SIZE = 2 * 1024 * 1024 * 1024; // 2GB
const MAX_DEFAULT_SIZE = 100 * 1024 * 1024; // 100MB fallback

const getMaxSizeForMimetype = (mimetype: string): number => {
  if (ALLOWED_VIDEO_TYPES.includes(mimetype)) return MAX_VIDEO_SIZE;
  if (ALLOWED_AUDIO_TYPES.includes(mimetype)) return MAX_AUDIO_SIZE;
  if (ALLOWED_3D_TYPES.includes(mimetype)) return MAX_3D_SIZE;
  if (ALLOWED_AI_TYPES.includes(mimetype)) return MAX_AI_MODEL_SIZE;
  if (ALLOWED_IMAGE_TYPES.includes(mimetype)) return MAX_IMAGE_SIZE;
  return MAX_DEFAULT_SIZE;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Check by extension for files that browsers may not report correct MIME
  const ext = path.extname(file.originalname).toLowerCase();
  const extensionAllowed = [
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.gif',
    '.tiff',
    '.bmp',
    '.mp4',
    '.webm',
    '.mov',
    '.avi',
    '.mkv',
    '.mp3',
    '.wav',
    '.ogg',
    '.aac',
    '.flac',
    '.glb',
    '.gltf',
    '.safetensors',
    '.ckpt',
    '.pt',
    '.pth',
    '.pdf',
    '.txt',
    '.json',
  ].includes(ext);

  if (ALL_ALLOWED_TYPES.includes(file.mimetype) || extensionAllowed) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype} (${ext})`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_AI_MODEL_SIZE, // Use max possible, validate per-type in controller
  },
});

// Export for use in other modules
export { getMaxSizeForMimetype, ALL_ALLOWED_TYPES };
